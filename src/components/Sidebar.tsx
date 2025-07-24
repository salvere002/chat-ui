import React, { useState } from 'react';
import { Chat } from '../types/chat';
import { useChatStore } from '../stores';

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
    <div className="flex flex-col w-[280px] sm:w-[300px] lg:w-[280px] h-full bg-bg-secondary border-r border-border-primary flex-shrink-0 overflow-hidden transition-all duration-200">
      <div className="flex items-center justify-between p-4 bg-bg-secondary border-b border-border-primary">
        <h2 className="text-lg font-semibold text-text-primary m-0">Conversations</h2>
        <button 
          className="flex items-center gap-1 px-3 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]" 
          onClick={onNewChat}
          aria-label="Start new chat"
        >
          <span className="text-lg leading-none">+</span> New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {chats.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-6 text-text-tertiary text-sm text-center opacity-80">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          chats.map((chat, index) => (
            <div 
              key={chat.id}
              className={`group flex items-center gap-3 p-3 mb-2 bg-bg-primary border border-transparent rounded-md cursor-pointer transition-all duration-150 relative overflow-hidden hover:bg-bg-tertiary hover:border-border-secondary hover:translate-x-0.5 ${
                chat.id === activeChatId ? 'bg-accent-light border-accent-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-accent-primary' : ''
              }`}
              onClick={() => onChatSelected(chat.id)}
            >
              <div className="flex-1 min-w-0">
                {editingChatId === chat.id ? (
                  <div className="w-full">
                    <input
                      type="text"
                      value={editingChatName}
                      onChange={(e) => setEditingChatName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleBlur}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full px-2 py-1 bg-bg-primary text-text-primary border border-border-focus rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-light"
                    />
                  </div>
                ) : (
                  <>
                    <div 
                      className="text-sm font-medium text-text-primary truncate leading-tight cursor-pointer"
                      onDoubleClick={(e) => startEditing(chat, e)}
                    >
                      {getChatTitle(chat, index)}
                    </div>
                    <div className="text-xs text-text-tertiary mt-1 leading-tight">
                      {formatDate(chat.updatedAt)}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {editingChatId !== chat.id && (
                  <button 
                    className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-none rounded text-text-tertiary cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-accent-primary active:scale-90"
                    onClick={(e) => startEditing(chat, e)}
                    aria-label="Edit chat name"
                  >
                    ✎
                  </button>
                )}
                <button 
                  className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-none rounded text-text-tertiary cursor-pointer transition-all duration-150 hover:bg-error hover:text-text-inverse active:scale-90"
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