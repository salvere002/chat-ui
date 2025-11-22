import React from 'react';
import { useChatStore } from '../stores';

const ChatList: React.FC = () => {
  const { chatSessions, activeChatId, selectChat, createChat, deleteChat } = useChatStore();

  const handleCreateChat = () => {
    const newChatId = createChat();
    // Use selectChat so any future lazy-load behavior is consistent
    selectChat(newChatId);
  };

  const handleDeleteChat = (
    e: React.MouseEvent<HTMLButtonElement>,
    chatId: string
  ) => {
    e.stopPropagation(); // Prevent the click from selecting the chat
    // Optional: Add a confirmation dialog here
    deleteChat(chatId);
  };

  return (
    <div className="chat-list-container">
      <button onClick={handleCreateChat} className="new-chat-button">
        + New Chat
      </button>
      <ul className="chat-list">
        {chatSessions.map((chat) => (
          <li
            key={chat.id}
            className={`chat-list-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => selectChat(chat.id)}
          >
            <span className="chat-name">{chat.name || chat.title}</span>
            <button
              className="delete-chat-button"
              onClick={(e) => handleDeleteChat(e, chat.id)}
              aria-label={`Delete chat ${chat.name || chat.title}`}
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList; 
