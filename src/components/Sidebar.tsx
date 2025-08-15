import React, { useState } from 'react';
import { Chat } from '../types/chat';
import { useChatStore } from '../stores';
import { FaBars, FaPlus } from 'react-icons/fa';
import { HiOutlineBars3BottomLeft, HiOutlineBars3 } from 'react-icons/hi2';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelected: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onClearAllChats: () => void;
  collapsed: boolean;
  onCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onChatSelected,
  onNewChat,
  onDeleteChat,
  onClearAllChats,
  collapsed,
  onCollapse
}) => {
  const { renameChatSession } = useChatStore();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  
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
  
  // Handle clear all conversations - show confirmation modal
  const handleClearAll = () => {
    setShowClearModal(true);
  };

  // Confirm clear all conversations
  const confirmClearAll = () => {
    onClearAllChats();
    setShowClearModal(false);
  };

  // Cancel clear all
  const cancelClearAll = () => {
    setShowClearModal(false);
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
    <>
    <div className={`flex flex-col ${collapsed ? 'w-[60px]' : 'w-[280px] sm:w-[300px] lg:w-[280px]'} h-full bg-bg-secondary border-r border-border-primary flex-shrink-0 transition-all duration-300 ease-in-out`}>
      <div className={`w-full h-full overflow-hidden ${collapsed ? '' : 'min-w-[280px]'}`}>
      <div className="bg-bg-secondary border-b border-border-primary border-r border-border-primary">
        {collapsed ? (
          /* Collapsed state - simple centered layout */
          <div className="flex flex-col items-center p-4 gap-2">
            <button 
              className="flex items-center justify-center w-8 h-8 p-0 bg-transparent text-text-tertiary border-none rounded-md cursor-e-resize transition-all duration-150 hover:bg-bg-tertiary hover:text-accent-primary active:scale-[0.98]" 
              onClick={onCollapse}
              aria-label="Expand sidebar"
              title="Expand Sidebar"
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </button>
            <button 
              className="flex items-center justify-center w-8 h-8 p-0 bg-accent-primary text-text-inverse border-none rounded-md text-sm cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]" 
              onClick={onNewChat}
              aria-label="Start new chat"
              title="New Chat"
            >
              <FaPlus />
            </button>
          </div>
        ) : (
          /* Expanded state - always render in final format, let width reveal it */
          <div className="p-4">
            <div className="w-[248px] flex flex-col gap-3">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-semibold text-text-primary m-0 whitespace-nowrap">Conversations</h2>
                <button 
                  className="flex items-center justify-center w-8 h-8 p-0 bg-transparent text-text-tertiary border-none rounded-md cursor-w-resize transition-all duration-150 hover:bg-bg-tertiary hover:text-accent-primary active:scale-[0.98] flex-shrink-0"
                  onClick={onCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse Sidebar"
                >
                  <HiOutlineBars3BottomLeft className="w-5 h-5" />
                </button>
              </div>
              <button 
                className="flex items-center justify-center gap-2 px-3 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 w-full hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98] whitespace-nowrap"
                onClick={onNewChat}
                aria-label="Start new chat"
              >
                <FaPlus className="text-sm flex-shrink-0" /> <span>New Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 border-r border-border-primary min-h-0 flex flex-col">
        {collapsed ? (
          // Collapsed state - hide chat list
          null
        ) : (
          // Expanded state - show full chat list
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 min-h-0" style={{maxHeight: 'calc(100vh - 200px)'}}>
            <div className="min-w-[240px] w-full">
              {chats.length === 0 ? (
                <div className="flex items-center justify-center px-4 py-6 text-text-tertiary text-sm text-center opacity-80 min-w-[200px]">
                  <span className="leading-relaxed">
                    No conversations yet. Start a new chat!
                  </span>
                </div>
              ) : (
                chats.map((chat, index) => (
          <div 
            key={chat.id}
            className={`group flex items-center gap-3 p-3 mb-2 bg-bg-elevated border border-transparent rounded-md cursor-pointer transition-all duration-150 relative overflow-hidden hover:bg-bg-tertiary hover:border-border-secondary hover:translate-x-0.5 min-w-[220px] ${
              chat.id === activeChatId ? 'bg-accent-light border-accent-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-accent-primary' : ''
            }`}
            onClick={() => onChatSelected(chat.id)}
          >
              <div className="flex-1 min-w-0 max-w-[180px]">
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
                      className="w-full px-2 py-1 bg-bg-elevated text-text-primary border border-border-focus rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-light"
                    />
                  </div>
                ) : (
                  <>
                    <div 
                      className="text-sm font-medium text-text-primary truncate leading-tight cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                      onDoubleClick={(e) => startEditing(chat, e)}
                    >
                      {getChatTitle(chat, index)}
                    </div>
                    <div className="text-xs text-text-tertiary mt-1 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
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
        )}
      </div>
      
      {/* Clear All Button - Footer */}
      {!collapsed && chats.length > 0 && (
        <div className="border-r border-border-primary p-3 bg-bg-secondary">
          <button
            onClick={handleClearAll}
            className="w-full px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 flex items-center justify-center gap-2 bg-transparent text-text-tertiary border border-border-primary hover:bg-bg-tertiary hover:text-error hover:border-error"
            title="Clear all conversations"
          >
            🗑️ Clear All
          </button>
        </div>
      )}
      </div>
    </div>

    {/* Confirmation Modal */}
    {showClearModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-tooltip p-4 animate-fade-in">
        <div className="bg-bg-elevated rounded-lg w-full max-w-[400px] shadow-lg flex flex-col animate-slide-up">
          <div className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-primary rounded-t-lg">
            <h3 className="text-lg font-semibold text-text-primary m-0">Clear All Conversations</h3>
          </div>
          
          <div className="p-6">
            <p className="text-text-secondary mb-6 leading-relaxed">
              Are you sure you want to delete all conversations? This action cannot be undone and will permanently remove all your chat history.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={cancelClearAll}
                className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClearAll}
                className="px-4 py-2 bg-error text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-red-600 hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Sidebar; 