import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';

import { handleProxyRequest } from '../src/proxy/dynamicProxyHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const serve = sirv(distDir, {
  single: true,
  brotli: true,
  gzip: true,
  // Avoid caching `index.html` forever; it references hashed assets that change on each build.
  // Cache hashed build assets aggressively, but keep HTML revalidated so dynamic imports don't
  // break after a rebuild due to stale cached entrypoints.
  maxAge: 0,
  setHeaders(res, pathname) {
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public,max-age=31536000,immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
});

// Parse command line arguments for --host and --port
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { host: undefined, port: undefined };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) {
      result.host = args[i + 1];
      i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      result.port = Number(args[i + 1]);
      i++;
    } else if (args[i].startsWith('--host=')) {
      result.host = args[i].split('=')[1];
    } else if (args[i].startsWith('--port=')) {
      result.port = Number(args[i].split('=')[1]);
    }
  }
  
  return result;
}

const cliArgs = parseArgs();
const port = cliArgs.port || Number(process.env.PORT || 8080);
const host = cliArgs.host || process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  const url = req.url || '';
  if (url.startsWith('/api/proxy/')) {
    handleProxyRequest(req, res);
    return;
  }
  serve(req, res);
});

server.listen(port, host, () => {
  console.log(`Production server listening on http://${host}:${port}`);
});
