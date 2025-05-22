# State Management Guide

## Overview

The chat UI application uses Zustand for efficient state management, replacing the previous Context API implementation. This provides better performance, simplified component logic, and improved developer experience.

## Architecture

### Store Structure
The application uses multiple specialized stores, each handling a specific domain:

- **Chat Store** (`chatStore.ts`) - Manages chat sessions, messages, and related operations
- **Theme Store** (`themeStore.ts`) - Handles theme preferences and switching
- **Toast Store** (`toastStore.ts`) - Manages toast notifications  
- **Agent Store** (`agentStore.ts`) - Controls agent selection and configuration
- **Service Config Store** (`serviceConfigStore.ts`) - Manages service configurations per adapter type

### Benefits Over Context API
- **Performance**: Avoids unnecessary re-renders
- **Simplicity**: Direct access without provider wrapping
- **Persistence**: State maintained outside React component tree
- **Type Safety**: Full TypeScript support

## Usage

### 1. Basic Store Usage

```typescript
import { useChatStore, useThemeStore } from '../stores';

function MyComponent() {
  // Access chat store
  const { chatSessions, addMessageToChat, createChat } = useChatStore();
  
  // Access theme store
  const { theme, toggleTheme } = useThemeStore();
  
  return (
    <div className={`container ${theme}-theme`}>
      <button onClick={() => createChat('New Chat')}>Create Chat</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### 2. Service Configuration Management

```typescript
import { useServiceConfigStore } from '../stores';

function ServiceComponent() {
  const { getCurrentConfig, updateConfig, setCurrentAdapterType } = useServiceConfigStore();
  const currentConfig = getCurrentConfig();
  
  const handleAdapterChange = (adapterType: AdapterType) => {
    setCurrentAdapterType(adapterType);
    // Configuration automatically switches
  };
  
  return (
    <div>
      <p>Current API: {currentConfig.baseUrl}</p>
      <p>Adapter: {currentConfig.adapterType}</p>
    </div>
  );
}
```

### 3. Toast Notifications

```typescript
import { useToastStore } from '../stores';

function NotificationComponent() {
  const { showToast } = useToastStore();
  
  const handleSuccess = () => {
    showToast('Operation completed successfully!', 'success');
  };
  
  const handleError = () => {
    showToast('Something went wrong', 'error', 5000);
  };
  
  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

### 4. Monitoring Store Changes

```typescript
import { useEffect } from 'react';
import { useChatStore } from '../stores';

function ChatMonitor() {
  const { activeChatId, getChatById } = useChatStore();
  const activeChat = activeChatId ? getChatById(activeChatId) : null;
  
  useEffect(() => {
    if (activeChat) {
      console.log('Active chat changed:', activeChat.name);
    }
  }, [activeChat]);
  
  return <div>Monitoring chat changes...</div>;
}
```

## Store Details

### Chat Store Features
- Create, delete, and rename chat sessions
- Add and update messages
- Manage active chat selection
- Handle processing states and errors

### Theme Store Features
- Toggle between light and dark themes
- Persist theme preference to localStorage
- Apply theme classes to DOM elements

### Service Config Store Features
- Manage configurations per adapter type
- Automatic configuration switching
- Persist settings to localStorage
- Support for REST, Session, and Mock adapters

### Toast Store Features
- Display success, error, info, and warning messages
- Auto-dismiss with configurable duration
- Queue multiple notifications

## File Structure

```
src/
├── stores/                     # All Zustand stores
│   ├── index.ts               # Convenient export of all stores
│   ├── chatStore.ts           # Chat management store
│   ├── themeStore.ts          # Theme management store
│   ├── toastStore.ts          # Toast notifications store
│   ├── agentStore.ts          # Agent selection store
│   └── serviceConfigStore.ts  # Service configuration store
├── types/
│   └── store.ts               # TypeScript interfaces for all stores
├── hooks/
│   └── useServiceConfig.ts    # Custom hooks for service config
└── components/
    └── Settings.tsx           # Settings UI using stores
```

## Migration Notes

### From Context API
If migrating from Context API:

**Before:**
```typescript
const { chatSessions } = useContext(ChatContext);
```

**After:**
```typescript
const { chatSessions } = useChatStore();
```

### From Old Config Manager
If migrating from the old config manager:

**Before:**
```typescript
configManager.updateApiConfig({ baseUrl: 'http://localhost:3000/api' });
```

**After:**
```typescript
const { updateConfig } = useServiceConfigStore.getState();
updateConfig('rest', { baseUrl: 'http://localhost:3000/api' });
```

## Best Practices

1. **Single Responsibility**: Each store handles one domain
2. **Immutable Updates**: Use spread operators for state updates
3. **Type Safety**: Define proper TypeScript interfaces
4. **Error Handling**: Handle errors within store actions
5. **Performance**: Use selectors to prevent unnecessary re-renders

## Testing

Stores can be easily tested in isolation:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '../stores/chatStore';

test('should create a new chat', () => {
  const { result } = renderHook(() => useChatStore());
  
  act(() => {
    result.current.createChat('Test Chat');
  });
  
  expect(result.current.chatSessions).toHaveLength(1);
  expect(result.current.chatSessions[0].name).toBe('Test Chat');
});
```

## Benefits

1. **Performance Optimization**: Minimal re-renders and efficient updates
2. **Developer Experience**: Simple API with TypeScript support
3. **Maintainability**: Clear separation of concerns
4. **Testability**: Easy to mock and test store logic
5. **Persistence**: Built-in localStorage integration where needed 