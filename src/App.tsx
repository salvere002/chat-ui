import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { FaSun, FaMoon, FaCog, FaBars, FaTimes } from 'react-icons/fa';
import { ToastContainer } from './components/Toast';
import { useThemeStore, useChatStore, useResponseModeStore } from './stores';
import useServiceConfigStore from './stores/serviceConfigStore';
import Settings from './components/Settings';

const App: React.FC = () => {
  // Use the theme store
  const { theme, toggleTheme } = useThemeStore();
  
  // Use the service config store and ensure initialization
  const { getCurrentConfig } = useServiceConfigStore();
  
  // Use the chat store for chat state management
  const {
    chatSessions,
    activeChatId,
    setActiveChat,
    createChat,
    deleteChat
  } = useChatStore();
  
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
  
  // Initialize the service on app load
  useEffect(() => {
    const initializeService = async () => {
      try {
        const config = getCurrentConfig();
        const { ChatService } = await import('./services/chatService');
        ChatService.configure({
          adapterType: config.adapterType,
          baseUrl: config.baseUrl,
          sessionEndpoint: config.sessionEndpoint
        });
      } catch (error) {
        console.error('Failed to initialize chat service:', error);
      }
    };

    initializeService();
  }, [getCurrentConfig]);

  // Handle window resize for responsive settings
  useEffect(() => {
    const handleResize = () => {
      const newIsWideScreen = window.innerWidth >= 1280;
      setIsWideScreen(newIsWideScreen);
      
      // Keep settings open, just switch styles - no auto-close
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Handler for creating a new chat
  const handleNewChat = () => {
    const newChatId = createChat('New Conversation');
    setActiveChat(newChatId);
  };
  
  // Click handlers
  const handleThemeClick = () => {
    toggleTheme();
  };
  
  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };
  
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <div className={`flex flex-col h-screen w-screen bg-bg-primary text-text-primary relative overflow-hidden ${theme}-theme`}>
      {/* Header bar with title and controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border-primary z-sticky">
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile */}
          <button 
            onClick={handleSidebarToggle}
            className="lg:hidden flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <FaTimes className="relative z-10" /> : <FaBars className="relative z-10" />}
          </button>
          
          <h1 className="text-xl font-semibold text-text-primary transition-opacity duration-200 select-none">
            Chat UI
          </h1>
        </div>
        
        {/* Theme toggle and settings */}
        <div className="flex gap-2">
          <button 
            onClick={handleThemeClick} 
            className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <FaMoon className="relative z-10" /> : <FaSun className="relative z-10" />}
          </button>
          
          <button 
            onClick={handleSettingsClick} 
            className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2"
            aria-label="Open settings"
          >
            <FaCog className="relative z-10" />
          </button>
        </div>
      </div>
      
      {/* Settings modal - only show on narrow screens */}
      {showSettings && !isWideScreen && (
        <Settings 
          onClose={() => setShowSettings(false)}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
          isSidebar={false}
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
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-modal lg:z-auto transition-transform duration-300 ease-in-out lg:block`}>
          <ErrorBoundary>
            <Sidebar
              chats={chatSessions}
              activeChatId={activeChatId}
              onChatSelected={(chatId) => {
                setActiveChat(chatId);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              onNewChat={() => {
                handleNewChat();
                setSidebarOpen(false); // Close sidebar on mobile after creating new chat
              }}
              onDeleteChat={deleteChat}
              collapsed={sidebarCollapsed}
              onCollapse={handleSidebarCollapse}
            />
          </ErrorBoundary>
        </div>
        
        {/* Chat content */}
        <div className="flex-1 overflow-hidden w-full lg:w-auto">
          <ErrorBoundary>
            <ChatInterface selectedResponseMode={selectedResponseMode} />
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
    </div>
  );
};

export default App; 