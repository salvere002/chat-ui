import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Library build configuration for exporting as a reusable component library
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/lib/index.ts'),
      name: 'ChatUI',
      formats: ['es', 'cjs'],
      fileName: (format) => `chat-ui.${format}.js`,
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        'axios',
        'react-markdown',
        'remark-gfm',
        'remark-math',
        'remark-breaks',
        'rehype-katex',
        'react-syntax-highlighter',
        'react-icons',
        'recharts',
        'katex',
        'dayjs',
        'lodash.throttle',
        'copy-to-clipboard',
        'react-dropzone',
        'react-textarea-autosize',
        '@floating-ui/react',
        '@heroicons/react',
        'clsx',
        'sonner',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          zustand: 'zustand',
        },
      },
    },
    // Generate sourcemaps for easier debugging
    sourcemap: true,
    // Output directory for library build
    outDir: 'dist-lib',
    // Clear output directory before build
    emptyOutDir: true,
  },
  // Ensure CSS is handled properly
  css: {
    postcss: './postcss.config.js',
  },
});