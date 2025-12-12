import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { dynamicProxyPlugin } from './src/proxy/dynamicProxyPlugin';
import config from './config.json';
import { brotliCompressSync, constants } from 'zlib';

// Emit Brotli-compressed .br assets alongside build output
const brotliCompressionPlugin = ({
  extensions = ['.js', '.css', '.html', '.svg', '.json', '.txt'],
  minSize = 1024, // 1KB
  quality = 11,
}: {
  extensions?: string[];
  minSize?: number;
  quality?: number;
} = {}): Plugin => ({
  name: 'brotli-compression',
  apply: 'build',
  generateBundle(_outputOptions, bundle) {
    for (const [fileName, assetOrChunk] of Object.entries(bundle)) {
      if (fileName.endsWith('.br') || fileName.endsWith('.map')) continue;
      if (!extensions.some(ext => fileName.endsWith(ext))) continue;

      let content: Buffer;
      if (assetOrChunk.type === 'asset') {
        const source = assetOrChunk.source;
        if (source == null) continue;
        content = Buffer.isBuffer(source)
          ? source
          : Buffer.from(typeof source === 'string' ? source : source);
      } else {
        content = Buffer.from(assetOrChunk.code);
      }

      if (content.byteLength < minSize) continue;

      const compressed = brotliCompressSync(content, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: quality,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        },
      });

      this.emitFile({
        type: 'asset',
        fileName: `${fileName}.br`,
        source: compressed,
      });
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), dynamicProxyPlugin(), brotliCompressionPlugin()],
  server: {
    port: config.frontend.dev.port, // Use configured dev server port
    // We provide our own dynamic proxy middleware for /api/proxy/*
  },
  build: {
    outDir: 'dist',
  },
  // Strip dev logging/debuggers in production builds only
  esbuild: command === 'build'
    ? { drop: ['console', 'debugger'] }
    : undefined,
})); 
