import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UiSettingsStore } from '../types/store';

// Create the UI settings store with Zustand and persistence
const useUiSettingsStore = create<UiSettingsStore>()(
  persist(
    (set) => ({
      // Default settings
      showSuggestions: true,
      
      // Actions
      setShowSuggestions: (show: boolean) => {
        set({ showSuggestions: show });
      },
      
      toggleSuggestions: () => {
        set((state) => ({ showSuggestions: !state.showSuggestions }));
      }
    }),
    {
      name: 'ui-settings-store',
      partialize: (state) => ({
        showSuggestions: state.showSuggestions
      })
    }
  )
);

export default useUiSettingsStore;