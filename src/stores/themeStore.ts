import { create } from 'zustand';
import { ThemeStore } from '../types/store';
import { configManager } from '../utils/config';
import { applyTheme } from '../utils/themeUtils';

// Create the theme store with Zustand
const useThemeStore = create<ThemeStore>((set) => ({
  // Initialize theme based on local storage, system preference, or config default
  theme: (() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Check local storage first
      const storedTheme = localStorage.getItem('chat-theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
      // Otherwise, check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    // Fall back to config default theme
    const configDefault = configManager.getUiConfig().defaultTheme;
    return (configDefault === 'light' || configDefault === 'dark') ? configDefault : 'light';
  })(),
  
  // Toggle theme function
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      
      // Apply theme to DOM using centralized utility
      applyTheme(newTheme);
      
      // Save to localStorage
      localStorage.setItem('chat-theme', newTheme);
      
      return { theme: newTheme };
    });
  },
  
  // Explicitly set theme
  setTheme: (theme) => {
    set(() => {
      applyTheme(theme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-theme', theme);
      }
      return { theme };
    });
  },
}));

// Apply the theme when the store is initialized
if (typeof window !== 'undefined') {
  const theme = useThemeStore.getState().theme;
  applyTheme(theme);
}

export default useThemeStore; 
