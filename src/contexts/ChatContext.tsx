/**
 * @deprecated This file is deprecated. Please use the Zustand store from src/stores/chatStore.ts instead.
 * The ChatContext was replaced with a Zustand store for better state management.
 * See STATE_MANAGEMENT.md for more information on the migration.
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Message } from '../types/chat'; // Import Message type from the correct location
import { sendStreamRequest, sendFetchRequest } from '../services/api'; // Import API services

// Define the structure for a chat session
export interface ChatSession {
  id: string;
  name: string;
  title?: string; // Make sure title is included
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the shape of the context value
interface ChatContextType {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  createChat: (name?: string) => string; // Returns the ID of the new chat
  setActiveChat: (id: string | null) => void;
  getChatById: (id: string) => ChatSession | undefined;
  addMessageToChat: (chatId: string, message: Message) => void;
  updateMessageInChat: (chatId: string, messageId: string, updates: Partial<Message>, replaceText?: boolean) => void;
  deleteChat: (id: string) => void; // Add deleteChat function
  regenerateResponse: (chatId: string, aiMessageId: string, userMessage: Message) => Promise<void>; // Add regenerate function
  renameChat: (chatId: string, newName: string) => void; // Add function to rename a chat
  // Add more functions as needed (renameChat, etc.)
}

// Create the context with a default undefined value
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Create the provider component
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Function to create a new chat session (add to the beginning)
  const createChat = (name?: string): string => {
    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date(); // Get current timestamp
    const newChat: ChatSession = {
      id: newChatId,
      name: name || `Chat ${chatSessions.length + 1}`, // Keep name for backward compatibility
      title: name || `Chat ${chatSessions.length + 1}`, // Use title for display
      messages: [],
      createdAt: now,
      updatedAt: now, // Set initial updatedAt
    };
    // Add the new chat to the beginning of the array
    setChatSessions(prev => [newChat, ...prev]);
    // setActiveChatId(newChatId); // Optionally make the new chat active immediately
    return newChatId;
  };

  // Function to get a specific chat session by its ID
  const getChatById = (id: string): ChatSession | undefined => {
    return chatSessions.find(chat => chat.id === id);
  };

  // Function to add a message to a specific chat
  const addMessageToChat = (chatId: string, message: Message) => {
    const now = new Date(); // Get current timestamp
    setChatSessions(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, message], updatedAt: now } // Update updatedAt
          : chat
      )
    );
  };

  // Function to update parts of an existing message in a specific chat (e.g., for streaming)
  const updateMessageInChat = (chatId: string, messageId: string, updates: Partial<Message>, replaceText = false) => {
    const now = new Date(); // Get current timestamp
    setChatSessions(prevSessions =>
      prevSessions.map(chat => {
        if (chat.id !== chatId) {
          return chat; // Not the chat we want to update
        }

        let messageUpdated = false; // Flag to check if the target message was found and updated
        const updatedMessages = chat.messages.map(msg => {
          if (msg.id === messageId) {
            messageUpdated = true;
            const updatedMsg = { ...msg };
            if (updates.text !== undefined) {
              // Either replace the entire text or append to existing text based on replaceText flag
              updatedMsg.text = replaceText ? updates.text : msg.text + updates.text;
            }
            if (updates.imageUrl !== undefined) {
              updatedMsg.imageUrl = updates.imageUrl;
            }
            if (updates.isComplete !== undefined) {
              updatedMsg.isComplete = updates.isComplete;
            }
            return updatedMsg;
          }
          return msg; // Return unmodified message
        });

        // Only update timestamp if the specific message was actually updated
        return messageUpdated ? { ...chat, messages: updatedMessages, updatedAt: now } : chat;
      })
    );
  };

  // Function to regenerate an AI response based on a user message
  const regenerateResponse = async (chatId: string, aiMessageId: string, userMessage: Message) => {
    // Find the chat
    const chat = getChatById(chatId);
    if (!chat) return;
    
    // Find the AI message to regenerate
    const aiMessageIndex = chat.messages.findIndex(msg => msg.id === aiMessageId);
    if (aiMessageIndex < 0) return;
    
    // Update the message to show loading state
    updateMessageInChat(chatId, aiMessageId, { 
      text: '', 
      isComplete: false 
    }, true);
    
    try {
      // Determine if we should use streaming
      const isStreamMessage = aiMessageId.includes('stream') || aiMessageId.includes('ai-');
      
      if (isStreamMessage) {
        // Handle streaming response
        await sendStreamRequest(
          userMessage.text || '', 
          userMessage.files || [],
          {
            onChunk: (chunk) => {
              // Update the message with each new chunk
              updateMessageInChat(chatId, aiMessageId, {
                text: chunk.text || '',
                imageUrl: chunk.imageUrl
              });
            },
            onComplete: () => {
              // Mark the message as complete when done
              updateMessageInChat(chatId, aiMessageId, {
                isComplete: true
              });
            },
            onError: (error) => {
              console.error("Stream error during regeneration:", error);
              // Mark message as complete but indicate error
              updateMessageInChat(chatId, aiMessageId, {
                text: " [Error during regeneration]",
                isComplete: true
              }, true);
            }
          }
        );
      } else {
        // Handle non-streaming response
        const response = await sendFetchRequest(userMessage.text || '', userMessage.files || []);
        
        // Update with complete response
        updateMessageInChat(chatId, aiMessageId, {
          text: response.text,
          imageUrl: response.imageUrl,
          isComplete: true
        }, true);
      }
    } catch (err) {
      console.error('Error regenerating response:', err);
      // Update with error message
      updateMessageInChat(chatId, aiMessageId, {
        text: `[Error regenerating response: ${err instanceof Error ? err.message : 'Unknown'}]`,
        isComplete: true
      }, true);
    }
  };

  // Function to delete a chat session
  const deleteChat = (idToDelete: string) => {
    setChatSessions(prev => prev.filter(chat => chat.id !== idToDelete));
    // If the deleted chat was the active one, deactivate
    if (activeChatId === idToDelete) {
      setActiveChatId(null);
    }
  };

  // Function to rename a chat session
  const renameChat = (chatId: string, newName: string) => {
    setChatSessions(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, name: newName, title: newName, updatedAt: new Date() } 
          : chat
      )
    );
  };

  // Value provided by the context
  const value: ChatContextType = {
    chatSessions,
    activeChatId,
    createChat,
    setActiveChat: setActiveChatId, // Pass the state setter directly
    getChatById,
    addMessageToChat,
    updateMessageInChat,
    deleteChat, // Provide deleteChat through context
    regenerateResponse, // Provide regenerateResponse through context
    renameChat, // Provide renameChat through context
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use the ChatContext
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 