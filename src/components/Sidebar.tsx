import React, { useEffect, useState } from 'react';
import { Chat, Agent } from '../types/chat';
import './Sidebar.css';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelected: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  selectedAgent: Agent;
  onAgentChange: (agent: Agent) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onChatSelected,
  onNewChat,
  onDeleteChat,
  selectedAgent,
  onAgentChange
}) => {
  // Function to format the chat title or generate a default one
  const getChatTitle = (chat: Chat, index: number) => {
    if (chat.title && chat.title.trim() !== '') {
      return chat.title;
    }
    
    // Get the first user message, if any
    const firstUserMessage = chat.messages.find(msg => msg.sender === 'user');
    if (firstUserMessage && firstUserMessage.text) {
      // Truncate to first 30 chars if needed
      const text = firstUserMessage.text.trim();
      return text.length > 30 ? text.substring(0, 27) + '...' : text;
    }
    
    // Fallback to a default name
    return `Chat ${chats.length - index}`;
  };
  
  // Format the date to a readable string
  const formatDate = (date: Date) => {
    const today = new Date();
    const chatDate = new Date(date);
    
    // Check if the date is today
    if (
      chatDate.getDate() === today.getDate() &&
      chatDate.getMonth() === today.getMonth() &&
      chatDate.getFullYear() === today.getFullYear()
    ) {
      return chatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if the date is yesterday
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (
      chatDate.getDate() === yesterday.getDate() &&
      chatDate.getMonth() === yesterday.getMonth() &&
      chatDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }
    
    // Otherwise show the date
    return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="sidebar">
      {/* Agent Selector */}
      <div className="agent-selector">
        <label htmlFor="agent-select">Response Mode:</label>
        <select
          id="agent-select"
          value={selectedAgent}
          onChange={(e) => onAgentChange(e.target.value as Agent)}
          className="agent-select-dropdown"
        >
          <option value="stream">Stream</option>
          <option value="fetch">Fetch</option>
        </select>
      </div>
      
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button 
          className="new-chat-button sidebar-new-chat" 
          onClick={onNewChat}
          aria-label="Start new chat"
        >
          <span>+</span> New Chat
        </button>
      </div>
      
      <div className="chat-list">
        {chats.length === 0 ? (
          <div className="no-chats-message">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          chats.map((chat, index) => (
            <div 
              key={chat.id}
              className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
              onClick={() => onChatSelected(chat.id)}
            >
              <div className="chat-item-content">
                <div className="chat-item-title">
                  {getChatTitle(chat, index)}
                </div>
                <div className="chat-item-date">
                  {formatDate(chat.updatedAt)}
                </div>
              </div>
              <button 
                className="delete-chat-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                aria-label="Delete chat"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar; 