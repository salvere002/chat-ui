import { useShallow } from 'zustand/react/shallow';
import useChatStore from './chatStore';

// Selective chat data subscriptions (read-only data)
export const useChatData = () => useChatStore(useShallow((state) => ({
  activeChatId: state.activeChatId,
  chatSessions: state.chatSessions,
  activeBranchPath: state.activeBranchPath,
  isProcessing: state.isProcessing,
  error: state.error,
})));

// Chat actions (methods that modify state)
export const useChatActions = () => useChatStore(useShallow((state) => ({
  createChat: state.createChat,
  deleteChat: state.deleteChat,
  clearAllChats: state.clearAllChats,
  setActiveChat: state.setActiveChat,
  addMessageToChat: state.addMessageToChat,
  updateMessageInChat: state.updateMessageInChat,
  renameChatSession: state.renameChatSession,
  setProcessing: state.setProcessing,
  setActiveRequestController: state.setActiveRequestController,
  pauseCurrentRequest: state.pauseCurrentRequest,
})));

// Branch-related actions and data
export const useBranchActions = () => useChatStore(useShallow((state) => ({
  createBranchFromMessage: state.createBranchFromMessage,
  switchToBranch: state.switchToBranch,
  deleteBranch: state.deleteBranch,
  getBranchOptionsAtMessage: state.getBranchOptionsAtMessage,
  getBreadcrumb: state.getBreadcrumb,
})));

// Branch data access (for reading messages in branches)
export const useBranchData = () => useChatStore(useShallow((state) => ({
  getCurrentBranchMessages: state.getCurrentBranchMessages,
  getBranchingPoints: state.getBranchingPoints,
})));

// Utility functions (lightweight, stable)
export const useChatUtils = () => useChatStore(useShallow((state) => ({
  getChatById: state.getChatById,
  clearError: state.clearError,
})));

// Processing state only (for components that only need to know if processing)
export const useProcessingState = () => useChatStore(useShallow((state) => ({
  isProcessing: state.isProcessing,
  activeRequestController: state.activeRequestController,
})));

// Active chat specific data
export const useActiveChatData = () => useChatStore(useShallow((state) => ({
  activeChatId: state.activeChatId,
  activeChatMessages: state.activeChatId ? state.getCurrentBranchMessages(state.activeChatId) : [],
})));