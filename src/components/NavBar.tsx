import React from 'react';
import { FaSun, FaMoon, FaCog, FaBars, FaTimes, FaShareAlt } from 'react-icons/fa';

interface NavBarProps {
  /** Whether the sidebar is currently open (mobile only) */
  sidebarOpen: boolean;
  /** Handler for toggling the sidebar on mobile */
  onSidebarToggle: () => void;
  /** Current theme setting */
  theme: 'light' | 'dark';
  /** Handler for toggling the theme */
  onThemeToggle: () => void;
  /** Handler for opening the share modal */
  onShareClick: () => void;
  /** Handler for opening the settings panel */
  onSettingsClick: () => void;
  /** Whether the app is currently capturing a screenshot */
  isCapturing?: boolean;
  /** Optional custom title for the navbar */
  title?: string;
}

/**
 * NavBar component - Top navigation bar with app title and action buttons
 * 
 * Features:
 * - Mobile sidebar toggle (hamburger menu)
 * - App title/branding
 * - Share conversation button
 * - Theme toggle (light/dark)
 * - Settings button
 * - Disabled state during screenshot capture
 */
const NavBar: React.FC<NavBarProps> = ({
  sidebarOpen,
  onSidebarToggle,
  theme,
  onThemeToggle,
  onShareClick,
  onSettingsClick,
  isCapturing = false,
  title = 'Chat UI',
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border-primary z-sticky">
      <div className="flex items-center gap-3">
        {/* Hamburger menu for mobile */}
        <button
          onClick={onSidebarToggle}
          className="lg:hidden flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Toggle sidebar"
          disabled={isCapturing}
        >
          {sidebarOpen ? <FaTimes className="relative z-10" /> : <FaBars className="relative z-10" />}
        </button>

        <h1 className="text-xl font-semibold text-text-primary transition-opacity duration-200 select-none">
          {title}
        </h1>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Share button */}
        <button
          onClick={onShareClick}
          className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Share conversation"
          title="Share conversation"
          disabled={isCapturing}
        >
          <FaShareAlt className="relative z-10" />
        </button>

        {/* Theme toggle button */}
        <button
          onClick={onThemeToggle}
          className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          disabled={isCapturing}
        >
          {theme === 'light' ? <FaMoon className="relative z-10" /> : <FaSun className="relative z-10" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Open settings"
          disabled={isCapturing}
        >
          <FaCog className="relative z-10" />
        </button>
      </div>
    </div>
  );
};

export default NavBar;

