import React, { useEffect, useState } from 'react';
import { Chat } from '../types/chat';
import { useChatStore } from '../stores';
import './Sidebar.css';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelected: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onChatSelected,
  onNewChat,
  onDeleteChat
}) => {
  const { renameChatSession } = useChatStore();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  
  // Function to format the chat title or generate a default one
  const getChatTitle = (chat: Chat, index: number) => {
    // Check title first
    if (chat.title && chat.title.trim() !== '') {
      return chat.title;
    }
    
    // Then check name for backward compatibility
    if (chat.name && chat.name.trim() !== '') {
      return chat.name;
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
  
  // Start editing a chat title
  const startEditing = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    // Use the display title for editing
    const displayTitle = getChatTitle(chat, chats.indexOf(chat));
    setEditingChatName(displayTitle);
  };
  
  // Save the edited chat title
  const saveEditedName = () => {
    if (editingChatId && editingChatName.trim() !== '') {
      renameChatSession(editingChatId, editingChatName);
      setEditingChatId(null);
      setEditingChatName('');
    }
  };
  
  // Handle Enter key to save and Escape key to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditedName();
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
      setEditingChatName('');
    }
  };
  
  // Handle input blur to save changes
  const handleBlur = () => {
    saveEditedName();
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
                {editingChatId === chat.id ? (
                  <div className="chat-item-edit">
                    <input
                      type="text"
                      value={editingChatName}
                      onChange={(e) => setEditingChatName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleBlur}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="chat-title-input"
                    />
                  </div>
                ) : (
                  <>
                    <div 
                      className="chat-item-title"
                      onDoubleClick={(e) => startEditing(chat, e)}
                    >
                      {getChatTitle(chat, index)}
                    </div>
                    <div className="chat-item-date">
                      {formatDate(chat.updatedAt)}
                    </div>
                  </>
                )}
              </div>
              <div className="chat-item-actions">
                {editingChatId !== chat.id && (
                  <button 
                    className="edit-chat-button"
                    onClick={(e) => startEditing(chat, e)}
                    aria-label="Edit chat name"
                  >
                    ✎
                  </button>
                )}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar; 