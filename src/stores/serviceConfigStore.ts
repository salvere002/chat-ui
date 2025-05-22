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
        set((state) => ({
          configs: {
            ...state.configs,
            [adapterType]: {
              ...state.configs[adapterType],
              ...updates,
              adapterType // Ensure adapter type is not changed
            }
          }
        }));
      },
      
      setCurrentAdapterType: (adapterType) => {
        set({ currentAdapterType: adapterType });
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

export default useServiceConfigStore; 