import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { FaSun, FaMoon, FaCog } from 'react-icons/fa';
import { ToastContainer } from './components/Toast';
import { useThemeStore, useChatStore, useResponseModeStore } from './stores';
import Settings from './components/Settings';

const App: React.FC = () => {
  // Use the theme store
  const { theme, toggleTheme } = useThemeStore();
  
  
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
    setShowSettings(true);
  };
  
  return (
    <div className={`flex flex-col h-screen w-screen bg-bg-primary text-text-primary relative overflow-hidden ${theme}-theme`}>
      {/* App title */}
      <h1 className="absolute top-4 left-[300px] text-xl font-semibold text-text-primary z-sticky transition-opacity duration-200 select-none">
        Chat UI
      </h1>
      
      {/* Theme toggle and settings */}
      <div className="fixed top-4 right-4 flex gap-2 z-sticky bg-bg-elevated p-2 rounded-lg shadow-md border border-border-secondary transition-all duration-200 hover:shadow-lg hover:-translate-y-px">
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
      
      {/* Settings modal */}
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
        />
      )}
      
      {/* Toast container for notifications */}
      <ToastContainer />
      
      {/* Main app container */}
      <div className="flex flex-1 overflow-hidden w-full h-full">
        <ErrorBoundary>
          <Sidebar
            chats={chatSessions}
            activeChatId={activeChatId}
            onChatSelected={setActiveChat}
            onNewChat={handleNewChat}
            onDeleteChat={deleteChat}
          />
        </ErrorBoundary>
        
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <ChatInterface selectedResponseMode={selectedResponseMode} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default App; 