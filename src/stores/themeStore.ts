import { create } from 'zustand';
import { ThemeStore } from '../types/store';

// Create the theme store with Zustand
const useThemeStore = create<ThemeStore>((set) => ({
  // Initialize theme based on local storage or system preference
  theme: (() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Check local storage first
      const storedTheme = localStorage.getItem('chat-theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
      // Otherwise, check system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
    }
    // Default to light mode if not in browser
    return 'light';
  })(),
  
  // Toggle theme function
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      
      // Apply theme to DOM
      const root = window.document.documentElement;
      
      // Remove any existing theme classes
      root.classList.remove('light-theme', 'dark-theme');
      document.body.classList.remove('light-theme', 'dark-theme');
      
      // Add the new theme classes
      const themeClass = newTheme === 'light' ? 'light-theme' : 'dark-theme';
      root.classList.add(themeClass);
      document.body.classList.add(themeClass);
      
      // Save to localStorage
      localStorage.setItem('chat-theme', newTheme);
      
      // Force a repaint to ensure all components apply the theme
      document.body.style.display = 'none';
      document.body.offsetHeight; // Force a reflow
      document.body.style.display = '';
      
      return { theme: newTheme };
    });
  },
}));

// Apply the theme when the store is initialized
if (typeof window !== 'undefined') {
  const theme = useThemeStore.getState().theme;
  const root = window.document.documentElement;
  
  // Remove any existing theme classes
  root.classList.remove('light-theme', 'dark-theme');
  document.body.classList.remove('light-theme', 'dark-theme');
  
  // Add the new theme classes
  const themeClass = theme === 'light' ? 'light-theme' : 'dark-theme';
  root.classList.add(themeClass);
  document.body.classList.add(themeClass);

  // Force a repaint to ensure all components apply the theme
  document.body.style.display = 'none';
  document.body.offsetHeight; // Force a reflow
  document.body.style.display = '';
}

export default useThemeStore; 