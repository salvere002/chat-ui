import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient } from '../services/apiClient';
import { A2AAdapter } from '../services/adapters/A2AAdapter';
import type { BaseAdapter } from '../services/adapters/BaseAdapter';
import { AgUiAdapter } from '../services/adapters/AgUiAdapter';
import { MockAdapter } from '../services/adapters/MockAdapter';
import { RestApiAdapter } from '../services/adapters/RestApiAdapter';
import { SessionAdapter } from '../services/adapters/SessionAdapter';
import type { MessageRequest, StreamMessageChunk } from '../types/api';
import type { AdapterType } from '../services/serviceFactory';
import type { Chat, Message, MessageFile, PreviewFile, ResponseMode } from '../types/chat';
import { buildHistory } from '../utils/messageUtils';
import { configManager } from '../utils/config';
import { generateChatId, generateMessageId } from '../utils/id';
import type { PendingUploadFile } from './types';
import type {
  IsolatedChatHeadlessOptions,
  IsolatedChatHeadlessRuntime,
  IsolatedHeadlessAdapterFactory,
} from './isolatedTypes';

const SUPPORTED_ADAPTER_TYPES: AdapterType[] = ['rest', 'mock', 'session', 'a2a', 'agui'];

const isAdapterType = (value: unknown): value is AdapterType => {
  return typeof value === 'string' && SUPPORTED_ADAPTER_TYPES.includes(value as AdapterType);
};

const resolveAdapterType = (adapterType?: AdapterType): AdapterType => {
  if (adapterType && isAdapterType(adapterType)) return adapterType;
  const fallback = configManager.getServicesConfig().adapterType;
  if (isAdapterType(fallback)) return fallback;
  return 'rest';
};

const createBuiltInAdapter = (adapterType: AdapterType, baseUrl: string): BaseAdapter => {
  const apiConfig = configManager.getApiConfig();
  const apiClient = new ApiClient({
    baseUrl,
    defaultHeaders: apiConfig.defaultHeaders,
    timeout: apiConfig.timeout,
    useProxy: apiConfig.useProxy !== false,
  });

  switch (adapterType) {
    case 'rest':
      return new RestApiAdapter(apiClient);
    case 'session':
      return new SessionAdapter(apiClient);
    case 'a2a':
      return new A2AAdapter(apiClient);
    case 'agui':
      return new AgUiAdapter(apiClient);
    case 'mock':
      return new MockAdapter(apiClient);
    default:
      return new RestApiAdapter(apiClient);
  }
};

const createConfiguredAdapter = (
  adapterType: AdapterType,
  baseUrl: string,
  adapter?: BaseAdapter,
  adapterFactory?: IsolatedHeadlessAdapterFactory
): BaseAdapter => {
  if (adapter) {
    return adapter;
  }
  if (adapterFactory) {
    return adapterFactory({ adapterType, baseUrl });
  }
  return createBuiltInAdapter(adapterType, baseUrl);
};

const revokePreviewUrl = (previewFile: PreviewFile): void => {
  if (previewFile.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewFile.previewUrl);
  }
};

const normalizeMessage = (message: Message): Message => ({
  ...message,
  timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
  branchId: message.branchId || 'main',
  children: message.children || [],
});

const createChatShell = (chatId: string, title: string): Chat => {
  const now = new Date();
  return {
    id: chatId,
    name: title,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
    status: 'fully_loaded',
  };
};

