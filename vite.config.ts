import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { dynamicProxyPlugin } from './src/proxy/dynamicProxyPlugin';
import config from './config.json';
import { brotliCompressSync, constants } from 'zlib';

// Emit Brotli-compressed .br assets alongside build output.
// Implemented as a Rollup output plugin (not a Vite plugin) so it runs in the
// same pipeline as stripVitePreloadOutputPlugin and sees the final chunk code.
const brotliCompressionOutputPlugin = ({
  extensions = ['.js', '.css', '.html', '.svg', '.json', '.txt'],
  minSize = 1024, // 1KB
  quality = 11,
}: {
  extensions?: string[];
  minSize?: number;
  quality?: number;
} = {}) => ({
  name: 'brotli-compression',
  generateBundle(_outputOptions: unknown, bundle: Record<string, { type: string; code?: string; source?: unknown; fileName?: string }>) {
    const emitted: Array<{ fileName: string; source: Buffer }> = [];
    for (const [fileName, assetOrChunk] of Object.entries(bundle)) {
      if (fileName.endsWith('.br') || fileName.endsWith('.map')) continue;
      if (!extensions.some(ext => fileName.endsWith(ext))) continue;

      let content: Buffer;
      if (assetOrChunk.type === 'asset') {
        const source = assetOrChunk.source;
        if (source == null) continue;
        content = Buffer.isBuffer(source)
          ? source
          : Buffer.from(typeof source === 'string' ? source : String(source));
      } else {
        if (!assetOrChunk.code) continue;
        content = Buffer.from(assetOrChunk.code);
      }

      if (content.byteLength < minSize) continue;

      const compressed = brotliCompressSync(content, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: quality,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        },
      });

      emitted.push({ fileName: `${fileName}.br`, source: compressed });
    }

    // Emit after iteration to avoid mutating during loop
    for (const { fileName, source } of emitted) {
      (this as any).emitFile({ type: 'asset', fileName, source });
    }
  },
});

// Rollup output plugin: strip Vite's __vitePreload wrapper from dynamic
// import() calls.  Vite wraps every dynamic import with a preload helper
// (__vitePreload) and a dependency map (__vite__mapDeps).  When manualChunks
// is used, the helper can land in a vendor chunk instead of the entry chunk,
// causing "__VITE_PRELOAD__ is not defined" at runtime.
//
// This plugin runs as a Rollup *output* plugin (inside rollupOptions.output)
// so it executes AFTER Vite's internal "build-import-analysis" renderChunk
// hook.  It rewrites preload-wrapped imports to plain import() calls and
// removes the __vite__mapDeps definition.
const stripVitePreloadOutputPlugin = () => ({
  name: 'strip-vite-preload',
  generateBundle(_opts: unknown, bundle: Record<string, { type: string; code?: string }>) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk' || !chunk.code) continue;
      if (!chunk.code.includes('__vite__mapDeps')) continue;

      let code = chunk.code;

      // Replace: preloadFn(() => import("./X.js"), __vite__mapDeps([...])) → import("./X.js")
      code = code.replace(
        /\w+\(\(\)\s*=>\s*(import\("[^"]+"\))\s*,\s*(?:__vite__mapDeps\(\[[^\]]*\]\)|\[\])\)/g,
        '$1',
      );

      // Remove the now-unused __vite__mapDeps definition line
      code = code.replace(
        /const __vite__mapDeps=[^;]+;\n?/,
        '',
      );

      if (code !== chunk.code) {
        chunk.code = code;
      }
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [basicSsl(), react(), dynamicProxyPlugin()],
    resolve: {
      // Ensure single React instance for live preview and other libraries
      dedupe: ['react', 'react-dom'],
    },
    server: {
      https: {}, // Enable HTTPS (basicSsl fills cert/key)
      port: config.frontend.dev.port, // Use configured dev server port
      // We provide our own dynamic proxy middleware for /api/proxy/*
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          // Order matters: strip preload wrappers first, then compress.
          plugins: [stripVitePreloadOutputPlugin(), brotliCompressionOutputPlugin()],
          manualChunks: {
            // Core React - rarely changes
            react: ['react', 'react-dom', 'react/jsx-runtime', 'react-is'],
            // State & data utilities
            vendor: ['zustand', 'axios', 'dayjs'],
            // Markdown rendering
            markdown: [
              'react-markdown',
              'remark-gfm',
              'remark-math',
              'remark-breaks',
              'rehype-katex',
              'katex',
            ],
            // Code highlighting (Prism-based)
            syntax: ['react-syntax-highlighter'],
            // Live code preview
            runner: ['react-live', 'sucrase'],
            // Screenshot capture
            screenshot: ['html-to-image'],
            // Charting libs used by preview/code runner
            charts: [
              'recharts',
              '@amcharts/amcharts5',
              '@amcharts/amcharts5/xy',
              '@amcharts/amcharts5/percent',
              '@amcharts/amcharts5/radar',
              '@amcharts/amcharts5/hierarchy',
              '@amcharts/amcharts5/map',
              '@amcharts/amcharts5/flow',
              '@amcharts/amcharts5/themes/Animated',
              '@amcharts/amcharts5/themes/Dark',
            ],
            // Icons
            icons: ['react-icons', '@heroicons/react'],
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        'recharts',
        '@amcharts/amcharts5',
        '@amcharts/amcharts5/xy',
        '@amcharts/amcharts5/percent',
        '@amcharts/amcharts5/radar',
        '@amcharts/amcharts5/hierarchy',
        '@amcharts/amcharts5/map',
        '@amcharts/amcharts5/flow',
        '@amcharts/amcharts5/themes/Animated',
        '@amcharts/amcharts5/themes/Dark',
      ],
      // Keep this out of dev pre-bundling due size.
      exclude: ['plotly.js-dist-min'],
    },
    // Strip dev logging/debuggers in production builds only
    esbuild: command === 'build'
      ? { drop: ['console', 'debugger'] }
      : undefined,
}));
