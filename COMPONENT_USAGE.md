# Chat UI Component — Quick Guide

Chat UI is a single, drop‑in React component that renders a complete chat experience. It self‑adapts to the size of its container, so you can use it full‑screen or embed it in a small panel without extra setup.

## Table of Contents
- [Install](#install)
- [Use It](#use-it)
- [Props](#props)
- [Styling](#styling)
- [Backend](#backend)
- [Troubleshooting](#troubleshooting)
- [Example App](#example-app)
- [Support](#support)

## Install

```bash
npm install chat-ui react react-dom
```

Notes:
- React and ReactDOM are peer dependencies.
- Styles auto‑inject at runtime; no CSS imports required.
- KaTeX is bundled — math rendering works out of the box.

## Use It

Full page:
```tsx
import ChatUI from 'chat-ui';

export default function App() {
  return <ChatUI serviceConfig={{ adapterType: 'rest', baseUrl: 'https://your-api.example.com/api' }} />;
}
```

Embedded panel (widget-style):
```tsx
import ChatUI from 'chat-ui';

export default function Widget() {
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, width: 420, height: 560, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <ChatUI variant="auto" serviceConfig={{ adapterType: 'mock' }} />
    </div>
  );
}
```

## Props

All props are optional.

- variant: 'auto' | 'embedded' | 'full' (default: 'auto')
- serviceConfig: { adapterType?: 'rest' | 'mock' | 'session'; baseUrl?: string }
- initialTheme: 'light' | 'dark'
- initialResponseMode: 'stream' | 'fetch'
- title: string (default: 'Chat UI')
- hideHeader: boolean
- defaultSidebarCollapsed: boolean (default: false)
- mcpSync: boolean (default: true)
- className: string
- style: React.CSSProperties

Behavior:
- Auto‑adapts to container size (overlay sidebar and compact layout when small)
- Settings modal is scoped inside the component’s container (not full‑screen)

## Styling

No CSS imports needed. You can override via CSS variables or your own selectors:
```css
:root {
  --bg-primary: #ffffff;
  --accent-primary: #3b82f6;
}

.my-chat-panel .message-bubble { border-radius: 10px; box-shadow: 0 6px 14px rgba(0,0,0,0.08); }
```

### Minimal Setup

For most apps, use the single drop‑in component `ChatUI` (see examples above). You don’t need to import internal components or stores.

### Composed App (Advanced)

Advanced: You can compose internal parts (Sidebar, ChatInterface, Settings, stores) if you need a highly customized shell. For most cases, prefer the single drop‑in `ChatUI`.

```typescript
// Example omitted for brevity — see Available Components and State Management sections below
// for the list of exports and how to use them when composing your own shell.
```

## Available Components

For most use cases, you only need the default `ChatUI` component. Advanced composition docs for internal components and stores have been omitted here to keep this guide focused. If you need them, check the repository docs or open an issue.

## Backend

Point Chat UI at your API with `serviceConfig`:
```tsx
<ChatUI serviceConfig={{ adapterType: 'rest', baseUrl: 'https://your-api.example.com/api' }} />
```

Or run with the mock adapter (no backend required):
```tsx
<ChatUI serviceConfig={{ adapterType: 'mock' }} />
```

## Troubleshooting

- Ensure the container has a size; the layout adapts to container dimensions.
- If styles look unset, check your app isn’t globally resetting everything (e.g., `all: unset`).
- Make sure React/ReactDOM are installed at compatible versions.

## Examples

See the `examples/demo` app in this repo for a minimal setup that toggles between full‑screen and a resizable panel.

## Support

For issues and questions:
- GitHub Issues: [your-repo-url]
- See the main README for more details
