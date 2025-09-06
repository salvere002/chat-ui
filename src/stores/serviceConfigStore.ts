import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdapterType } from '../services/serviceFactory';
import { configManager } from '../utils/config';

export interface ServiceConfig {
  adapterType: AdapterType;
  baseUrl: string;
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
  const baseUrl = apiConfig.baseUrl;
  
  return {
    rest: {
      adapterType: 'rest',
      baseUrl
    },
    session: {
      adapterType: 'session',
      baseUrl
    },
    mock: {
      adapterType: 'mock',
      baseUrl: 'http://mock.local'
    }
  };
};

// Function to configure service factory
const configureServiceFactory = (config: ServiceConfig) => {
  // Import serviceFactory to configure the service
  import('../services/serviceFactory').then(({ serviceFactory }) => {
    serviceFactory.switchAdapter(config.adapterType, config.baseUrl);
  });
};

// Function to configure service factory synchronously
const configureServiceFactorySync = (config: ServiceConfig) => {
  // Use dynamic import but return the promise for awaiting
  return import('../services/serviceFactory').then(({ serviceFactory }) => {
    serviceFactory.switchAdapter(config.adapterType, config.baseUrl);
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
            configureServiceFactory(newConfig);
          }
          
          return { configs: newConfigs };
        });
      },
      
      setCurrentAdapterType: (adapterType) => {
        set({ currentAdapterType: adapterType });
        
        // Configure ChatService with the new current config
        const config = get().configs[adapterType];
        configureServiceFactory(config);
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

// Initialize ServiceFactory on first load
if (typeof window !== 'undefined') {
  const state = useServiceConfigStore.getState();
  const currentConfig = state.getCurrentConfig();
  configureServiceFactorySync(currentConfig).catch(console.error);
}

export default useServiceConfigStore; 