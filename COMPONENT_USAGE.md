# Component Library Usage Guide

This guide explains how to use Chat UI as a reusable component library in your own projects.

## Table of Contents
- [Installation](#installation)
- [Setup](#setup)
- [Basic Usage](#basic-usage)
- [Available Components](#available-components)
- [State Management](#state-management)
- [Services and Utilities](#services-and-utilities)
- [TypeScript Support](#typescript-support)
- [Styling](#styling)
- [Advanced Usage](#advanced-usage)

## Installation

### Building the Library

First, build the library from the source:

```bash
npm run build:lib
```

This creates the library build in the `dist-lib` directory with:
- ESM format: `chat-ui.es.js`
- CommonJS format: `chat-ui.cjs.js`
- TypeScript declarations (exposed via package `types`): `lib/index.d.ts`
- Bundled CSS: `style.css`

### Installing in Your Project

#### Option 1: Local Installation (Development)

```bash
# In your project
npm install /path/to/chat-ui
```

#### Option 2: npm Link (Development)

```bash
# In chat-ui directory
npm link

# In your project
npm link chat-ui
```

#### Option 3: Private npm Registry (Production)

Publish to your private npm registry and install normally:

```bash
npm install chat-ui
```

## Setup

### 1. Install Peer Dependencies

Only React runtime needs to be provided by your app:

```bash
npm install react react-dom
```

### 2. Configure Tailwind CSS

The library uses Tailwind CSS. Add it to your project:

**Install Tailwind:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Configure `tailwind.config.js`:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // Include chat-ui components
    './node_modules/chat-ui/dist-lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Chat UI theme colors
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent-primary': 'var(--accent-primary)',
        'accent-light': 'var(--accent-light)',
        'border-primary': 'var(--border-primary)',
        'border-focus': 'var(--border-focus)',
      },
      zIndex: {
        'sticky': '100',
        'modal': '1000',
        'toast': '10000',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

**Import CSS in your main file:**
```typescript
// src/main.tsx or src/index.tsx
import 'chat-ui/style.css';
// If your app renders LaTeX, also include KaTeX CSS (optional)
import 'katex/dist/katex.min.css';
```

### 3. Configure CSS Variables

Add theme CSS variables to your global CSS:

```css
/* src/index.css or src/App.css */

:root {
  /* Light theme */
  --bg-primary: #ffffff;
  --bg-secondary: #f7f7f8;
  --bg-tertiary: #ececf1;
  --text-primary: #0d0d0d;
  --text-secondary: #666666;
  --accent-primary: #10a37f;
  --accent-light: #e6f4f1;
  --border-primary: #d1d5db;
  --border-focus: #10a37f;
}

[data-theme='dark'] {
  /* Dark theme */
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3d3d3d;
  --text-primary: #ececec;
  --text-secondary: #b4b4b4;
  --accent-primary: #19c37d;
  --accent-light: #1a3d34;
  --border-primary: #4d4d4d;
  --border-focus: #19c37d;
}
```

## Basic Usage

### Minimal Setup

Here's a minimal example to get started:

```typescript
import { ChatInterface, useChatStore, useThemeStore } from 'chat-ui';
import 'chat-ui/style.css';

function App() {
  const { theme } = useThemeStore();

  return (
    <div data-theme={theme}>
      <ChatInterface selectedResponseMode="stream" />
    </div>
  );
}

export default App;
```

### Full Application Example

A complete chat application with sidebar and settings:

```typescript
import React, { useState } from 'react';
import {
  ChatInterface,
  Sidebar,
  Settings,
  ToastContainer,
  useChatStore,
  useThemeStore,
  useResponseModeStore,
} from 'chat-ui';
import 'chat-ui/style.css';

function App() {
  const { theme, toggleTheme } = useThemeStore();
  const { selectedResponseMode, setSelectedResponseMode } = useResponseModeStore();
  const { chatSessions, activeChatId, setActiveChat, createChat, deleteChat, clearAllChats } = useChatStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div data-theme={theme} className="flex h-screen">
      <Sidebar
        chats={chatSessions}
        activeChatId={activeChatId}
        onChatSelected={setActiveChat}
        onNewChat={() => createChat('New Chat')}
        onDeleteChat={deleteChat}
        onClearAllChats={clearAllChats}
        collapsed={false}
        onCollapse={() => {}}
      />

      <div className="flex-1">
        <ChatInterface selectedResponseMode={selectedResponseMode} />
      </div>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
        />
      )}

      <ToastContainer />
    </div>
  );
}

export default App;
```

## Available Components

### Core Chat Components

#### `ChatInterface`
Main chat interface component.

```typescript
import { ChatInterface } from 'chat-ui';

<ChatInterface selectedResponseMode="stream" />
```

**Props:**
- `selectedResponseMode`: `'stream' | 'fetch'` - Response delivery mode

#### `MessageList`
Displays chat messages with branching support.

```typescript
import { MessageList } from 'chat-ui';

<MessageList
  messages={messages}
  onMessageEdit={handleEdit}
  onMessageDelete={handleDelete}
  onBranchSwitch={handleBranchSwitch}
  isLoading={false}
/>
```

#### `MessageInput`
User input component with file upload.

```typescript
import { MessageInput } from 'chat-ui';

<MessageInput
  onSendMessage={handleSend}
  disabled={false}
  placeholder="Type a message..."
/>
```

#### `Sidebar`
Chat session navigation sidebar.

```typescript
import { Sidebar } from 'chat-ui';

<Sidebar
  chats={chatSessions}
  activeChatId={activeChatId}
  onChatSelected={setActiveChat}
  onNewChat={createNewChat}
  onDeleteChat={deleteChat}
  onClearAllChats={clearAllChats}
  collapsed={false}
  onCollapse={toggleCollapse}
/>
```

#### `Settings`
Configuration modal component.

```typescript
import { Settings } from 'chat-ui';

<Settings
  onClose={closeSettings}
  selectedResponseMode={responseMode}
  onResponseModeChange={setResponseMode}
/>
```

### UI Components

#### `LoadingIndicator`
```typescript
import { LoadingIndicator } from 'chat-ui';

<LoadingIndicator />
```

#### `ThinkingIndicator`
```typescript
import { ThinkingIndicator } from 'chat-ui';

<ThinkingIndicator />
```

#### `ToastContainer`
```typescript
import { ToastContainer } from 'chat-ui';

<ToastContainer />
```

#### `ChartRenderer`
```typescript
import { ChartRenderer } from 'chat-ui';

<ChartRenderer chartData={chartData} />
```

#### `ErrorBoundary`
```typescript
import { ErrorBoundary } from 'chat-ui';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

## State Management

The library uses Zustand for state management. All stores are accessible:

### Chat Store

```typescript
import { useChatStore } from 'chat-ui';

function MyComponent() {
  const {
    chatSessions,
    activeChatId,
    createChat,
    deleteChat,
    setActiveChat,
    addMessageToChat,
    updateMessage,
    deleteMessage,
  } = useChatStore();

  // Use store methods...
}
```

### Theme Store

```typescript
import { useThemeStore } from 'chat-ui';

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

### Toast Store

```typescript
import { useToastStore } from 'chat-ui';

function MyComponent() {
  const { showToast } = useToastStore();

  const handleSuccess = () => {
    showToast('Operation successful!', 'success');
  };

  const handleError = () => {
    showToast('Something went wrong', 'error');
  };
}
```

### Service Config Store

```typescript
import { useServiceConfigStore } from 'chat-ui';

function ServiceConfiguration() {
  const { currentAdapterType, configs, updateConfig } = useServiceConfigStore();

  const changeAdapter = () => {
    updateConfig('rest', {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
    });
  };
}
```

### Store Selectors (Performance Optimization)

```typescript
import { useChatData, useChatActions, useBranchData } from 'chat-ui';

function OptimizedComponent() {
  // Only subscribes to chat data, not actions
  const { activeChatId, chatSessions } = useChatData();

  // Only subscribes to action methods
  const { addMessageToChat, updateMessage } = useChatActions();

  // Only subscribes to branch-related data
  const { getCurrentBranchMessages } = useBranchData();
}
```

## Services and Utilities

### Chat Service

```typescript
import { chatService } from 'chat-ui';

// Send message
const response = await chatService.sendMessage(
  'Hello, AI!',
  conversationHistory
);

// Send streaming message
await chatService.sendStreamingMessage(
  'Hello, AI!',
  conversationHistory,
  (chunk) => console.log('Chunk:', chunk),
  (error) => console.error('Error:', error)
);
```

### File Service

```typescript
import { fileService } from 'chat-ui';

// Upload file
const uploadedFile = await fileService.uploadFile(file, (progress) => {
  console.log('Upload progress:', progress);
});

// Download file
await fileService.downloadFile(fileId, 'filename.txt');
```

### Service Factory

```typescript
import { serviceFactory } from 'chat-ui';

// Configure service adapter
serviceFactory.configure({
  type: 'rest',
  baseUrl: 'https://api.example.com',
  timeout: 30000,
});
```

### Utilities

```typescript
import {
  generateMessageId,
  generateChatId,
  buildHistory,
  getConfig
} from 'chat-ui';

// Generate unique IDs
const messageId = generateMessageId();
const chatId = generateChatId();

// Build conversation history
const history = buildHistory(messages);

// Get configuration
const config = getConfig();
```

## TypeScript Support

The library is fully typed. Import types as needed:

```typescript
import type {
  Message,
  ChatSession,
  ResponseMode,
  MessageFile,
  ConversationMessage,
  ServiceConfig,
  AdapterType,
  ChatStore,
  ThemeStore,
} from 'chat-ui';

const message: Message = {
  id: '1',
  content: 'Hello',
  role: 'user',
  timestamp: Date.now(),
};

const config: ServiceConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 30000,
};
```

## Styling

### Custom Theme Colors

Override CSS variables for custom themes:

```css
:root {
  --bg-primary: #your-color;
  --accent-primary: #your-accent;
  /* ... other variables */
}
```

### Component Class Overrides

All components use Tailwind CSS classes. You can override with your own utility classes or use Tailwind's `@apply` directive:

```css
/* Override specific component styles */
.chat-message {
  @apply rounded-lg shadow-md;
}
```

## Advanced Usage

### Custom Service Adapter

Create a custom service adapter:

```typescript
import { BaseAdapter, MessageResponse, ConversationMessage } from 'chat-ui';

class MyCustomAdapter extends BaseAdapter {
  async sendMessage(
    message: string,
    conversationHistory: ConversationMessage[]
  ): Promise<MessageResponse> {
    // Your implementation
  }

  // Implement other required methods...
}

// Register and use
serviceFactory.registerAdapter('custom', MyCustomAdapter);
serviceFactory.configure({ type: 'custom', baseUrl: '...' });
```

### Backend Integration

Configure the library to connect to your backend:

```typescript
import { useServiceConfigStore } from 'chat-ui';

function setupBackend() {
  const { updateConfig } = useServiceConfigStore.getState();

  updateConfig('rest', {
    baseUrl: 'https://your-backend.com/api',
    timeout: 30000,
  });
}
```

### Custom Hooks Integration

Use the library's custom hooks in your components:

```typescript
import { useFileUpload, useStreamingMessage } from 'chat-ui';

function CustomChatComponent() {
  const { uploadFiles, selectedFiles, handleFileRemove } = useFileUpload();
  const { handleStreamingMessage } = useStreamingMessage();

  // Your implementation...
}
```

## Configuration

### Backend Configuration

If using the full application with backend, configure `config.json`:

```json
{
  "frontend": {
    "api": {
      "baseUrl": "https://your-backend.com/api",
      "timeout": 30000
    }
  }
}
```

### Environment Variables

For environment-specific configuration:

```bash
# .env
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=30000
```

Access in your code:
```typescript
const config = {
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  timeout: import.meta.env.VITE_API_TIMEOUT,
};
```

## Troubleshooting

### CSS Not Loading

Ensure you've imported the stylesheet:
```typescript
import 'chat-ui/style.css';
```

### Tailwind Classes Not Working

Make sure your `tailwind.config.js` includes the library path in `content`.

### Type Errors

Ensure peer dependencies are installed with correct versions:
```bash
npm install react@^19.0.0 react-dom@^19.0.0 zustand@^5.0.0
```

### Module Resolution Issues

If using TypeScript, ensure `moduleResolution` is set to `"bundler"` or `"node"`:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Examples

See the `src/components/examples/` directory for more usage examples.

## Support

For issues and questions:
- GitHub Issues: [your-repo-url]
- Documentation: See README.md and CLAUDE.md
