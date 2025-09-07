export type Theme = 'light' | 'dark';

// Apply theme by toggling a single class on <html> and temporarily disabling
// transitions to avoid staggered "waterfall" color changes across deep trees.
export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;

  // Temporarily disable transitions/animations during theme flip
  root.classList.add('theme-changing');

  // Toggle only the dark theme class; light uses :root variables by default
  if (theme === 'dark') {
    root.classList.add('dark-theme');
  } else {
    root.classList.remove('dark-theme');
  }

  // Remove the transition-disabling class on the next frame
  // Using two rAFs ensures styles are applied before re-enabling transitions.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('theme-changing');
    });
  });
};
