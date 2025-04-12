import React, { useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
// Import useChat from the context
import { useChat } from '../contexts/ChatContext'; 
import { useFileUpload } from '../hooks/useFileUpload';
import { Agent, Message, MessageFile } from '../types/chat';
import './ChatInterface.css';
import { sendStreamRequest, sendFetchRequest } from '../services/api'; // Import API functions
// Import an icon component library if you're using one, or you can use unicode characters

interface ChatInterfaceProps {
  selectedAgent: Agent;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedAgent }) => {
  // Get chat state and handlers from CONTEXT hook
  const {
    chatSessions,
    activeChatId,
    getChatById, // Get this function from context
    addMessageToChat, // Use context function
    updateMessageInChat, // Use context function
    createChat, // Use context function
    setActiveChat // Use context function
  } = useChat();

  // Get the messages for the *currently active* chat from the context data
  const activeChatMessages = activeChatId ? getChatById(activeChatId)?.messages || [] : [];
  
  // Messaging state (local to this component or potentially moved to context if complex)
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get file upload state and handlers from custom hook
  const { 
    fileUploads, 
    handleFileSelect, // If using this directly
    uploadFiles, 
    resetFileUploads,
    isProcessing: isFileProcessing
  } = useFileUpload();
  
  // Local state for input value
  const [inputValue, setInputValue] = useState<string>('');
  
  // Combined processing state
  const combinedIsProcessing = isProcessing || isFileProcessing;

  // Clear error (local state for now)
  const clearError = () => setError(null);
  
  // Handle sending a message with files
  const handleSendMessage = async (text: string, filesToUpload?: { id: string; file: File }[]) => {
    clearError();
    if (!text.trim() && (!filesToUpload || filesToUpload.length === 0)) return;
    
    // Prevent multiple submissions while processing
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // Define outside try block so it's available in catch
    let chatId: string | null = null;
    
    try {
      // Define currentActiveChatId and ensure it's not null when used
      let currentActiveChatId = activeChatId;

      // If there's no active chat, create one using the context function
      if (!currentActiveChatId) {
        const chatTitle = text.trim() 
          ? (text.length > 30 ? text.substring(0, 27) + '...' : text)
          : 'New Conversation';
        const newChatId = createChat(chatTitle);
        setActiveChat(newChatId); // Make it active
        currentActiveChatId = newChatId; // Use the new ID for the rest of the function
      }

      // Ensure we have an ID before proceeding
      if (!currentActiveChatId) {
          console.error("Failed to get active chat ID after attempting creation.");
          setError("Failed to initiate chat.");
          return;
      }
      
      // At this point, currentActiveChatId is guaranteed to be a string
      chatId = currentActiveChatId; // Store for use in catch block
      
      // We've already verified chatId is not null above, so we can safely use it
      const validChatId = chatId as string;
      
      // Upload files
      let uploadedFilesData: MessageFile[] = [];
      if (filesToUpload && filesToUpload.length > 0) {
        const { filesForUserMessage } = await uploadFiles(filesToUpload);
        uploadedFilesData = filesForUserMessage;
      }
      
      // Create the user message object
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
        files: uploadedFilesData.length > 0 ? uploadedFilesData : undefined,
      };

      // Add user message to the context
      addMessageToChat(validChatId, userMessage);
      
      // Clear the input and reset file uploads
      setInputValue('');
      setTimeout(resetFileUploads, 100); // Keep reset delay

      // Create initial AI message (empty for streaming, will be populated incrementally)
      const aiMessageId = `ai-${Date.now()}`;
      
      if (selectedAgent === 'stream') {
        // Create an initial empty AI message for streaming
        addMessageToChat(validChatId, {
          id: aiMessageId,
          text: '',
          sender: 'ai',
          timestamp: new Date(),
          isComplete: false // Mark as incomplete for streaming
        });
        
        // Call the streaming API
        await sendStreamRequest(
          text.trim(),
          uploadedFilesData,
          {
            onChunk: (chunk) => {
              // Update the message with each new chunk
              updateMessageInChat(validChatId, aiMessageId, {
                text: chunk.text || '',
                imageUrl: chunk.imageUrl
              });
            },
            onComplete: () => {
              // Mark the message as complete when done
              updateMessageInChat(validChatId, aiMessageId, {
                isComplete: true
              });
            },
            onError: (error) => {
              console.error("Stream error:", error);
              setError(error.message);
              // Mark message as complete but indicate error
              updateMessageInChat(validChatId, aiMessageId, {
                text: " [Error during streaming]",
                isComplete: true
              });
            }
          }
        );
      } else {
        // For fetch mode, show initial message with loading state
        addMessageToChat(validChatId, {
          id: aiMessageId,
          text: '',
          sender: 'ai',
          timestamp: new Date(),
          isComplete: false
        });
        
        // Call the fetch API
        const response = await sendFetchRequest(text.trim(), uploadedFilesData);
        
        // Update with complete response
        updateMessageInChat(validChatId, aiMessageId, {
          text: response.text,
          imageUrl: response.imageUrl,
          isComplete: true
        }, true);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      // Add an error message to the chat
      if(chatId) {
        addMessageToChat(chatId, {
          id: `error-${Date.now()}`,
          text: `[Error sending message: ${err instanceof Error ? err.message : 'Unknown'}]`,
          sender: 'ai',
          timestamp: new Date(),
          isComplete: true
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="chat-interface">
      {/* Use activeChatId from context to check for empty state */}
      {!activeChatId && activeChatMessages.length === 0 ? (
        <div className="empty-chat-state">
          <div className="empty-chat-icon">💬</div>
          <h3>No Active Conversation</h3>
          <p>Start a new chat by typing a message below or choose an existing conversation from the sidebar.</p>
          {/* Button now uses the handleSendMessage logic implicitly when text is typed */}
        </div>
      ) : (
        /* Pass messages for the active chat */
        <MessageList messages={activeChatMessages} /> 
      )}
      
      {/* Display local error state */}
      {error && <div className="error-message">Error: {error}</div>}
      
      {/* Message input area */}
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSendMessage={handleSendMessage} // Use the refactored handler
        isProcessing={combinedIsProcessing} // Use combined state
        initialFiles={fileUploads} // Pass file uploads from useFileUpload hook
      />
    </div>
  );
};

export default ChatInterface; 