import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBranchData, useChatActions, useChatData, useInputStore, useToastStore } from '../stores';
import { useFileUpload } from '../hooks/useFileUpload';
import { useStreamingMessage } from '../hooks/useStreamingMessage';
import { useImageUrlCache } from '../hooks/useImageUrlCache';
import type { Message, MessageFile, ResponseMode } from '../types/chat';
import { generateMessageId } from '../utils/id';
import type { ConversationMessage } from '../types/api';
import { buildHistory } from '../utils/messageUtils';
import { streamManager } from '../services/streamManager';
import { fileService } from '../services/fileService';
import type { ChatHeadlessRuntime, PendingUploadFile } from './types';

export const useChatHeadless = (selectedResponseMode: ResponseMode): ChatHeadlessRuntime => {
  const { activeChatId, chatSessions, activeBranchPath } = useChatData();
  const {
    addMessageToChat,
    createChat,
    setActiveChat,
    pauseChatRequest,
  } = useChatActions();
  const { getCurrentBranchMessages } = useBranchData();
  const { showToast } = useToastStore();
  const { resetInput } = useInputStore();

  const [error, setError] = useState<string | null>(null);

  const {
    uploadFiles,
    resetFileUploads,
    isProcessing: isFileProcessing,
    selectedFiles,
    handleFileRemove,
    processFiles,
  } = useFileUpload();

  const { sendStreamingMessage } = useStreamingMessage(selectedResponseMode);

  const activeChat = chatSessions.find((c) => c.id === activeChatId);
  const currentBranchPath = activeBranchPath.get(activeChatId || '');
  const activeChatMessages = useMemo(() => {
    return activeChatId ? getCurrentBranchMessages(activeChatId) : [];
  }, [activeChatId, getCurrentBranchMessages, activeChat?.messages, currentBranchPath]);

  const { urls: activeImageUrls, hasImages, changed } = useImageUrlCache(activeChatMessages);

  useEffect(() => {
    if (!hasImages) return;

    let cleanupInterval: number;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };

    const performCleanup = () => {
      if (isTabVisible && activeImageUrls.length > 0) {
        fileService.cleanupInactiveImages(activeImageUrls);
      }
    };

    const getCleanupInterval = () => {
      if (!isTabVisible) return 60000;
      if (activeChatMessages.length > 100) return 45000;
      return 30000;
    };

    if (changed) {
      performCleanup();
    }

    cleanupInterval = window.setInterval(performCleanup, getCleanupInterval());
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(cleanupInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeImageUrls, hasImages, changed, activeChatMessages.length]);

  const isChatStreaming = activeChatId ? streamManager.isStreamingInChat(activeChatId) : false;
  const combinedIsProcessing = isChatStreaming || isFileProcessing;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handlePauseRequest = useCallback(() => {
    if (activeChatId) {
      pauseChatRequest(activeChatId);
    }
  }, [activeChatId, pauseChatRequest]);

  const handleSendMessage = useCallback(async (messageText: string, filesToUpload?: PendingUploadFile[]) => {
    if ((!messageText || messageText.trim() === '') && (!filesToUpload || filesToUpload.length === 0)) {
      return;
    }

    let currentChatId = activeChatId;

    if (!currentChatId) {
      const chatTitle = messageText.trim()
        ? (messageText.length > 30 ? messageText.substring(0, 27) + '...' : messageText)
        : 'New Conversation';

      currentChatId = createChat(chatTitle);
      setActiveChat(currentChatId);
    }

    try {
      let uploadedFiles: MessageFile[] = [];
      if (filesToUpload && filesToUpload.length > 0) {
        try {
          const { filesForUserMessage } = await uploadFiles(filesToUpload);
          uploadedFiles = filesForUserMessage;
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          showToast('Error uploading files', 'error');
        }
      }

      const messageId = generateMessageId();
      const history: ConversationMessage[] = buildHistory(getCurrentBranchMessages(currentChatId));

      const userMessage: Message = {
        id: messageId,
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        branchId: 'main',
        children: [],
      };

      addMessageToChat(currentChatId, userMessage);
      resetInput();
      resetFileUploads();

      const aiMessageId = generateMessageId();
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isComplete: false,
        branchId: 'main',
        children: [],
      };

      addMessageToChat(currentChatId, aiMessage);

      await sendStreamingMessage({
        chatId: currentChatId,
        messageId: aiMessageId,
        userText: messageText,
        userFiles: uploadedFiles,
        history,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  }, [
    activeChatId,
    addMessageToChat,
    createChat,
    getCurrentBranchMessages,
    resetFileUploads,
    resetInput,
    sendStreamingMessage,
    setActiveChat,
    showToast,
    uploadFiles,
  ]);

  return {
    activeChatId,
    activeChatMessages,
    combinedIsProcessing,
    isFileProcessing,
    selectedFiles,
    error,
    clearError,
    handlePauseRequest,
    handleSendMessage,
    handleFileRemove,
    processFiles,
  };
};
