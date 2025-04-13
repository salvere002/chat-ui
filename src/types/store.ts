import { Message, Chat, Agent } from './chat';

// Define interface for the chat store state
export interface ChatStore {
  // State
  chatSessions: Chat[];
  activeChatId: string | null;
  isProcessing: boolean;
  error: string | null;
  
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

// Define interface for the agent store state
export interface AgentStore {
  selectedAgent: Agent;
  setSelectedAgent: (agent: Agent) => void;
} 