export const useIsolatedChatHeadless = (options: IsolatedChatHeadlessOptions = {}): IsolatedChatHeadlessRuntime => {
  const adapterType = resolveAdapterType(options.serviceConfig?.adapterType);
  const baseUrl = options.serviceConfig?.baseUrl || configManager.getApiConfig().baseUrl;
  const providedAdapter = options.adapter;
  const adapterFactory = options.adapterFactory;
  const autoCreateChat = options.autoCreateChat !== false;
  const initialResponseMode = options.initialResponseMode || 'stream';

  const [chatSessions, setChatSessions] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedResponseMode, setSelectedResponseMode] = useState<ResponseMode>(initialResponseMode);
  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingByChat, setStreamingByChat] = useState<Record<string, string>>({});

  const chatSessionsRef = useRef<Chat[]>(chatSessions);
  const selectedFilesRef = useRef<PreviewFile[]>(selectedFiles);
  const activeChatIdRef = useRef<string | null>(activeChatId);
  const selectedResponseModeRef = useRef<ResponseMode>(selectedResponseMode);
  const adapterRef = useRef<BaseAdapter | null>(null);
  const streamControllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeBlobImageUrlsRef = useRef<Set<string>>(new Set());

  if (!adapterRef.current) {
    adapterRef.current = createConfiguredAdapter(adapterType, baseUrl, providedAdapter, adapterFactory);
  }

  useEffect(() => {
    chatSessionsRef.current = chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    selectedResponseModeRef.current = selectedResponseMode;
  }, [selectedResponseMode]);

  const clearChatStreamingState = useCallback((chatId: string) => {
    setStreamingByChat((prev) => {
      if (!prev[chatId]) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  }, []);

  const abortAllStreams = useCallback(() => {
    for (const controller of streamControllersRef.current.values()) {
      try {
        controller.abort();
      } catch {
        // Ignore abort errors during cleanup
      }
    }
    streamControllersRef.current.clear();
    setStreamingByChat({});
  }, []);

  useEffect(() => {
    abortAllStreams();
    adapterRef.current = createConfiguredAdapter(adapterType, baseUrl, providedAdapter, adapterFactory);
  }, [adapterType, baseUrl, providedAdapter, adapterFactory, abortAllStreams]);

  const getAdapter = useCallback((): BaseAdapter => {
    if (!adapterRef.current) {
      adapterRef.current = createConfiguredAdapter(adapterType, baseUrl, providedAdapter, adapterFactory);
    }
    return adapterRef.current;
  }, [adapterType, baseUrl, providedAdapter, adapterFactory]);

  const updateMessageInChat = useCallback((chatId: string, messageId: string, updates: Partial<Message>) => {
    setChatSessions((prev) => prev.map((chat) => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        messages: chat.messages.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
        updatedAt: new Date(),
      };
    }));
  }, []);

  const stopStreamForChat = useCallback((chatId: string) => {
    const controller = streamControllersRef.current.get(chatId);
    if (controller) {
      try {
        controller.abort();
      } catch {
        // Ignore abort errors
      }
      streamControllersRef.current.delete(chatId);
    }
    clearChatStreamingState(chatId);
  }, [clearChatStreamingState]);

  const finalizeStreamForChat = useCallback((chatId: string) => {
    if (streamControllersRef.current.has(chatId)) {
      streamControllersRef.current.delete(chatId);
    }
    clearChatStreamingState(chatId);
  }, [clearChatStreamingState]);

  const trackStream = useCallback((chatId: string, messageId: string): AbortController => {
    const existing = streamControllersRef.current.get(chatId);
    if (existing) {
      try {
        existing.abort();
      } catch {
        // Ignore abort errors
      }
    }
    const controller = new AbortController();
    streamControllersRef.current.set(chatId, controller);
    setStreamingByChat((prev) => ({ ...prev, [chatId]: messageId }));
    return controller;
  }, []);

  const createChat = useCallback((name?: string) => {
    const chatId = generateChatId();
    const title = name || `Chat ${chatSessionsRef.current.length + 1}`;
    setChatSessions((prev) => [createChatShell(chatId, title), ...prev]);
    setActiveChatId(chatId);
    return chatId;
  }, []);

  const setActiveChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    stopStreamForChat(chatId);
    setChatSessions((prev) => {
      const remaining = prev.filter((chat) => chat.id !== chatId);
      if (activeChatIdRef.current === chatId) {
        setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  }, [stopStreamForChat]);

  const clearChats = useCallback(() => {
    abortAllStreams();
    setChatSessions([]);
    setActiveChatId(null);
  }, [abortAllStreams]);

  const appendMessage = useCallback((message: Message, chatId?: string) => {
    const targetChatId = chatId || activeChatIdRef.current;
    if (!targetChatId) return;
    const normalized = normalizeMessage(message);

    setChatSessions((prev) => {
      const chatIndex = prev.findIndex((chat) => chat.id === targetChatId);
      if (chatIndex === -1) {
        const shell = createChatShell(targetChatId, 'New Conversation');
        shell.messages = [normalized];
        shell.updatedAt = new Date();
        return [shell, ...prev];
      }

      return prev.map((chat) => {
        if (chat.id !== targetChatId) return chat;
        return {
          ...chat,
          messages: [...chat.messages, normalized],
          updatedAt: new Date(),
        };
      });
    });
  }, []);

  const setMessages = useCallback((messages: Message[], chatId?: string) => {
    const targetChatId = chatId || activeChatIdRef.current;
    if (!targetChatId) return;
    const normalizedMessages = messages.map(normalizeMessage);

    setChatSessions((prev) => {
      const chatIndex = prev.findIndex((chat) => chat.id === targetChatId);
      if (chatIndex === -1) {
        const shell = createChatShell(targetChatId, 'New Conversation');
        shell.messages = normalizedMessages;
        shell.updatedAt = new Date();
        return [shell, ...prev];
      }

      return prev.map((chat) => {
        if (chat.id !== targetChatId) return chat;
        return {
          ...chat,
          messages: normalizedMessages,
          updatedAt: new Date(),
        };
      });
    });
  }, []);

  const processFiles = useCallback((files: FileList) => {
    if (!files || files.length === 0) return;
    const newPreviewFiles: PreviewFile[] = Array.from(files).map((file) => ({
      id: generateMessageId(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
    }));
    setSelectedFiles((prev) => [...prev, ...newPreviewFiles]);
  }, []);

  const handleFileRemove = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((file) => file.id === fileId);
      if (target) revokePreviewUrl(target);
      return prev.filter((file) => file.id !== fileId);
    });
  }, []);

  const patchPreviewFile = useCallback((fileId: string, updates: Partial<PreviewFile>) => {
    setSelectedFiles((prev) => prev.map((file) => (
      file.id === fileId ? { ...file, ...updates } : file
    )));
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles((prev) => {
      prev.forEach(revokePreviewUrl);
      return [];
    });
  }, []);

  const uploadFiles = useCallback(async (filesToUpload: PendingUploadFile[]): Promise<MessageFile[]> => {
    if (!filesToUpload || filesToUpload.length === 0) return [];

    setIsFileProcessing(true);
    try {
      const uploaded = await Promise.all(filesToUpload.map(async ({ id, file }) => {
        patchPreviewFile(id, { status: 'uploading', progress: 0 });
        try {
          const result = await getAdapter().uploadFile(id, file, (fileId, progress) => {
            patchPreviewFile(fileId, { status: 'uploading', progress });
          });
          const normalized: MessageFile = { ...result, id };
          patchPreviewFile(id, { status: 'complete', progress: 100, finalFileData: normalized });
          return normalized;
        } catch {
          patchPreviewFile(id, { status: 'error', progress: 0 });
          return null;
        }
      }));

      return uploaded.filter((file): file is MessageFile => file !== null);
    } finally {
      setIsFileProcessing(false);
    }
  }, [getAdapter, patchPreviewFile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runStreamingRequest = useCallback(async (
    request: MessageRequest,
    chatId: string,
    aiMessageId: string,
    controller: AbortController,
  ) => {
    let done = false;
    let accumulatedText = '';

    const resolveOnce = (resolve: () => void) => {
      if (done) return;
      done = true;
      finalizeStreamForChat(chatId);
      resolve();
    };

    return new Promise<void>((resolve) => {
      getAdapter().sendStreamingMessage(
        request,
        {
          onChunk: (chunk: StreamMessageChunk) => {
            if (chunk.thinking) {
              const previous = chatSessionsRef.current
                .find((chat) => chat.id === chatId)
                ?.messages.find((msg) => msg.id === aiMessageId)?.thinkingContent || '';

              updateMessageInChat(chatId, aiMessageId, {
                thinkingContent: previous + chunk.thinking,
                isThinkingComplete: chunk.thinkingComplete === true,
              });
            }

            if (chunk.text) {
              accumulatedText += chunk.text;
              updateMessageInChat(chatId, aiMessageId, { text: accumulatedText });
            }

            if (chunk.imageUrl) {
              updateMessageInChat(chatId, aiMessageId, { imageUrl: chunk.imageUrl });
            }

            if (chunk.complete) {
              updateMessageInChat(chatId, aiMessageId, {
                isComplete: true,
                isThinkingComplete: true,
              });
            }
          },
          onComplete: () => {
            updateMessageInChat(chatId, aiMessageId, {
              isComplete: true,
              isThinkingComplete: true,
            });
            resolveOnce(resolve);
          },
          onError: (streamError: Error) => {
            if (streamError.name === 'AbortError' || controller.signal.aborted) {
              updateMessageInChat(chatId, aiMessageId, {
                isComplete: true,
                isThinkingComplete: true,
                wasPaused: true,
              });
              resolveOnce(resolve);
              return;
            }

            updateMessageInChat(chatId, aiMessageId, {
              text: 'Sorry, there was an error processing your request.',
              isComplete: true,
              isThinkingComplete: true,
            });
            setError(streamError.message || 'Streaming request failed');
            resolveOnce(resolve);
          },
        },
        controller.signal,
      ).catch((streamError) => {
        const resolvedError = streamError instanceof Error ? streamError : new Error(String(streamError));
        if (resolvedError.name === 'AbortError' || controller.signal.aborted) {
          updateMessageInChat(chatId, aiMessageId, {
            isComplete: true,
            isThinkingComplete: true,
            wasPaused: true,
          });
        } else {
          updateMessageInChat(chatId, aiMessageId, {
            text: 'Sorry, there was an error processing your request.',
            isComplete: true,
            isThinkingComplete: true,
          });
          setError(resolvedError.message || 'Streaming request failed');
        }
        resolveOnce(resolve);
      });
    });
  }, [finalizeStreamForChat, getAdapter, updateMessageInChat]);

  const handleSendMessage = useCallback(async (messageText: string, filesToUpload?: PendingUploadFile[]) => {
    if ((!messageText || messageText.trim() === '') && (!filesToUpload || filesToUpload.length === 0)) {
      return;
    }

    setError(null);

    let currentChatId = activeChatIdRef.current;
    if (!currentChatId) {
      if (!autoCreateChat) {
        setError('No active chat selected');
        return;
      }
      const chatTitle = messageText.trim()
        ? (messageText.length > 30 ? `${messageText.substring(0, 27)}...` : messageText)
        : 'New Conversation';
      const newChatId = generateChatId();
      currentChatId = newChatId;
      setChatSessions((prev) => [createChatShell(newChatId, chatTitle), ...prev]);
      setActiveChatId(newChatId);
    }
    if (!currentChatId) return;

    let uploadedFiles: MessageFile[] = [];
    if (filesToUpload && filesToUpload.length > 0) {
      uploadedFiles = await uploadFiles(filesToUpload);
    }

    const historyMessages = chatSessionsRef.current.find((chat) => chat.id === currentChatId)?.messages || [];
    const history = buildHistory(historyMessages);

    const userMessage: Message = {
      id: generateMessageId(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      branchId: 'main',
      children: [],
    };

    appendMessage(userMessage, currentChatId);
    clearSelectedFiles();

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
    appendMessage(aiMessage, currentChatId);

    const request: MessageRequest = {
      text: messageText,
      files: uploadedFiles,
      history,
      responseMessageId: aiMessageId,
    };

    const controller = trackStream(currentChatId, aiMessageId);

    if (selectedResponseModeRef.current === 'fetch') {
      try {
        const response = await getAdapter().sendMessage(request, controller.signal);
        updateMessageInChat(currentChatId, aiMessageId, {
          text: response.text,
          imageUrl: response.imageUrl,
          thinkingContent: response.thinking,
          isThinkingComplete: true,
          isComplete: true,
        });
      } catch (fetchError) {
        const resolvedError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        if (resolvedError.name === 'AbortError' || controller.signal.aborted) {
          updateMessageInChat(currentChatId, aiMessageId, {
            isComplete: true,
            isThinkingComplete: true,
            wasPaused: true,
          });
        } else {
          updateMessageInChat(currentChatId, aiMessageId, {
            text: 'Sorry, there was an error processing your request.',
            isComplete: true,
            isThinkingComplete: true,
          });
          setError(resolvedError.message || 'Request failed');
        }
      } finally {
        finalizeStreamForChat(currentChatId);
      }
      return;
    }

    await runStreamingRequest(request, currentChatId, aiMessageId, controller);
  }, [
    appendMessage,
    autoCreateChat,
    clearSelectedFiles,
    finalizeStreamForChat,
    getAdapter,
    runStreamingRequest,
    trackStream,
    updateMessageInChat,
    uploadFiles,
  ]);

  const handlePauseRequest = useCallback(() => {
    const currentChatId = activeChatIdRef.current;
    if (!currentChatId) return;
    stopStreamForChat(currentChatId);
  }, [stopStreamForChat]);

  const stop = handlePauseRequest;

  const activeChatMessages = useMemo(() => {
    const chat = chatSessions.find((session) => session.id === activeChatId);
    return chat ? chat.messages : [];
  }, [chatSessions, activeChatId]);

  const isStreaming = activeChatId ? Boolean(streamingByChat[activeChatId]) : false;
  const combinedIsProcessing = isStreaming || isFileProcessing;

  useEffect(() => {
    const currentBlobUrls = new Set<string>();
    for (let i = 0; i < chatSessions.length; i += 1) {
      const messages = chatSessions[i].messages;
      for (let j = 0; j < messages.length; j += 1) {
        const url = messages[j].imageUrl;
        if (typeof url === 'string' && url.startsWith('blob:')) {
          currentBlobUrls.add(url);
        }
      }
    }

    for (const tracked of activeBlobImageUrlsRef.current) {
      if (!currentBlobUrls.has(tracked)) {
        URL.revokeObjectURL(tracked);
      }
    }
    activeBlobImageUrlsRef.current = currentBlobUrls;
  }, [chatSessions]);

  useEffect(() => {
    return () => {
      abortAllStreams();
      selectedFilesRef.current.forEach(revokePreviewUrl);
      for (const url of activeBlobImageUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      activeBlobImageUrlsRef.current.clear();
    };
  }, [abortAllStreams]);

  return {
    chatSessions,
    activeChatId,
    activeChatMessages,
    selectedResponseMode,
    setSelectedResponseMode,
    isStreaming,
    isFileProcessing,
    combinedIsProcessing,
    selectedFiles,
    error,
    clearError,
    createChat,
    setActiveChat,
    deleteChat,
    clearChats,
    appendMessage,
    setMessages,
    processFiles,
    handleFileRemove,
    handlePauseRequest,
    stop,
    handleSendMessage,
  };
};
