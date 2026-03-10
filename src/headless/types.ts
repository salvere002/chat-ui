import type { Message, PreviewFile } from '../types/chat';

export interface PendingUploadFile {
  id: string;
  file: File;
}

export interface ChatHeadlessRuntime {
  activeChatId: string | null;
  activeChatMessages: Message[];
  combinedIsProcessing: boolean;
  isFileProcessing: boolean;
  selectedFiles: PreviewFile[];
  error: string | null;
  clearError: () => void;
  handlePauseRequest: () => void;
  handleSendMessage: (messageText: string, filesToUpload?: PendingUploadFile[]) => Promise<void>;
  handleFileRemove: (fileId: string) => void;
  processFiles: (files: FileList) => void;
}
