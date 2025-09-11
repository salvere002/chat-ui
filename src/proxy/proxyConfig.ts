
// Configurable cookie security
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'; // Set this env var to 'true' to enable Secure flag

/**
 * Creates the dynamic proxy configuration for the Vite server
 */
export function createProxyConfig(): Record<string, any> {
  return {
    '^/api/proxy/': {
      configure: (proxy: any, options: any) => {
        proxy.on('proxyReq', (proxyReq: any, req: any, res: any) => {
          const requestUrl = req.url || '';
          
          // Match the pattern: /api/proxy/ENCODED_URL/path
          // Extract the encoded base URL and the remaining path
          const regex = /^\/api\/proxy\/([^/]+)(\/.*)?$/;
          const parts = requestUrl.match(regex);

          if (parts && parts[1]) {
            const encodedTarget = parts[1];
            // Do not force a trailing slash if no remaining path is present
            // so that a base like https://host/mcp becomes exactly /mcp, not /mcp/
            const remainingPath = parts[2] || '';
            
            try {
              const targetUrl = decodeURIComponent(encodedTarget);
              const target = new URL(targetUrl);
              
              // Set Host header for the target server
              proxyReq.setHeader('Host', target.host);
              
              // Set the target for this request
              if (options.target) {
                if (typeof options.target === 'string') {
                  options.target = target.origin;
                } else {
                  (options.target as any).host = target.host;
                  (options.target as any).hostname = target.hostname;
                  (options.target as any).protocol = target.protocol;
                  if (target.port) {
                    (options.target as any).port = target.port;
                  }
                }
              }
              
              // The path needs to include both the target path and the remaining path
              const targetPath = target.pathname === '/' ? '' : target.pathname;
              let combinedPath = `${targetPath}${remainingPath}`;
              if (!combinedPath) combinedPath = '/';
              // Ensure path starts with '/'
              if (!combinedPath.startsWith('/')) combinedPath = `/${combinedPath}`;
              proxyReq.path = combinedPath;
              
              // Proxying request
            } catch (error) {
              console.error(`Invalid target URL derived: ${encodedTarget}`, error);
              if (!res.headersSent) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid proxy target specified');
              }
              proxyReq.abort();
            }
          } else {
            console.error(`Could not parse proxy request: ${req.url}`);
            if (!res.headersSent) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Invalid proxy request format');
            }
             proxyReq.abort();
          }
        });

        proxy.on('proxyRes', (proxyRes: any, req: any) => {
          if (proxyRes.headers['set-cookie']) {
            // Get the host from the request headers to use for the cookie domain
            const host = req.headers.host || 'localhost';
            // Extract actual domain without port for cookie
            const domain = host.split(':')[0];
            
            // Check if the request is using HTTPS
            const isHttps = req.headers['x-forwarded-proto'] === 'https';
            
            const cookies = proxyRes.headers['set-cookie'].map((cookie: string) => {
              // Use a more specific regex to target domain attribute
              // First capture group to preserve any other options like Path, Expires, etc.
              return cookie
                .replace(/(;\s*[Dd]omain=)[^;]+/, `$1${domain}`)
                .replace(/;\s*[Pp]ath=[^;]+/, '; path=/')
                // Only add Secure flag if configured to do so and connection is HTTPS
                .replace(/;\s*[Ss]ecure/i, COOKIE_SECURE && isHttps ? '; Secure' : '')
                .replace(/;\s*[Ss]ame[Ss]ite=[^;]+/i, '; SameSite=Lax');
            });
            
            // Cookie transformation applied
              
            proxyRes.headers['set-cookie'] = cookies;
          }
        });

        proxy.on('error', (err: Error, _req: any, res: any) => {
          console.error('Proxy error:', err);
          if (!res.headersSent) {
              // Ensure 'res' is the HttpServerResponse and has writeHead
              if (typeof (res as any).writeHead === 'function') {
                  (res as any).writeHead(500, { 'Content-Type': 'text/plain' });
              } else {
                  // Fallback or log if res doesn't have writeHead (e.g. WebSocket upgrade requests)
                  console.error('Response object does not have writeHead method. Cannot send error to client.');
              }
          }
          if (typeof (res as any).end === 'function') {
              (res as any).end('Proxy error: ' + err.message);
          }
        });
      },
      // Default target that will be dynamically replaced
      target: 'http://localhost:5001',
      changeOrigin: true,
      secure: false, 
    },
  };
} 
