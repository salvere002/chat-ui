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
  maxAge: 31536000,
  immutable: true,
});

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';

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
