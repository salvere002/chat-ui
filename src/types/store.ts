import { Message, Chat, ResponseMode, BranchNode, Agent, Model, ChatMetadata } from './chat';

// Define interface for the chat store state
export interface ChatStore {
  // State
  chatSessions: Chat[];
  activeChatId: string | null;
  // Track most recently selected chats (for local persistence trimming)
  recentChatIds: string[];
  error: string | null;
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
  clearAllChats: () => void;
  setActiveChat: (id: string) => void;
  selectChat: (id: string) => Promise<void>;
  getChatById: (id: string) => Chat | undefined;
  addMessageToChat: (chatId: string, message: Message) => void;
  updateMessageInChat: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  renameChatSession: (chatId: string, newName: string) => void;
  clearError: () => void;
  // Streaming actions (simplified - use streamManager directly)
  pauseChatRequest: (chatId: string) => void;
  isChatStreaming: (chatId: string) => boolean;
  // Branch actions
  getCurrentBranchMessages: (chatId: string) => Message[];
  createBranchFromMessage: (chatId: string, messageId: string, newMessage: Message) => string;
  switchToBranch: (chatId: string, branchId: string) => void;
  deleteBranch: (chatId: string, branchId: string) => void;
  getBranchingPoints: (chatId: string) => Message[];
  getBranchOptionsAtMessage: (chatId: string, messageId: string) => BranchNode[];
  getBreadcrumb: (chatId: string) => string[];
  // Dump/Load functionality with overloads
  dump(chatId: string): any; // Single conversation
  dump(): any; // All conversations
  load(data: any, replaceExisting?: boolean, chatId?: string): string | string[];

  // Backend integration actions
  setChatList: (chats: ChatMetadata[]) => void;
  markChatAsLoading: (chatId: string) => void;
  loadChatDetails: (chatId: string, messages: Message[], branchData?: any) => void;
  updateChatMetadata: (chatId: string, metadata: Partial<Chat>) => void;

  // Suggestions actions
  setSuggestions: ((chatId: string, suggestions: string[]) => void) & ((suggestions: string[]) => void);
  getSuggestions: (chatId?: string) => string[];
  clearSuggestions: (chatId?: string) => void;
  setSuggestionsLoading: (loading: boolean) => void;
}

// Define interface for the theme store state
export interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// Define interface for the toast store state
export interface ToastStore {
  showToast: (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ) => string;
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
  backgroundTexture: boolean;
  
  // Actions
  setShowSuggestions: (show: boolean) => void;
  toggleSuggestions: () => void;
  setBackgroundTexture: (texture: boolean) => void;
} 
