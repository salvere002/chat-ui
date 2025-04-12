import React, { useState } from 'react'; // Import useState
import ChatInterface from './components/ChatInterface'; // Import the main chat component
// import ChatList from './components/ChatList'; // Import the new ChatList component - NO LONGER NEEDED HERE
import Sidebar from './components/Sidebar'; // Import the new Sidebar component
import { ChatProvider } from './contexts/ChatContext'; // Import the ChatProvider
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Import ThemeProvider
import { ToastProvider } from './contexts/ToastContext'; // Import ToastProvider
import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary
import { FaSun, FaMoon } from 'react-icons/fa'; // Import icons
import { useChat } from './contexts/ChatContext';
import { Agent } from './types/chat';
import './App.css'; // Add App specific styles later if needed

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme(); // Use the theme hook
  // State for the selected agent type - Keep this local to App/AppContent
  const [selectedAgent, setSelectedAgent] = useState<Agent>('stream');
  
  // Get chat state and handlers from the CONTEXT hook
  const {
    chatSessions, // Use chatSessions from context
    activeChatId,
    setActiveChat,
    createChat,
    deleteChat
  } = useChat(); // No need to pass agent here
  
  // Handler for creating a new chat
  const handleNewChat = () => {
    // createChat from context updates context state and returns the new ID
    const newChatId = createChat('New Conversation'); 
    setActiveChat(newChatId); // Set the new chat active using context's setter
  };
  
  return (
    <div className={`app ${theme}-theme`}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} className="theme-toggle-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
        {theme === 'light' ? <FaMoon /> : <FaSun />}
      </button>
      
      {/* Main app container */}
      <div className="app-container">
        <ErrorBoundary>
          <Sidebar
            chats={chatSessions} // Pass chatSessions from context as chats prop
            activeChatId={activeChatId}
            onChatSelected={setActiveChat}
            onNewChat={handleNewChat}
            onDeleteChat={deleteChat}
            selectedAgent={selectedAgent}
            onAgentChange={(agent) => setSelectedAgent(agent)}
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
}

// Main App component now just sets up the provider
const App: React.FC = () => {
  return (
    // Wrap everything with providers
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App; 