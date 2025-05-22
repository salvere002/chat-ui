# Service Configuration Guide

## Overview

The service configuration system separates static configuration from dynamic service configurations. Each connection method (adapter type) has its own configuration that is automatically selected when you switch between connection methods.

## Architecture

### Static Configuration (`utils/config.ts`)
- Handles read-only static configurations loaded from `config.json`
- Contains default values and non-changeable settings
- No update methods - purely for reading configuration values

### Dynamic Service Configuration (`stores/serviceConfigStore.ts`)
- Uses Zustand for state management
- Persists configurations to localStorage
- Each adapter type (REST, Session, Mock) has its own configuration
- Configurations are automatically switched when changing adapter types

## How It Works

When you change the connection method in the Settings panel:
1. The configuration for that adapter type is automatically loaded
2. You can modify the backend URL for that specific adapter
3. The configuration is saved specifically for that adapter type
4. Next time you select that adapter, your saved configuration is restored

## Usage

### 1. Basic Service Configuration Access

```typescript
import { useServiceConfigStore } from '../stores';

function MyComponent() {
  const { getCurrentConfig, currentAdapterType } = useServiceConfigStore();
  const currentConfig = getCurrentConfig();
  
  // Access configuration values
  console.log(currentConfig.baseUrl);
  console.log(currentConfig.adapterType);
  
  return (
    <div>
      <p>Current API: {currentConfig.baseUrl}</p>
      <p>Adapter: {currentConfig.adapterType}</p>
    </div>
  );
}
```

### 2. Monitoring Configuration Changes

Use the custom `useServiceConfig` hook to monitor and react to configuration changes:

```typescript
import { useServiceConfig } from '../hooks/useServiceConfig';

function MyComponent() {
  // This will automatically update when the configuration changes
  const currentConfig = useServiceConfig((config) => {
    console.log('Config changed:', config);
    // Handle configuration change (e.g., reconnect to new endpoint)
  });
  
  // The component will re-render when config changes
  return <div>Current URL: {currentConfig?.baseUrl}</div>;
}
```

### 3. Getting Specific Config Values

```typescript
import { useServiceConfigValue } from '../hooks/useServiceConfig';

function ApiStatusComponent() {
  // Get specific values with automatic updates
  const baseUrl = useServiceConfigValue('baseUrl');
  const adapterType = useServiceConfigValue('adapterType');
  
  return (
    <div className="api-status">
      <div>API URL: {baseUrl}</div>
      <div>Connection: {adapterType}</div>
    </div>
  );
}
```

### 4. Checking Service Readiness

```typescript
import { useServiceReady } from '../hooks/useServiceConfig';

function ServiceHealthComponent() {
  const isReady = useServiceReady();
  
  if (!isReady) {
    return (
      <div className="service-warning">
        Service not configured properly
      </div>
    );
  }
  
  return <div className="service-ok">Service ready!</div>;
}
```

### 5. Programmatic Configuration Updates

```typescript
import { useServiceConfigStore } from '../stores';

function ConfigManagerComponent() {
  const { updateConfig, setCurrentAdapterType } = useServiceConfigStore();
  
  const switchToProduction = () => {
    setCurrentAdapterType('rest');
    updateConfig('rest', {
      baseUrl: 'https://api.production.com'
    });
  };
  
  const switchToDevelopment = () => {
    setCurrentAdapterType('rest');
    updateConfig('rest', {
      baseUrl: 'http://localhost:5001/api'
    });
  };
  
  return (
    <div>
      <button onClick={switchToProduction}>Production</button>
      <button onClick={switchToDevelopment}>Development</button>
    </div>
  );
}
```

## Settings Panel Behavior

The Settings panel provides a simple interface for configuration management:

1. **Connection Method Dropdown**: When you change the connection method, the backend URL automatically updates to the saved configuration for that adapter type
2. **Backend URL Field**: You can modify the URL, and it will be saved specifically for the current connection method
3. **Automatic Persistence**: Each adapter type remembers its own backend URL configuration

### Configuration Examples:
- **REST API**: `http://localhost:5001/api`
- **Session Based**: `http://localhost:3000/session`  
- **Mock**: `http://mock.local`

## Data Persistence

Service configurations are automatically persisted to localStorage under the key `service-config-store`. Each adapter type maintains its own configuration settings.

```javascript
// Example of persisted data structure
{
  "configs": {
    "rest": {
      "adapterType": "rest",
      "baseUrl": "http://localhost:5001/api",
      "sessionEndpoint": "http://localhost:5001/api/session"
    },
    "session": {
      "adapterType": "session", 
      "baseUrl": "http://localhost:3000/api",
      "sessionEndpoint": "http://localhost:3000/session"
    },
    "mock": {
      "adapterType": "mock",
      "baseUrl": "http://mock.local",
      "sessionEndpoint": "http://mock.local/session"
    }
  },
  "currentAdapterType": "rest"
}
```

## File Structure

```
src/
├── stores/
│   └── serviceConfigStore.ts     # Service configuration store
├── hooks/
│   └── useServiceConfig.ts       # Service config monitoring hooks
├── utils/
│   └── config.ts                 # Static configuration manager
├── components/
│   └── Settings.tsx              # Settings UI
└── services/
    ├── chatService.ts            # Service using configurations
    └── serviceFactory.ts         # Service factory
```

## Migration Notes

### From Old Config Manager
The new system is simpler - you no longer need to manually manage configurations. Just select a connection method and set its URL.

**Before:**
```typescript
configManager.updateApiConfig({ baseUrl: 'http://localhost:3000/api' });
configManager.updateServicesConfig({ adapterType: 'rest' });
```

**After:**
```typescript
const { updateConfig, setCurrentAdapterType } = useServiceConfigStore.getState();
setCurrentAdapterType('rest');
updateConfig('rest', { baseUrl: 'http://localhost:3000/api' });
```

## Testing

Service configurations can be easily tested:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useServiceConfigStore } from '../stores/serviceConfigStore';

test('should update configuration for specific adapter', () => {
  const { result } = renderHook(() => useServiceConfigStore());
  
  act(() => {
    result.current.updateConfig('rest', {
      baseUrl: 'http://test.api.com'
    });
  });
  
  const config = result.current.getConfig('rest');
  expect(config.baseUrl).toBe('http://test.api.com');
});
```

## Best Practices

1. **Adapter-Specific Configuration**: Use different URLs for different adapter types
2. **Environment Management**: Set up different configurations for development/production
3. **Error Handling**: Always check if service is ready before making API calls
4. **Monitoring**: Use hooks to monitor configuration changes in components
5. **Type Safety**: Leverage TypeScript interfaces for configuration objects

## Benefits

1. **Simplicity**: No need to manually create or manage configurations
2. **Automatic Switching**: Configurations automatically switch based on connection method
3. **Persistence**: Each adapter type remembers its configuration
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Separation of Concerns**: Clear distinction between static and dynamic configurations
6. **Developer Experience**: Easy to use hooks and clear API 