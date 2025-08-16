import { Message, Chat, ResponseMode, BranchNode, Agent, Model } from './chat';

// Define interface for the chat store state
export interface ChatStore {
  // State
  chatSessions: Chat[];
  activeChatId: string | null;
  isProcessing: boolean;
  error: string | null;
  activeRequestController: AbortController | null;
  // Branch state
  activeBranchPath: Map<string, string[]>; // chatId -> branch path
  branchTree: Map<string, Map<string, BranchNode>>; // chatId -> branchId -> BranchNode
  messageBranches: Map<string, Map<string, string[]>>; // chatId -> messageId -> branchIds
  // Suggestions state
  suggestions: Map<string, string[]>; // chatId -> suggested questions
  isSuggestionsLoading: boolean;
  
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
  setActiveRequestController: (controller: AbortController | null) => void;
  pauseCurrentRequest: () => void;
  // Branch actions
  getCurrentBranchMessages: (chatId: string) => Message[];
  createBranchFromMessage: (chatId: string, messageId: string, newMessage: Message) => string;
  switchToBranch: (chatId: string, branchId: string) => void;
  deleteBranch: (chatId: string, branchId: string) => void;
  getBranchingPoints: (chatId: string) => Message[];
  getBranchOptionsAtMessage: (chatId: string, messageId: string) => BranchNode[];
  getBreadcrumb: (chatId: string) => string[];
  clearAllChats: () => void;
  // Suggestions actions
  setSuggestions: (chatId: string, suggestions: string[]) => void;
  getSuggestions: (chatId: string) => string[];
  clearSuggestions: (chatId: string) => void;
  setSuggestionsLoading: (loading: boolean) => void;
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

// Define interface for the agent store state
export interface AgentStore {
  agents: Agent[];
  selectedAgentId: string | null;
  deepResearchEnabled: boolean;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeAgent: (agentId: string) => void;
  setSelectedAgent: (agentId: string | null) => void;
  getUserSelectedAgent: () => Agent | null;
  setDeepResearchEnabled: (enabled: boolean) => void;
  getSelectableAgents: () => Agent[];
  getEffectiveAgent: () => Agent | null;
}

// Define interface for the model store state
export interface ModelStore {
  models: Model[];
  selectedModelId: string | null;
  setModels: (models: Model[]) => void;
  addModel: (model: Model) => void;
  updateModel: (modelId: string, updates: Partial<Model>) => void;
  removeModel: (modelId: string) => void;
  setSelectedModel: (modelId: string | null) => void;
  getSelectedModel: () => Model | null;
}

// Define interface for the UI settings store state
export interface UiSettingsStore {
  // Settings
  showSuggestions: boolean;
  
  // Actions
  setShowSuggestions: (show: boolean) => void;
  toggleSuggestions: () => void;
} 