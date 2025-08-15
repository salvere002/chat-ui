import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createProxyConfig } from './src/proxy/proxyConfig';
import config from './config.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: config.frontend.dev.port, // Use configured dev server port
    proxy: createProxyConfig(),
  },
  build: {
    outDir: 'dist',
  },
}); 