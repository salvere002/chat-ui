import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createProxyConfig } from './src/proxy/proxyConfig';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Optional: Set a specific port for the dev server
    proxy: createProxyConfig(),
  },
  build: {
    outDir: 'dist',
  },
}); 