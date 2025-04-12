import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Optional: Set a specific port for the dev server
  },
  build: {
    outDir: 'dist', // Match our previous tsconfig setting
  },
}); 