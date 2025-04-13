import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types/chat';
import './MessageList.css';
import { useChatStore } from '../stores';

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
  const { activeChatId, updateMessageInChat } = useChatStore();
  
  // Remove the loading state for empty chats
  // const isLoading = activeChatId && messages.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll whenever messages change

  // Handle regenerating response
  const handleRegenerateResponse = (userMessageId: string) => {
    if (!activeChatId) return;
    
    // Find the user message and the following AI message (if any)
    const userMessageIndex = messages.findIndex(msg => msg.id === userMessageId);
    if (userMessageIndex < 0 || userMessageIndex >= messages.length - 1) return; // No valid index or no following message
    
    const aiMessage = messages[userMessageIndex + 1];
    if (aiMessage.sender !== 'ai') return; // Ensure it's really an AI message
    
    // Mark the AI message as regenerating
    updateMessageInChat(activeChatId, aiMessage.id, { 
      text: "Regenerating response...",
      isComplete: false 
    });
    
    // Normally we would call an API to regenerate the message here
    // For now, we'll just simulate a regeneration with a timeout
    setTimeout(() => {
      updateMessageInChat(activeChatId, aiMessage.id, { 
        text: "This is a regenerated response for your message.",
        isComplete: true 
      });
    }, 1000);
  };

  // Handle editing a user message
  const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeChatId) return;
    
    // Find message index in the array
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex < 0) return;
    
    // Update the message
    updateMessageInChat(activeChatId, messageId, { text: newText });
    
    // If there's a following AI message response, regenerate it
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].sender === 'ai') {
      const aiMessageId = messages[messageIndex + 1].id;
      
      // Mark the AI message as regenerating
      updateMessageInChat(activeChatId, aiMessageId, { 
        text: "Regenerating response based on edited message...",
        isComplete: false 
      });
      
      // Normally we would call an API to regenerate the message here
      // For now, we'll just simulate a regeneration with a timeout
      setTimeout(() => {
        updateMessageInChat(activeChatId, aiMessageId, { 
          text: "This is a response to your edited message.",
          isComplete: true 
        });
      }, 1000);
    }
  };

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <MessageItem 
          key={msg.id} 
          message={msg} 
          onRegenerateResponse={
            msg.sender === 'user' && 
            index < messages.length - 1 && 
            messages[index + 1].sender === 'ai' 
              ? () => handleRegenerateResponse(msg.id) 
              : undefined
          }
          onEditMessage={msg.sender === 'user' ? handleEditMessage : undefined}
        />
      ))}
      <div ref={messagesEndRef} /> {/* Element to scroll to */}
    </div>
  );
};

export default MessageList; 