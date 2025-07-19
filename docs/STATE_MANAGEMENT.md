# State Management Guide

## Overview

The chat UI application uses Zustand for efficient state management, replacing the previous Context API implementation. This provides better performance, simplified component logic, and improved developer experience.

## Architecture

### Store Structure
The application uses multiple specialized stores, each handling a specific domain:

- **Chat Store** (`chatStore.ts`) - Manages chat sessions, messages, and branching operations
- **Theme Store** (`themeStore.ts`) - Handles theme preferences and switching
- **Toast Store** (`toastStore.ts`) - Manages toast notifications  
- **Response Mode Store** (`responseModeStore.ts`) - Controls response delivery mode (stream/fetch)
- **Service Config Store** (`serviceConfigStore.ts`) - Manages service configurations per adapter type

### Benefits Over Context API
- **Performance**: Avoids unnecessary re-renders
- **Simplicity**: Direct access without provider wrapping
- **Persistence**: State maintained outside React component tree
- **Type Safety**: Full TypeScript support

## Usage

### 1. Basic Store Usage

```typescript
import { useChatStore, useThemeStore, useResponseModeStore } from '../stores';

function MyComponent() {
  // Access chat store
  const { chatSessions, addMessageToChat, createChat } = useChatStore();
  
  // Access theme store
  const { theme, toggleTheme } = useThemeStore();
  
  // Access response mode store
  const { selectedResponseMode, setSelectedResponseMode } = useResponseModeStore();
  
  return (
    <div className={`container ${theme}-theme`}>
      <button onClick={() => createChat('New Chat')}>Create Chat</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <select 
        value={selectedResponseMode} 
        onChange={(e) => setSelectedResponseMode(e.target.value as ResponseMode)}
      >
        <option value="stream">Stream</option>
        <option value="fetch">Fetch</option>
      </select>
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

### 4. Message Branching Management

```typescript
import { useChatStore } from '../stores';

function BranchingComponent() {
  const { 
    getCurrentBranchMessages, 
    createBranchFromMessage, 
    switchToBranch,
    getBranchOptionsAtMessage 
  } = useChatStore();
  
  const handleCreateBranch = (messageId: string, newMessage: Message) => {
    const branchId = createBranchFromMessage('chat-id', messageId, newMessage);
    // Automatically switches to the new branch
  };
  
  const handleSwitchBranch = (branchId: string) => {
    switchToBranch('chat-id', branchId);
  };
  
  return (
    <div>
      <button onClick={() => handleCreateBranch('msg-1', newMessage)}>
        Create Branch
      </button>
    </div>
  );
}
```

### 5. Monitoring Store Changes

```typescript
import { useEffect } from 'react';
import { useChatStore } from '../stores';

function ChatMonitor() {
  const { activeChatId, getChatById, getCurrentBranchMessages } = useChatStore();
  const activeChat = activeChatId ? getChatById(activeChatId) : null;
  const branchMessages = activeChatId ? getCurrentBranchMessages(activeChatId) : [];
  
  useEffect(() => {
    if (activeChat) {
      console.log('Active chat changed:', activeChat.name);
      console.log('Current branch messages:', branchMessages.length);
    }
  }, [activeChat, branchMessages]);
  
  return <div>Monitoring chat and branch changes...</div>;
}
```

## Store Details

### Chat Store Features
- Create, delete, and rename chat sessions
- Add and update messages with branching support
- Manage message branching and tree navigation
- Handle active chat selection and branch paths
- Process streaming and batch responses
- Error handling and processing states

### Theme Store Features
- Toggle between light and dark themes
- Persist theme preference to localStorage
- Apply theme classes dynamically to DOM

### Response Mode Store Features
- Toggle between streaming and fetch response modes
- Persist response mode preference
- Control message delivery behavior

### Service Config Store Features
- Manage configurations per adapter type (REST, Session, Mock)
- Automatic configuration switching when changing adapters
- Persist adapter-specific settings to localStorage
- Dynamic service reconfiguration

### Toast Store Features
- Display success, error, info, and warning notifications
- Auto-dismiss with configurable duration
- Queue and stack multiple notifications
- Animated show/hide transitions

## File Structure

```
src/
├── stores/                     # All Zustand stores
│   ├── index.ts               # Convenient export of all stores
│   ├── chatStore.ts           # Chat management and branching store
│   ├── themeStore.ts          # Theme management store
│   ├── toastStore.ts          # Toast notifications store
│   ├── responseModeStore.ts   # Response mode selection store
│   └── serviceConfigStore.ts  # Service configuration store
├── types/
│   ├── store.ts               # TypeScript interfaces for all stores
│   ├── chat.ts                # Chat and message type definitions
│   └── api.ts                 # API-related type definitions
├── hooks/
│   └── useFileUpload.ts       # Custom hooks for file upload
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