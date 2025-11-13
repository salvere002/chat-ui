import React, { useState, useCallback, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { FaSun, FaMoon, FaCog, FaBars, FaTimes, FaShareAlt } from 'react-icons/fa';
import { ToastContainer } from './components/Toast';
import { toast } from 'sonner';
import { useThemeStore, useResponseModeStore, useChatStore, useUiSettingsStore, useServiceConfigStore, useMcpStore } from './stores';
import { getMcpConfigViaAdapter, isMcpConfigSupported } from './services/mcpConfigService';
import { useShallow } from 'zustand/react/shallow';
import Settings from './components/Settings';
import ShareModal from './components/ShareModal';
import LoadingIndicator from './components/LoadingIndicator';
import { captureConversationScreenshot } from './utils/screenshot';

const App: React.FC = () => {
  // Use the theme store
  const { theme, toggleTheme } = useThemeStore();
  const { backgroundTexture } = useUiSettingsStore();
  
  // Generate texture class based on setting
  const getTextureClass = () => {
    return backgroundTexture ? 'texture-subtle' : 'texture-off';
  };
  
  
  // Use selective subscriptions for sidebar-specific data
  const sidebarData = useChatStore(useShallow(state => ({
    chatSessions: state.chatSessions,
    activeChatId: state.activeChatId
  })));
  
  const sidebarActions = useChatStore(useShallow(state => ({
    setActiveChat: state.setActiveChat,
    createChat: state.createChat,
    deleteChat: state.deleteChat,
    clearAllChats: state.clearAllChats
  })));
  
  // Use the response mode store for response mode selection
  const { selectedResponseMode, setSelectedResponseMode } = useResponseModeStore();
  
  // State for settings modal
  const [showSettings, setShowSettings] = useState(false);
  
  // State for responsive settings handling
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 1280);
  
  // State for mobile sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State for sidebar collapse/expand (desktop only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // State for share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  // UI blocking during capture
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Service initialization is handled automatically by serviceConfigStore

  // Handle window resize for responsive settings
  useEffect(() => {
    const handleResize = () => {
      const newIsWideScreen = window.innerWidth >= 1280;
      setIsWideScreen(newIsWideScreen);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Bootstrap + re-sync: pull MCP config whenever adapter changes
  const { type: currentAdapterType, url: currentAdapterBaseUrl } = useServiceConfigStore(useShallow((s) => ({
    type: s.currentAdapterType,
    url: s.configs[s.currentAdapterType].baseUrl,
  })));
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isMcpConfigSupported()) return;
        const remote = await getMcpConfigViaAdapter();
        if (cancelled) return;
        if (remote && typeof remote === 'object') {
          await useMcpStore.getState().setJson(JSON.stringify(remote));
        }
      } catch (e: any) {
        // Ignore adapters/backends that don't support MCP sync or any fetch errors
        // Local persisted config remains in effect
      }
    })();
    return () => { cancelled = true; };
  }, [currentAdapterType, currentAdapterBaseUrl]);

  // Removed handleNewChat - using handleNewChatAndClose instead
  
  // Memoized click handlers
  const handleThemeClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);
  
  const handleSettingsClick = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);
  
  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
  }, []);
  
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      // When opening on mobile (< lg), ensure sidebar is expanded
      if (next && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarCollapsed(false);
      }
      return next;
    });
  }, []);
  
  const handleSidebarCollapse = useCallback(() => {
    // On mobile (< lg), closing should hide the sidebar entirely
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
      return;
    }
    // Desktop: toggle collapsed width
    setSidebarCollapsed(prev => !prev);
  }, []);
  
  const handleMobileSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  
  // Memoized sidebar event handlers
  const handleChatSelected = useCallback((chatId: string) => {
    sidebarActions.setActiveChat(chatId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  }, [sidebarActions]);

  const handleNewChatAndClose = useCallback(() => {
    const newChatId = sidebarActions.createChat('New Conversation');
    sidebarActions.setActiveChat(newChatId);
    setSidebarOpen(false); // Close sidebar on mobile after creating new chat
  }, [sidebarActions]);
  
  // Handle share button click
  const handleShareClick = useCallback(async () => {
    // Block UI interactions while capturing
    setIsCapturing(true);
    try {
      const result = await captureConversationScreenshot({
        width: 800,
        pixelRatio: 2,
      });
      // Store blob and create an object URL for fast preview
      try {
        const url = URL.createObjectURL(result.blob);
        setScreenshotBlob(result.blob);
        setScreenshotUrl(url);
      } catch (e) {
        // Fallback to dataUrl only if object URL creation fails
        setScreenshotBlob(result.blob);
        setScreenshotUrl(result.dataUrl);
      }
      setShowShareModal(true);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to capture screenshot. Please try again.'
      );
    } finally {
      setIsCapturing(false);
    }
  }, []);
  
  // Handle share message pair (current message + previous message)
  const handleMessagePairCapture = useCallback(async (messageId: string) => {
    // Block UI interactions while capturing
    setIsCapturing(true);
    try {
      const result = await captureConversationScreenshot({
        width: 800,
        pixelRatio: 2,
        selection: {
          mode: 'window',
          anchorMessageId: messageId,
          beforeCount: 1, // Capture the previous message
          afterCount: 0,  // Only capture up to the anchor message
          allowPartial: true, // Allow capture even if there's no previous message
        },
        paddingTop: 16,    // Add padding for visual spacing
        paddingBottom: 16,
      });
      // Store blob and create an object URL for fast preview
      try {
        const url = URL.createObjectURL(result.blob);
        setScreenshotBlob(result.blob);
        setScreenshotUrl(url);
      } catch (e) {
        // Fallback to dataUrl only if object URL creation fails
        setScreenshotBlob(result.blob);
        setScreenshotUrl(result.dataUrl);
      }
      setShowShareModal(true);
    } catch (error) {
      console.error('Error capturing message pair:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to capture message pair. Please try again.'
      );
    } finally {
      setIsCapturing(false);
    }
  }, []);
  
  const handleShareModalClose = useCallback(() => {
    setShowShareModal(false);
    if (screenshotUrl && screenshotUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(screenshotUrl); } catch {}
    }
    setScreenshotUrl('');
    setScreenshotBlob(null);
  }, []);
  
  return (
    <div
      className={`flex flex-col h-screen w-screen bg-bg-primary ${getTextureClass()} text-text-primary relative overflow-hidden`}
      aria-busy={isCapturing}
      {...(isCapturing ? { inert: '' as any } : {})}
    >
      {/* Header bar with title and controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border-primary z-sticky">
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile */}
          <button 
            onClick={handleSidebarToggle}
            className="lg:hidden flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Toggle sidebar"
            disabled={isCapturing}
          >
            {sidebarOpen ? <FaTimes className="relative z-10" /> : <FaBars className="relative z-10" />}
          </button>
          
          <h1 className="text-xl font-semibold text-text-primary transition-opacity duration-200 select-none">
            Chat UI
          </h1>
        </div>
        
        {/* Theme toggle, share, and settings */}
        <div className="flex gap-2">
          <button 
            onClick={handleShareClick} 
            className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Share conversation"
            title="Share conversation"
            disabled={isCapturing}
          >
            <FaShareAlt className="relative z-10" />
          </button>
          
          <button 
            onClick={handleThemeClick} 
            className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            disabled={isCapturing}
          >
            {theme === 'light' ? <FaMoon className="relative z-10" /> : <FaSun className="relative z-10" />}
          </button>
          
          <button 
            onClick={handleSettingsClick} 
            className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Open settings"
            disabled={isCapturing}
          >
            <FaCog className="relative z-10" />
          </button>
        </div>
      </div>
      
      {/* Settings modal - only show on narrow screens */}
      {showSettings && !isWideScreen && (
        <Settings 
          onClose={handleSettingsClose}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
          isSidebar={false}
        />
      )}
      
      {/* Toast container for notifications */}
      <ToastContainer />
      
      {/* Share modal */}
      {showShareModal && screenshotUrl && (
        <ShareModal 
          imageUrl={screenshotUrl}
          screenshotBlob={screenshotBlob || undefined}
          onClose={handleShareModalClose}
        />
      )}
      
      {/* Main app container */}
      <div className="flex flex-1 overflow-hidden w-full relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-modal"
            onClick={handleMobileSidebarClose}
          />
        )}
        
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-modal lg:z-auto transition-transform duration-300 ease-in-out lg:block`}>
          <ErrorBoundary>
            <Sidebar
              chats={sidebarData.chatSessions}
              activeChatId={sidebarData.activeChatId}
              onChatSelected={handleChatSelected}
              onNewChat={handleNewChatAndClose}
              onDeleteChat={sidebarActions.deleteChat}
              onClearAllChats={sidebarActions.clearAllChats}
              collapsed={sidebarCollapsed}
              onCollapse={handleSidebarCollapse}
            />
          </ErrorBoundary>
        </div>
        
        {/* Chat content */}
        <div className="flex-1 overflow-hidden w-full lg:w-auto">
          <ErrorBoundary>
            <ChatInterface 
              selectedResponseMode={selectedResponseMode} 
              onMessagePairCapture={handleMessagePairCapture}
            />
          </ErrorBoundary>
        </div>
        
        {/* Settings sidebar - animated container for wide screens */}
        {isWideScreen && (
          <div 
            className={`${showSettings ? 'w-[400px] opacity-100' : 'w-0 opacity-0'} overflow-hidden transition-all duration-300 ease-in-out`}
          >
            {showSettings && (
              <Settings 
                onClose={() => setShowSettings(false)}
                selectedResponseMode={selectedResponseMode}
                onResponseModeChange={setSelectedResponseMode}
                isSidebar={true}
              />
            )}
          </div>
        )}
      </div>

      {/* Global capture overlay to disable all UI */}
      {isCapturing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9998] cursor-wait">
          <div className="px-6 py-4 rounded-lg bg-bg-elevated border border-border-primary shadow-lg">
            <LoadingIndicator size="large" type="spinner" text="Capturing… Please wait" />
          </div>
        </div>
      )}
    </div>
  );
};

export default App; 
