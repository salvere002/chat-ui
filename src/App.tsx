import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { FaSun, FaMoon, FaCog } from 'react-icons/fa';
import { ToastContainer } from './components/Toast';
import { useThemeStore, useChatStore, useAgentStore } from './stores';
import Settings from './components/Settings';
import './App.css';

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
  
  // Use the agent store for agent selection
  const { selectedAgent, setSelectedAgent } = useAgentStore();
  
  // State for settings modal
  const [showSettings, setShowSettings] = useState(false);
  
  // Handler for creating a new chat
  const handleNewChat = () => {
    const newChatId = createChat('New Conversation');
    setActiveChat(newChatId);
  };
  
  return (
    <div className={`app ${theme}-theme`}>
      {/* App title */}
      <h1 className="chat-title">Chat UI</h1>
      
      {/* Theme toggle and settings */}
      <div className="app-header-controls">
        <button 
          onClick={toggleTheme} 
          className="icon-button" 
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
        
        <button 
          onClick={() => setShowSettings(true)} 
          className="icon-button" 
          aria-label="Open settings"
        >
          <FaCog />
        </button>
      </div>
      
      {/* Settings modal */}
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
        />
      )}
      
      {/* Toast container for notifications */}
      <ToastContainer />
      
      {/* Main app container */}
      <div className="app-container">
        <ErrorBoundary>
          <Sidebar
            chats={chatSessions}
            activeChatId={activeChatId}
            onChatSelected={setActiveChat}
            onNewChat={handleNewChat}
            onDeleteChat={deleteChat}
          />
        </ErrorBoundary>
        
        <div className="chat-area">
          <ErrorBoundary>
            <ChatInterface selectedAgent={selectedAgent} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default App; 