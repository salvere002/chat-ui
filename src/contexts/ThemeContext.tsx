import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to hold the current theme, defaulting to light or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Check local storage first
    const storedTheme = localStorage.getItem('chat-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    // Otherwise, check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme immediately when the component mounts
  useEffect(() => {
    applyTheme(theme);
  }, []);

  // Function to apply theme changes synchronously
  const applyTheme = (newTheme: Theme) => {
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
  };

  // Function to toggle the theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    // Apply theme changes synchronously before state update
    applyTheme(newTheme);
    // Update state after DOM changes
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 