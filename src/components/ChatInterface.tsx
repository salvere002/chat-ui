import React, { useState, useEffect, useMemo } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingIndicator from './LoadingIndicator';
import { useChatData, useChatActions, useBranchData, useToastStore, useInputStore } from '../stores';
import { useFileUpload } from '../hooks/useFileUpload';
import { useStreamingMessage } from '../hooks/useStreamingMessage';
import { useImageUrlCache } from '../hooks/useImageUrlCache';
import { ResponseMode, Message, MessageFile } from '../types/chat';
import { generateMessageId } from '../utils/id';
import { ConversationMessage } from '../types/api';
import { fileService } from '../services/fileService';
import { buildHistory } from '../utils/messageUtils';
import { streamManager } from '../services/streamManager';

interface ChatInterfaceProps {
  selectedResponseMode: ResponseMode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedResponseMode }) => {
  // Get chat data and actions using selective subscriptions
  const { activeChatId, chatSessions, activeBranchPath } = useChatData();
  const {
    addMessageToChat,
    createChat,
    setActiveChat,
    pauseChatRequest
  } = useChatActions();
  const { getCurrentBranchMessages } = useBranchData();

  // Get toast functions from Zustand store
  const { showToast } = useToastStore();

  // Get the messages for the currently active chat (branch-aware) - memoized to prevent unnecessary re-renders
  const activeChat = chatSessions.find(c => c.id === activeChatId);
  const currentBranchPath = activeBranchPath.get(activeChatId || '');
  const activeChatMessages = useMemo(() => {
    return activeChatId ? getCurrentBranchMessages(activeChatId) : [];
  }, [activeChatId, getCurrentBranchMessages, activeChat?.messages, currentBranchPath]);

  // Local state for error handling
  const [error, setError] = useState<string | null>(null);

  // Get file upload state and handlers from custom hook
  const {
    uploadFiles,
    resetFileUploads,
    isProcessing: isFileProcessing,
    selectedFiles,
    handleFileRemove,
    processFiles
  } = useFileUpload();

  // Get input store methods
  const { resetInput } = useInputStore();

  // Get streaming message handler
  const { sendStreamingMessage } = useStreamingMessage(selectedResponseMode);

  // Optimized cleanup with caching and smart intervals
  const { urls: activeImageUrls, hasImages, changed } = useImageUrlCache(activeChatMessages);

  useEffect(() => {
    // Early return if no images to manage
    if (!hasImages) return;

    let cleanupInterval: number;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };

    const performCleanup = () => {
      // Only cleanup if tab is visible and URLs have changed
      if (isTabVisible && activeImageUrls.length > 0) {
        fileService.cleanupInactiveImages(activeImageUrls);
      }
    };

    // Dynamic interval based on activity
    const getCleanupInterval = () => {
      if (!isTabVisible) return 60000; // 1 minute when tab not visible
      if (activeChatMessages.length > 100) return 45000; // More frequent for large chats
      return 30000; // Default 30 seconds
    };

    // Initial cleanup if URLs changed
    if (changed) {
      performCleanup();
    }

    // Set up interval cleanup
    cleanupInterval = window.setInterval(performCleanup, getCleanupInterval());

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(cleanupInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeImageUrls, hasImages, changed, activeChatMessages.length]);

  // Get current chat streaming state from streamManager
  const isChatStreaming = activeChatId ? streamManager.isStreamingInChat(activeChatId) : false;

  // Combined processing state
  const combinedIsProcessing = isChatStreaming || isFileProcessing;

  // Clear error (local state for now)
  const clearError = () => setError(null);

  // Handle pausing/aborting current request
  const handlePauseRequest = () => {
    if (activeChatId) {
      pauseChatRequest(activeChatId);
    }
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
      const messageId = generateMessageId();

      // Get conversation history for the current branch BEFORE adding current messages
      const history: ConversationMessage[] = buildHistory(getCurrentBranchMessages(currentChatId));

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

      resetInput();

      resetFileUploads();

      // Create a unique message ID for AI response
      const aiMessageId = generateMessageId();

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

      // Send the API request using the centralized streaming hook
      await sendStreamingMessage({
        chatId: currentChatId,
        messageId: aiMessageId,
        userText: messageText,
        userFiles: uploadedFiles,
        history
      });
    } catch (err) {
      // Handle any unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      // Error handling is now managed by the streaming hook
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary relative overflow-hidden">
      {/* Show empty state if no active chat */}
      {!activeChatId && activeChatMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
          <div className="text-center max-w-[420px]">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-accent-light text-accent-primary rounded-2xl text-4xl">
              💬
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-3">No Active Conversation</h3>
            <p className="text-base text-text-secondary leading-relaxed m-0">
              Start a new chat by typing a message below or choose an existing conversation from the sidebar.
            </p>
          </div>

          {/* Input area with proper spacing */}
          <div className="w-full max-w-4xl mt-8">
            <MessageInput
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
              onProcessFiles={processFiles}
              showTopBorder={false}
            />
          </div>
        </div>
      ) : (
        /* Active conversation with messages */
        <>
          <MessageList
            messages={activeChatMessages}
            chatId={activeChatId}
          />

          {/* Bottom-positioned message input */}
          <div className="relative">
            <MessageInput
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
              onProcessFiles={processFiles}
              showTopBorder={true}
            />
          </div>
        </>
      )}

      {/* Display file upload loading state only */}
      {isFileProcessing && (
        <div className={`absolute ${activeChatId && activeChatMessages.length > 0 ? 'bottom-[90px]' : 'bottom-[120px]'} left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-secondary rounded-lg px-4 py-3 shadow-md flex items-center gap-3 z-dropdown animate-slide-up`}>
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
