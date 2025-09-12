import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dynamicProxyPlugin } from './src/proxy/dynamicProxyPlugin';
import config from './config.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dynamicProxyPlugin()],
  server: {
    port: config.frontend.dev.port, // Use configured dev server port
    // We provide our own dynamic proxy middleware for /api/proxy/*
  },
  build: {
    outDir: 'dist',
  },
}); 
