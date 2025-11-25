import React, { useState, useCallback, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import { ToastContainer } from './components/Toast';
import { useThemeStore, useResponseModeStore, useChatStore, useServiceConfigStore, useMcpStore } from './stores';
import { getMcpConfigViaAdapter, isMcpConfigSupported } from './services/mcpConfigService';
import { useShallow } from 'zustand/react/shallow';
import Settings from './components/Settings';

const App: React.FC = () => {
  // Use the theme store
  const { theme, toggleTheme } = useThemeStore();


  // Use selective subscriptions for sidebar-specific data
  const sidebarData = useChatStore(useShallow(state => ({
    chatSessions: state.chatSessions,
    activeChatId: state.activeChatId
  })));

  const sidebarActions = useChatStore(useShallow(state => ({
    selectChat: state.selectChat,
    createChat: state.createChat,
    deleteChat: state.deleteChat,
    clearAllChats: state.clearAllChats
  })));

  // Use the response mode store for response mode selection
  const { selectedResponseMode, setSelectedResponseMode } = useResponseModeStore();

  // State for settings modal
  const [showSettings, setShowSettings] = useState(false);
  // Track window width once and derive responsive flags
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isLargeScreen = windowWidth >= 1024;

  // State for mobile sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for sidebar collapse/expand (desktop only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Service initialization is handled automatically by serviceConfigStore

  // Handle window resize for responsive settings
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
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
    setShowSettings(true);
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
    // Use high-level selection API that also lazy-loads details when needed
    sidebarActions.selectChat(chatId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  }, [sidebarActions]);

  const handleNewChatAndClose = useCallback(() => {
    const newChatId = sidebarActions.createChat('New Conversation');
    // New chats are already fully loaded; selectChat will just mark active
    sidebarActions.selectChat(newChatId);
    setSidebarOpen(false); // Close sidebar on mobile after creating new chat
  }, [sidebarActions]);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary text-text-primary relative overflow-hidden">
      {/* Navigation bar */}
      <NavBar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={handleSidebarToggle}
        theme={theme}
        onThemeToggle={handleThemeClick}
        onShareClick={() => {}} // Placeholder - share functionality not in main branch
        onSettingsClick={handleSettingsClick}
      />

      {/* Settings modal */}
      {showSettings && (
        <Settings
          onClose={handleSettingsClose}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
        />
      )}

      {/* Toast container for notifications */}
      <ToastContainer />

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
        <div
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-modal lg:z-auto transition-transform duration-300 ease-in-out lg:block`}
          style={!isLargeScreen ? { top: 0, left: 0 } : undefined}
        >
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
              maxHeight={!isLargeScreen ? 'calc(100vh - 80px)' : undefined}
              isVisible={isLargeScreen || sidebarOpen}
            />
          </ErrorBoundary>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden w-full lg:w-auto @container">
          <ErrorBoundary>
            <ChatInterface selectedResponseMode={selectedResponseMode} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default App;
