import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdapterType, serviceFactory } from '../services/serviceFactory';
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
  resetToDefaults: () => void;
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

// Use a single static serviceFactory to configure adapters

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
            serviceFactory.switchAdapter(newConfig.adapterType, newConfig.baseUrl);
          }
          
          return { configs: newConfigs };
        });
      },
      
      setCurrentAdapterType: (adapterType) => {
        set({ currentAdapterType: adapterType });
        
        // Configure ChatService with the new current config
        const config = get().configs[adapterType];
        serviceFactory.switchAdapter(config.adapterType, config.baseUrl);
      },
      
      resetToDefaults: () => {
        const defaultConfigs = getDefaultConfig();
        const defaultAdapterType = (configManager.getServicesConfig().adapterType as AdapterType) || 'rest';
        
        set({ 
          configs: defaultConfigs,
          currentAdapterType: defaultAdapterType
        });
        
        // Configure ChatService with the reset current config
        const currentConfig = defaultConfigs[defaultAdapterType];
        serviceFactory.switchAdapter(currentConfig.adapterType, currentConfig.baseUrl);
      }
    }),
    {
      name: 'service-config-store',
      partialize: (state) => ({
        configs: state.configs,
        currentAdapterType: state.currentAdapterType
      }),
      // After hydration, configure the serviceFactory with the persisted config
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate service-config-store:', error);
          return;
        }
        try {
          if (!state) return;
          const currentConfig = state.getCurrentConfig();
          serviceFactory.switchAdapter(currentConfig.adapterType, currentConfig.baseUrl);
        } catch (e) {
          console.error('Error applying hydrated service config:', e);
        }
      }
    }
  )
);

// Note: Initial adapter initialization is handled after hydration via onRehydrateStorage

export default useServiceConfigStore; 
