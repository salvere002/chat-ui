import type { Plugin } from 'vite';
import http from 'node:http';
import https from 'node:https';

// Configurable cookie security via env var
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

function joinPaths(a: string, b: string): string {
  if (!a && !b) return '/';
  if (!a) return b.startsWith('/') ? b : `/${b}`;
  if (!b) return a || '/';
  const aHasEnd = a.endsWith('/');
  const bHasStart = b.startsWith('/');
  if (aHasEnd && bHasStart) return a + b.slice(1);
  if (!aHasEnd && !bHasStart) return `${a}/${b}`;
  return a + b;
}

function rewriteSetCookie(cookies: string[] | undefined, reqHost: string | undefined, isHttps: boolean): string[] | undefined {
  if (!cookies || !cookies.length) return cookies;
  const domain = (reqHost || 'localhost').split(':')[0];
  return cookies.map((cookie) =>
    cookie
      // Force cookie domain to current app domain
      .replace(/(;\s*[Dd]omain=)[^;]+/, `$1${domain}`)
      // Normalize path
      .replace(/;\s*[Pp]ath=[^;]+/, '; path=/')
      // Secure only if enabled and connection is https
      .replace(/;\s*[Ss]ecure/i, COOKIE_SECURE && isHttps ? '; Secure' : '')
      // Relax SameSite to Lax for cross-origin compat
      .replace(/;\s*[Ss]ame[Ss]ite=[^;]+/i, '; SameSite=Lax')
  );
}

export function dynamicProxyPlugin(): Plugin {
  return {
    name: 'dynamic-proxy-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/proxy/')) return next();

        try {
          // /api/proxy/{ENCODED_BASE}[/{rest}]?[query]
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

          let base: URL;
          try {
            const decoded = decodeURIComponent(encodedBase);
            base = new URL(decoded);
          } catch (e) {
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

          const targetPath = base.pathname === '/' ? '' : base.pathname;
          const pathToSend = joinPaths(targetPath, remainingPath || '');
          const fullPath = `${pathToSend || '/'}${query}`;

          const isHttps = base.protocol === 'https:';
          const client = isHttps ? https : http;

          // Clone headers and override Host
          const headers: http.OutgoingHttpHeaders = { ...req.headers };
          headers.host = base.host;

          const requestOptions: any = {
            protocol: base.protocol,
            hostname: base.hostname,
            port: base.port || (isHttps ? 443 : 80),
            method: req.method,
            path: fullPath,
            headers,
          };

          // Optional: allow insecure HTTPS in dev if explicitly enabled
          // Mirroring http-proxy's `secure: false` behavior
          const insecureHttps = process.env.PROXY_INSECURE_HTTPS === 'true';
          if (isHttps && insecureHttps) {
            requestOptions.rejectUnauthorized = false; // https.request option
          }

          const proxyReq = client.request(requestOptions, (proxyRes) => {
            try {
              // Copy and adjust headers
              const respHeaders: http.OutgoingHttpHeaders = { ...proxyRes.headers };

              // Rewrite cookies for current origin
              const cookies = Array.isArray(proxyRes.headers['set-cookie'])
                ? (proxyRes.headers['set-cookie'] as string[])
                : proxyRes.headers['set-cookie']
                ? [String(proxyRes.headers['set-cookie'])]
                : undefined;

              const rewritten = rewriteSetCookie(cookies, req.headers.host, isHttps);
              if (rewritten) {
                respHeaders['set-cookie'] = rewritten;
              }

              res.writeHead(proxyRes.statusCode || 500, respHeaders as http.OutgoingHttpHeaders);
              proxyRes.pipe(res);
            } catch (e) {
              server.config.logger.error(`Proxy response handling error: ${e}`);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
              }
              res.end('Proxy response error');
            }
          });

          proxyReq.on('error', (err) => {
            server.config.logger.error(`Proxy error: ${err}`);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            res.end('Proxy error: ' + (err as Error).message);
          });

          // Pipe request body to target (supports streaming/SSE setups)
          req.pipe(proxyReq);
        } catch (err) {
          server.config.logger.error(`Proxy middleware exception: ${err}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Internal proxy error');
        }
      });
    },
  };
}
