import http from 'node:http';
import https from 'node:https';

const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

function joinPaths(a, b) {
  if (!a && !b) return '/';
  if (!a) return b.startsWith('/') ? b : `/${b}`;
  if (!b) return a || '/';
  const aHasEnd = a.endsWith('/');
  const bHasStart = b.startsWith('/');
  if (aHasEnd && bHasStart) return a + b.slice(1);
  if (!aHasEnd && !bHasStart) return `${a}/${b}`;
  return a + b;
}

function rewriteSetCookie(cookies, reqHost, isHttps) {
  if (!cookies || !cookies.length) return cookies;
  const domain = (reqHost || 'localhost').split(':')[0];
  return cookies.map((cookie) =>
    cookie
      .replace(/(;\s*[Dd]omain=)[^;]+/, `$1${domain}`)
      .replace(/;\s*[Pp]ath=[^;]+/, '; path=/')
      .replace(/;\s*[Ss]ecure/i, COOKIE_SECURE && isHttps ? '; Secure' : '')
      .replace(/;\s*[Ss]ame[Ss]ite=[^;]+/i, '; SameSite=Lax')
  );
}

function getAllowedHosts() {
  const raw = process.env.PROXY_ALLOWED_HOSTS;
  if (!raw) return null;
  const hosts = raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length ? hosts : null;
}

function isAbsoluteRedirectLocation(location) {
  if (!location) return false;
  // Absolute URL with a scheme, e.g. "https://example.com/..."
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(location)) return true;
  // Scheme-relative absolute URL, e.g. "//example.com/..."
  if (location.startsWith('//')) return true;
  return false;
}

export function handleProxyRequest(req, res, logger = console) {
  const url = req.url || '';

  try {
    const m = url.match(/^\/api\/proxy\/([^/]+)(\/[^?]*)?(\?.*)?$/);
    if (!m) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Invalid proxy request format');
      return;
    }

    const encodedBase = m[1];
    const remainingPath = m[2] || '';
    const query = m[3] || '';

    let base;
    try {
      const decoded = decodeURIComponent(encodedBase);
      base = new URL(decoded);
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Invalid proxy target specified');
      return;
    }

    if (base.protocol !== 'http:' && base.protocol !== 'https:') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Unsupported target protocol');
      return;
    }

    const allowedHosts = getAllowedHosts();
    if (allowedHosts && !allowedHosts.includes(base.hostname.toLowerCase())) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Proxy target not allowed');
      return;
    }

    const targetPath = base.pathname === '/' ? '' : base.pathname;
    const pathToSend = joinPaths(targetPath, remainingPath || '');
    const fullPath = `${pathToSend || '/'}${query}`;

    const isHttps = base.protocol === 'https:';
    const client = isHttps ? https : http;

    const headers = { ...req.headers };
    headers.host = base.host;

    const requestOptions = {
      protocol: base.protocol,
      hostname: base.hostname,
      port: base.port || (isHttps ? 443 : 80),
      method: req.method,
      path: fullPath,
      headers,
    };

    const insecureHttps = process.env.PROXY_INSECURE_HTTPS === 'true';
    if (isHttps && insecureHttps) {
      requestOptions.rejectUnauthorized = false;
    }

    const proxyReq = client.request(requestOptions, (proxyRes) => {
      try {
        const respHeaders = { ...proxyRes.headers };

        const cookies = Array.isArray(proxyRes.headers['set-cookie'])
          ? proxyRes.headers['set-cookie']
          : proxyRes.headers['set-cookie']
          ? [String(proxyRes.headers['set-cookie'])]
          : undefined;

        const rewritten = rewriteSetCookie(cookies, req.headers.host, isHttps);
        if (rewritten) {
          respHeaders['set-cookie'] = rewritten;
        }

        // Preserve auth/custom headers across redirects:
        // if the upstream responds with a 3xx Location pointing at a different origin,
        // browsers/fetch will follow but strip sensitive headers (e.g., Authorization).
        // Rewrite Location to keep the redirect on our own origin via /api/proxy/...
        const statusCode = proxyRes.statusCode || 0;
        const locationHeader = proxyRes.headers.location;
        const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
        if (location && statusCode >= 300 && statusCode < 400) {
          try {
            // Be conservative for non-307/308 to avoid interfering with browser-oriented redirects.
            // Still rewrite relative redirects because the browser would otherwise resolve them
            // against our origin (not the upstream origin), which is incorrect.
            const shouldRewriteLocation =
              statusCode === 307 || statusCode === 308 || !isAbsoluteRedirectLocation(location);
            if (!shouldRewriteLocation) {
              res.writeHead(proxyRes.statusCode || 500, respHeaders);
              proxyRes.pipe(res);
              return;
            }

            // Avoid double-proxying if upstream somehow returns a proxied Location.
            if (!location.startsWith('/api/proxy/')) {
              const currentUrl = new URL(fullPath, base);
              const redirectUrl = new URL(location, currentUrl);

              if (redirectUrl.protocol === 'http:' || redirectUrl.protocol === 'https:') {
                if (!allowedHosts || allowedHosts.includes(redirectUrl.hostname.toLowerCase())) {
                  const proxiedLocation =
                    `/api/proxy/${encodeURIComponent(redirectUrl.origin)}` +
                    `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash || ''}`;
                  respHeaders.location = proxiedLocation;
                }
              }
            }
          } catch (e) {
            logger.warn?.(`Failed to rewrite redirect Location: ${e}`);
          }
        }

        res.writeHead(proxyRes.statusCode || 500, respHeaders);
        proxyRes.pipe(res);
      } catch (e) {
        logger.error(`Proxy response handling error: ${e}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('Proxy response error');
      }
    });

    proxyReq.on('error', (err) => {
      logger.error(`Proxy error: ${err}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Proxy error: ' + err.message);
    });

    req.pipe(proxyReq);
  } catch (err) {
    logger.error(`Proxy middleware exception: ${err}`);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal proxy error');
  }
}
