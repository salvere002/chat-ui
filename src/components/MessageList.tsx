import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types/chat';
import './MessageList.css';
import { useChat } from '../contexts/ChatContext';

interface MessageListProps {
  messages: Message[];
}

// Loading skeleton for messages
const MessageSkeleton: React.FC<{ count: number }> = ({ count }) => {
  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <div key={index} className={`message-item ${index % 2 === 0 ? 'user' : 'ai'}`}>
          <div className={`message-content skeleton-message ${index % 2 === 0 ? 'user' : 'ai'}`}>
            <div className="skeleton skeleton-line" style={{ width: `${Math.random() * 40 + 60}%`, height: '12px' }}></div>
            <div className="skeleton skeleton-line" style={{ width: `${Math.random() * 30 + 40}%`, height: '12px' }}></div>
            {index % 2 !== 0 && Math.random() > 0.5 && (
              <div className="skeleton skeleton-line" style={{ width: `${Math.random() * 20 + 20}%`, height: '12px' }}></div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeChatId, updateMessageInChat, regenerateResponse } = useChat();
  
  // Remove the loading state for empty chats
  // const isLoading = activeChatId && messages.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll whenever messages change

  // Handle regenerating response
  const handleRegenerateResponse = (aiMessageId: string) => {
    if (!activeChatId) return;
    
    // Find the AI message and the preceding user message
    const aiMessageIndex = messages.findIndex(msg => msg.id === aiMessageId);
    if (aiMessageIndex <= 0) return; // No valid index or no preceding message
    
    const userMessage = messages[aiMessageIndex - 1];
    if (userMessage.sender !== 'user') return; // Ensure it's really a user message
    
    // Call the regenerate function from context
    regenerateResponse(activeChatId, aiMessageId, userMessage);
  };

  // Handle editing a user message
  const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeChatId) return;
    
    // Find message index in the array
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex < 0) return;
    
    // Update the message
    updateMessageInChat(activeChatId, messageId, { text: newText }, true);
    
    // If there's a following AI message response, regenerate it
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].sender === 'ai') {
      const aiMessageId = messages[messageIndex + 1].id;
      
      // Call regenerate for the AI message
      regenerateResponse(activeChatId, aiMessageId, {
        ...messages[messageIndex],
        text: newText
      });
    }
  };

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          onRegenerateResponse={msg.sender === 'ai' ? () => handleRegenerateResponse(msg.id) : undefined}
          onEditMessage={msg.sender === 'user' ? handleEditMessage : undefined}
        />
      ))}
      <div ref={messagesEndRef} /> {/* Element to scroll to */}
    </div>
  );
};

export default MessageList; 