import type { AdapterType } from '../services/serviceFactory';
import type { BaseAdapter } from '../services/adapters/BaseAdapter';
import type { Chat, Message, PreviewFile, ResponseMode } from '../types/chat';
import type { PendingUploadFile } from './types';

export interface IsolatedHeadlessServiceConfig {
  adapterType?: AdapterType;
  baseUrl?: string;
}

export interface IsolatedHeadlessAdapterFactoryParams {
  adapterType: AdapterType;
  baseUrl: string;
}

export type IsolatedHeadlessAdapterFactory = (
  params: IsolatedHeadlessAdapterFactoryParams
) => BaseAdapter;

export interface IsolatedChatHeadlessOptions {
  serviceConfig?: IsolatedHeadlessServiceConfig;
  adapter?: BaseAdapter;
  adapterFactory?: IsolatedHeadlessAdapterFactory;
  initialResponseMode?: ResponseMode;
  autoCreateChat?: boolean;
}

export interface IsolatedChatHeadlessRuntime {
  chatSessions: Chat[];
  activeChatId: string | null;
  activeChatMessages: Message[];
  selectedResponseMode: ResponseMode;
  setSelectedResponseMode: (mode: ResponseMode) => void;
  isStreaming: boolean;
  isFileProcessing: boolean;
  combinedIsProcessing: boolean;
  selectedFiles: PreviewFile[];
  error: string | null;
  clearError: () => void;
  createChat: (name?: string) => string;
  setActiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearChats: () => void;
  appendMessage: (message: Message, chatId?: string) => void;
  setMessages: (messages: Message[], chatId?: string) => void;
  processFiles: (files: FileList) => void;
  handleFileRemove: (fileId: string) => void;
  handlePauseRequest: () => void;
  stop: () => void;
  handleSendMessage: (messageText: string, filesToUpload?: PendingUploadFile[]) => Promise<void>;
}
