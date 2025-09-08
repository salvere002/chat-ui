import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UiSettingsStore } from '../types/store';
import { configManager } from '../utils/config';

// Create the UI settings store with Zustand and persistence
const useUiSettingsStore = create<UiSettingsStore>()(
  persist(
    (set) => ({
      // Default settings
      showSuggestions: configManager.getDefaultShowSuggestions(),
      backgroundTexture: configManager.getDefaultBackgroundTextureEnabled(),
      
      // Actions
      setShowSuggestions: (show: boolean) => {
        set({ showSuggestions: show });
      },
      
      toggleSuggestions: () => {
        set((state) => ({ showSuggestions: !state.showSuggestions }));
      },
      
      setBackgroundTexture: (texture: boolean) => {
        set({ backgroundTexture: texture });
      }
    }),
    {
      name: 'ui-settings-store',
      partialize: (state) => ({
        showSuggestions: state.showSuggestions,
        backgroundTexture: state.backgroundTexture
      }),
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState;
        // Migrate from v1 where backgroundTexture was 'off' | 'subtle' to boolean
        if (version < 2) {
          const bt = persistedState.backgroundTexture;
          if (bt === 'off') persistedState.backgroundTexture = false;
          else if (bt === 'subtle') persistedState.backgroundTexture = true;
          else if (typeof bt !== 'boolean') persistedState.backgroundTexture = false;
        }
        return persistedState;
      }
    }
  )
);

export default useUiSettingsStore;
