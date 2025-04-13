import React from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { FaSun, FaMoon } from 'react-icons/fa';
import { ToastContainer } from './components/Toast';
import { useThemeStore, useChatStore, useAgentStore } from './stores';
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
  
  // Handler for creating a new chat
  const handleNewChat = () => {
    const newChatId = createChat('New Conversation');
    setActiveChat(newChatId);
  };
  
  return (
    <div className={`app ${theme}-theme`}>
      {/* Theme toggle */}
      <button 
        onClick={toggleTheme} 
        className="theme-toggle-button" 
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <FaMoon /> : <FaSun />}
      </button>
      
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
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
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