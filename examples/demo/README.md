Chat UI Demo (Standalone)

Minimal React app that imports the Chat UI library and allows switching between fullscreen and resizable modes. Drag the bottom-right corner of the panel to test adaptive rendering.

Prerequisites
- Build the library from the repo root first:

  npm run build:lib

Run locally

1) Install dependencies in the demo app:

   cd examples/demo
   npm install

2) Start the dev server:

   npm run dev

3) Open the URL printed by Vite (typically http://localhost:5173).

Notes
- The demo uses the library’s mock adapter, so no backend is required.
- No CSS imports are needed; the component injects styles at runtime.
- If you plan to render heavy LaTeX, ensure KaTeX fonts are available in your environment or import katex/dist/katex.min.css in the demo.
