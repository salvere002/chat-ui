import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingIndicator from './LoadingIndicator';
import SuggestedQuestions from './SuggestedQuestions';
import { useChatStore, useToastStore, useUiSettingsStore } from '../stores';
import { useFileUpload } from '../hooks/useFileUpload';
import { ResponseMode, Message, MessageFile } from '../types/chat';
import { ConversationMessage } from '../types/api';
import { ChatService } from '../services/chatService';

interface ChatInterfaceProps {
  selectedResponseMode: ResponseMode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedResponseMode }) => {
  // Get chat state and handlers from the Zustand store
  const {
    activeChatId,
    getChatById,
    addMessageToChat,
    updateMessageInChat,
    isProcessing: storeIsProcessing,
    setProcessing,
    createChat,
    setActiveChat,
    getCurrentBranchMessages,
    setActiveRequestController,
    pauseCurrentRequest,
    getSuggestions,
    isSuggestionsLoading
  } = useChatStore();

  // Get toast functions from Zustand store
  const { showToast } = useToastStore();

  // Get UI settings from Zustand store
  const { showSuggestions } = useUiSettingsStore();


  // Get the messages for the currently active chat (branch-aware)
  const activeChatMessages = activeChatId ? getCurrentBranchMessages(activeChatId) : [];
  
  // Get suggestions - store handles fallbacks to defaults automatically
  const currentSuggestions = getSuggestions(activeChatId || undefined);
  
  // Local state for error handling
  const [error, setError] = useState<string | null>(null);
  
  // Get file upload state and handlers from custom hook
  const { 
    fileUploads, 
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

  // Handle pausing/aborting current request
  const handlePauseRequest = () => {
    pauseCurrentRequest();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

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
      // Set processing state and create abort controller
      setProcessing(true);
      const abortController = new AbortController();
      setActiveRequestController(abortController);
      
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
      
      // Get conversation history for the current branch BEFORE adding current messages
      const history: ConversationMessage[] = getCurrentBranchMessages(currentChatId)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp
        }));

      // Create and add user message to the chat
      const userMessage: Message = {
        id: messageId,
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        branchId: 'main',
        children: []
      };
      
      // Add to chat state
      addMessageToChat(currentChatId, userMessage);
      
      setInputValue('');
      
      resetFileUploads();
      
      // Create a unique message ID for AI response
      const aiMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create initial AI message (will be updated with stream)
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isComplete: false,
        branchId: 'main',
        children: []
      };
      
      // Add initial empty AI message to the chat
      addMessageToChat(currentChatId, aiMessage);
      
      // Send the API request based on selected response mode
      if (selectedResponseMode === 'stream') {
        // Streaming API call with proper callback handling
        await ChatService.sendStreamingMessage(
          messageText,
          uploadedFiles,
          {
            onChunk: (chunk) => {
              // Handle thinking content streaming
              if (chunk.thinking) {
                const currentMessage = getChatById(currentChatId)?.messages.find(m => m.id === aiMessageId);
                updateMessageInChat(currentChatId, aiMessageId, {
                  thinkingContent: `${currentMessage?.thinkingContent || ''}${chunk.thinking}`,
                  isThinkingComplete: chunk.thinkingComplete,
                  thinkingCollapsed: currentMessage?.thinkingCollapsed ?? true // Default to collapsed
                });
              }
              
              // Handle regular response content streaming
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
                isComplete: true,
                isThinkingComplete: true // Ensure thinking is also marked complete
              });
              // Clear processing state and abort controller
              setProcessing(false);
              setActiveRequestController(null);
            },
            onError: (error) => {
              // Don't show error for aborted requests
              if (error.name !== 'AbortError') {
                setError(error.message);
                updateMessageInChat(currentChatId, aiMessageId, {
                  text: 'Sorry, there was an error processing your request.',
                  isComplete: true
                });
              } else {
                // For aborted requests, mark current message as complete with existing content
                updateMessageInChat(currentChatId, aiMessageId, {
                  isComplete: true,
                  isThinkingComplete: true,
                  wasPaused: true
                });
              }
              // Clear processing state and abort controller
              setProcessing(false);
              setActiveRequestController(null);
            }
          },
          history,
          abortController.signal
        );
      } else {
        // Non-streaming API call
        try {
          const response = await ChatService.sendMessage(messageText, uploadedFiles, history, abortController.signal);
          // Update AI message with complete response
          updateMessageInChat(currentChatId, aiMessageId, {
            text: response.text,
            imageUrl: response.imageUrl,
            isComplete: true,
            thinkingContent: response.thinking,
            isThinkingComplete: true
          });
        } catch (error) {
          // Handle abort vs other errors for fetch mode
          if (error instanceof Error && error.name === 'AbortError') {
            // For aborted requests, mark current message as complete with existing content
            updateMessageInChat(currentChatId, aiMessageId, {
              isComplete: true,
              wasPaused: true
            });
          } else {
            // Show error and mark message as complete
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
            updateMessageInChat(currentChatId, aiMessageId, {
              text: 'Sorry, there was an error processing your request.',
              isComplete: true
            });
          }
        } finally {
          // Clear processing state and abort controller
          setProcessing(false);
          setActiveRequestController(null);
        }
      }
    } catch (err) {
      // Handle any unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setProcessing(false);
      setActiveRequestController(null);
    }
  };
  
  // Different empty states
  const hasNoActiveChat = !activeChatId;
  const hasActiveChatButEmpty = activeChatId && activeChatMessages.length === 0;
  const hasMessages = activeChatId && activeChatMessages.length > 0;
  const showWelcome = hasNoActiveChat || hasActiveChatButEmpty;
  
  // Track when we transition from empty to having messages for animation
  const previousMessageCount = useRef(0);
  const [shouldAnimateTransition, setShouldAnimateTransition] = useState(false);
  
  useEffect(() => {
    const currentMessageCount = activeChatMessages.length;
    
    // If we go from 0 to 1+ messages, trigger animation
    if (previousMessageCount.current === 0 && currentMessageCount > 0) {
      setShouldAnimateTransition(true);
      // Reset animation flag after animation completes
      setTimeout(() => setShouldAnimateTransition(false), 500);
    }
    
    previousMessageCount.current = currentMessageCount;
  }, [activeChatMessages.length]);


  return (
    <div className="flex flex-col h-full w-full bg-bg-primary relative overflow-hidden">
      {/* Single welcome state for both no chat and empty chat */}
      {showWelcome ? (
        <div className="flex flex-col h-full justify-center items-center px-4 py-8">
          {/* Welcome content */}
          <div className="text-center max-w-[420px] mb-2 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-bg-elevated border border-border-secondary text-accent-primary rounded-2xl text-4xl">
              💬
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-3">Start a Conversation</h3>
            <p className="text-base text-text-secondary leading-relaxed m-0">
              Ask me anything! I'm here to help with your questions, tasks, and creative projects.
            </p>
          </div>
          
          {/* Input area with proper spacing */}
          <div className="w-full max-w-4xl">
            {/* Suggested questions above input - centered */}
            {showSuggestions && (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <SuggestedQuestions
                    suggestions={combinedIsProcessing ? [] : currentSuggestions}
                    isLoading={isSuggestionsLoading}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
              </div>
            )}
            
            <MessageInput
              value={inputValue}
              onChange={setInputValue}
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              initialFiles={fileUploads}
              showTopBorder={false}
            />
          </div>
        </div>
      ) : (
        /* Active conversation with messages */
        <>
          <MessageList messages={activeChatMessages} chatId={activeChatId} />
          
          {/* Bottom-positioned message input with suggestions and animation */}
          <div className={`relative ${shouldAnimateTransition ? 'animate-input-to-bottom' : ''}`}>
            {/* Suggested questions overlay - positioned above input without taking space */}
            {showSuggestions && currentSuggestions.length > 0 && !combinedIsProcessing && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-full max-w-4xl px-4 z-dropdown">
                <div className="flex justify-center">
                  <div className="w-full max-w-2xl">
                    <SuggestedQuestions
                      suggestions={currentSuggestions}
                      isLoading={isSuggestionsLoading}
                      onSuggestionClick={handleSuggestionClick}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <MessageInput
              value={inputValue}
              onChange={setInputValue}
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              initialFiles={fileUploads}
              showTopBorder={true}
            />
          </div>
        </>
      )}
      
      {/* Display file upload loading state only */}
      {isFileProcessing && (
        <div className={`absolute ${hasMessages ? 'bottom-[90px]' : 'bottom-[120px]'} left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-secondary rounded-lg px-4 py-3 shadow-md flex items-center gap-3 z-dropdown animate-slide-up`}>
          <LoadingIndicator 
            type="dots"
            text="Uploading files..."
          />
        </div>
      )}
      
      {/* Display error state */}
      {error && (
        <div className="flex items-center gap-3 m-4 p-3 bg-error text-text-inverse rounded-md text-sm cursor-pointer transition-all duration-150 animate-slide-down hover:-translate-y-0.5 hover:shadow-md" onClick={() => clearError()}>
          <span className="text-lg flex-shrink-0">⚠️</span>
          <span>{error}</span>
          <button className="ml-auto bg-transparent border-none text-current text-xl cursor-pointer opacity-80 transition-opacity duration-150 p-0 w-6 h-6 flex items-center justify-center rounded hover:opacity-100 hover:bg-white/20">×</button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface; 