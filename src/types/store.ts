import { Message, Chat, ResponseMode, BranchNode } from './chat';

// Define interface for the chat store state
export interface ChatStore {
  // State
  chatSessions: Chat[];
  activeChatId: string | null;
  isProcessing: boolean;
  error: string | null;
  // Branch state
  activeBranchPath: Map<string, string[]>; // chatId -> branch path
  branchTree: Map<string, Map<string, BranchNode>>; // chatId -> branchId -> BranchNode
  messageBranches: Map<string, Map<string, string[]>>; // chatId -> messageId -> branchIds
  
  // Actions
  createChat: (name?: string) => string;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string) => void;
  getChatById: (id: string) => Chat | undefined;
  addMessageToChat: (chatId: string, message: Message) => void;
  updateMessageInChat: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  renameChatSession: (chatId: string, newName: string) => void;
  clearError: () => void;
  setProcessing: (isProcessing: boolean) => void;
  // Branch actions
  getCurrentBranchMessages: (chatId: string) => Message[];
  createBranchFromMessage: (chatId: string, messageId: string, newMessage: Message) => string;
  switchToBranch: (chatId: string, branchId: string) => void;
  deleteBranch: (chatId: string, branchId: string) => void;
  getBranchingPoints: (chatId: string) => Message[];
  getBranchOptionsAtMessage: (chatId: string, messageId: string) => BranchNode[];
  getBreadcrumb: (chatId: string) => string[];
}

// Define interface for the theme store state
export interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Define interface for the toast store state
export interface ToastStore {
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  }>;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  hideToast: (id: string) => void;
}

// Define interface for the response mode store state
export interface ResponseModeStore {
  selectedResponseMode: ResponseMode;
  setSelectedResponseMode: (responseMode: ResponseMode) => void;
} 