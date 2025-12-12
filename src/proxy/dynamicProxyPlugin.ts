import type { Plugin } from 'vite';
import { handleProxyRequest } from './dynamicProxyHandler.js';

export function dynamicProxyPlugin(): Plugin {
  const applyMiddleware = (server: any) => {
    const logger = server?.config?.logger ?? console;
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = req.url || '';
      if (!url.startsWith('/api/proxy/')) return next();
      handleProxyRequest(req, res, logger);
    });
  };

  return {
    name: 'dynamic-proxy-middleware',
    configureServer(server) {
      applyMiddleware(server);
    },
    // Ensure the same middleware runs in `vite preview` after build
    configurePreviewServer(server) {
      applyMiddleware(server);
    },
  };
}
