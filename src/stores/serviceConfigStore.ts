import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdapterType } from '../services/chatService';
import { configManager } from '../utils/config';

export interface ServiceConfig {
  adapterType: AdapterType;
  baseUrl: string;
  sessionEndpoint?: string;
}

interface ServiceConfigStore {
  // State - configs keyed by adapter type
  configs: Record<AdapterType, ServiceConfig>;
  currentAdapterType: AdapterType;
  
  // Actions
  getConfig: (adapterType: AdapterType) => ServiceConfig;
  getCurrentConfig: () => ServiceConfig;
  updateConfig: (adapterType: AdapterType, updates: Partial<ServiceConfig>) => void;
  setCurrentAdapterType: (adapterType: AdapterType) => void;
}

// Get default config from static configuration
const getDefaultConfig = (): Record<AdapterType, ServiceConfig> => {
  const apiConfig = configManager.getApiConfig();
  const servicesConfig = configManager.getServicesConfig();
  const baseUrl = apiConfig.baseUrl;
  
  return {
    rest: {
      adapterType: 'rest',
      baseUrl,
      sessionEndpoint: `${baseUrl}/session`
    },
    session: {
      adapterType: 'session',
      baseUrl,
      sessionEndpoint: servicesConfig.sessionEndpoint || `${baseUrl}/session`
    },
    mock: {
      adapterType: 'mock',
      baseUrl: 'http://mock.local',
      sessionEndpoint: 'http://mock.local/session'
    }
  };
};

// Function to configure ChatService
const configureChatService = (config: ServiceConfig) => {
  // Import ChatService dynamically to avoid circular dependencies
  import('../services/chatService').then(({ ChatService }) => {
    ChatService.configure({
      adapterType: config.adapterType,
      baseUrl: config.baseUrl,
      sessionEndpoint: config.sessionEndpoint
    });
  });
};

const useServiceConfigStore = create<ServiceConfigStore>()(
  persist(
    (set, get) => ({
      configs: getDefaultConfig(),
      currentAdapterType: (configManager.getServicesConfig().adapterType as AdapterType) || 'rest',
      
      getConfig: (adapterType) => {
        return get().configs[adapterType];
      },
      
      getCurrentConfig: () => {
        const state = get();
        return state.configs[state.currentAdapterType];
      },
      
      updateConfig: (adapterType, updates) => {
        set((state) => {
          const newConfig = {
            ...state.configs[adapterType],
            ...updates,
            adapterType // Ensure adapter type is not changed
          };
          
          const newConfigs = {
            ...state.configs,
            [adapterType]: newConfig
          };
          
          // If updating the current adapter's config, reconfigure ChatService
          if (adapterType === state.currentAdapterType) {
            configureChatService(newConfig);
          }
          
          return { configs: newConfigs };
        });
      },
      
      setCurrentAdapterType: (adapterType) => {
        set({ currentAdapterType: adapterType });
        
        // Configure ChatService with the new current config
        const config = get().configs[adapterType];
        configureChatService(config);
      }
    }),
    {
      name: 'service-config-store',
      partialize: (state) => ({
        configs: state.configs,
        currentAdapterType: state.currentAdapterType
      })
    }
  )
);

// Initialize ChatService on first load
if (typeof window !== 'undefined') {
  const state = useServiceConfigStore.getState();
  const currentConfig = state.getCurrentConfig();
  configureChatService(currentConfig);
}

export default useServiceConfigStore; 