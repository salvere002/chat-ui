import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResponseModeStore } from '../types/store';
import { ResponseMode } from '../types/chat';
import { configManager } from '../utils/config';

// Create the response mode store with Zustand + persistence
const useResponseModeStore = create<ResponseModeStore>()(
  persist(
    (set) => ({
      // Initialize from config defaults; persisted value (if present) will override
      selectedResponseMode: configManager.getDefaultResponseMode() as ResponseMode,
      
      // Actions
      setSelectedResponseMode: (responseMode: ResponseMode) => {
        set({ selectedResponseMode: responseMode });
      }
    }),
    {
      name: 'response-mode-store',
      partialize: (state) => ({ selectedResponseMode: state.selectedResponseMode })
    }
  )
);

export default useResponseModeStore; 
