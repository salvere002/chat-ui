import React, { useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingIndicator from './LoadingIndicator';
import { useChatStore, useToastStore } from '../stores';
import { useFileUpload } from '../hooks/useFileUpload';
import { Agent, Message, MessageFile } from '../types/chat';
import './ChatInterface.css';
import { sendStreamRequest, sendFetchRequest } from '../services/api';

interface ChatInterfaceProps {
  selectedAgent: Agent;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedAgent }) => {
  // Get chat state and handlers from the Zustand store
  const {
    chatSessions,
    activeChatId,
    getChatById,
    addMessageToChat,
    updateMessageInChat,
    isProcessing: storeIsProcessing,
    setProcessing,
    createChat,
    setActiveChat
  } = useChatStore();

  // Get toast functions from Zustand store
  const { showToast } = useToastStore();

  // Get the messages for the currently active chat
  const activeChatMessages = activeChatId ? getChatById(activeChatId)?.messages || [] : [];
  
  // Local state for error handling
  const [error, setError] = useState<string | null>(null);
  
  // Get file upload state and handlers from custom hook
  const { 
    fileUploads, 
    handleFileSelect,
    uploadFiles, 
    resetFileUploads,
    isProcessing: isFileProcessing
  } = useFileUpload();
  
  // Local state for input value
  const [inputValue, setInputValue] = useState<string>('');
  
  // Combined processing state
  const combinedIsProcessing = storeIsProcessing || isFileProcessing;

  // Clear error (local state for now)
  const clearError = () => setError(null);

  // Handle sending a new message
  const handleSendMessage = async (messageText: string, filesToUpload?: { id: string; file: File }[]) => {
    // Don't process empty messages
    if ((!messageText || messageText.trim() === '') && (!filesToUpload || filesToUpload.length === 0)) {
      return;
    }
    
    let currentChatId = activeChatId;
    
    // If there's no active chat, create one automatically
    if (!currentChatId) {
      // Create a title from the message (truncate if too long)
      const chatTitle = messageText.trim() 
        ? (messageText.length > 30 ? messageText.substring(0, 27) + '...' : messageText)
        : 'New Conversation';
      
      currentChatId = createChat(chatTitle);
      setActiveChat(currentChatId);
    }
    
    try {
      // Set processing state
      setProcessing(true);
      
      // Process file uploads if needed
      let uploadedFiles: MessageFile[] = [];
      if (filesToUpload && filesToUpload.length > 0) {
        try {
          const { filesForUserMessage } = await uploadFiles(filesToUpload);
          uploadedFiles = filesForUserMessage;
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          showToast("Error uploading files", "error");
        }
      }
      
      // Create a unique message ID
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create and add user message to the chat
      const userMessage: Message = {
        id: messageId,
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined
      };
      
      // Add to chat state
      addMessageToChat(currentChatId, userMessage);
      
      // Clear input
      setInputValue('');
      
      // Reset file uploads
      resetFileUploads();
      
      // Create a unique message ID for AI response
      const aiMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create initial AI message (will be updated with stream)
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isComplete: false
      };
      
      // Add initial empty AI message to the chat
      addMessageToChat(currentChatId, aiMessage);
      
      // Send the API request based on selected agent
      if (selectedAgent === 'stream') {
        // Streaming API call with proper callback handling
        await sendStreamRequest(
          messageText,
          uploadedFiles,
          {
            onChunk: (chunk) => {
              // Update the AI message with each chunk
              if (chunk.text) {
                updateMessageInChat(currentChatId, aiMessageId, {
                  text: `${getChatById(currentChatId)?.messages.find(m => m.id === aiMessageId)?.text || ''}${chunk.text}`,
                  imageUrl: chunk.imageUrl
                });
              }
            },
            onComplete: () => {
              // Mark as complete when done
              updateMessageInChat(currentChatId, aiMessageId, {
                isComplete: true
              });
              // Clear processing state
              setProcessing(false);
            },
            onError: (error) => {
              // Show error and mark message as complete
              setError(error.message);
              updateMessageInChat(currentChatId, aiMessageId, {
                text: 'Sorry, there was an error processing your request.',
                isComplete: true
              });
              // Clear processing state
              setProcessing(false);
            }
          }
        );
      } else {
        // Non-streaming API call
        try {
          const response = await sendFetchRequest(messageText, uploadedFiles);
          // Update AI message with complete response
          updateMessageInChat(currentChatId, aiMessageId, {
            text: response.text,
            isComplete: true
          });
        } catch (error) {
          // Show error and mark message as complete
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
          updateMessageInChat(currentChatId, aiMessageId, {
            text: 'Sorry, there was an error processing your request.',
            isComplete: true
          });
        } finally {
          // Clear processing state
          setProcessing(false);
        }
      }
    } catch (err) {
      // Handle any unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setProcessing(false);
    }
  };
  
  return (
    <div className="chat-interface">
      {/* Show empty state if no active chat */}
      {!activeChatId && activeChatMessages.length === 0 ? (
        <div className="empty-chat-state">
          <div className="empty-chat-content">
            <div className="empty-chat-icon">💬</div>
            <h3>No Active Conversation</h3>
            <p>Start a new chat by typing a message below or choose an existing conversation from the sidebar.</p>
          </div>
        </div>
      ) : (
        <MessageList messages={activeChatMessages} />
      )}
      
      {/* Display loading state */}
      {combinedIsProcessing && (
        <div className="loading-container">
          <LoadingIndicator 
            type="dots"
            text={isFileProcessing ? "Uploading files..." : "Processing message..."}
          />
        </div>
      )}
      
      {/* Display error state */}
      {error && (
        <div className="error-message" onClick={() => clearError()}>
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="error-close">×</button>
        </div>
      )}
      
      {/* Message input area */}
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSendMessage={handleSendMessage}
        isProcessing={combinedIsProcessing}
        initialFiles={fileUploads}
      />
    </div>
  );
};

export default ChatInterface; 