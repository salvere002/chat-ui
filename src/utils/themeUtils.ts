export type Theme = 'light' | 'dark';

export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  
  const root = window.document.documentElement;
  const themeClass = theme === 'light' ? 'light-theme' : 'dark-theme';
  
  // Remove any existing theme classes from root
  root.classList.remove('light-theme', 'dark-theme');
  
  // Add the new theme class to root only
  root.classList.add(themeClass);
  
  // CSS cascades from root, no need for body class duplication
  // No forced reflow - let CSS transitions handle the change smoothly
};