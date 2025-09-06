import { useShallow } from 'zustand/react/shallow';
import useChatStore from './chatStore';

// Selective chat data subscriptions (read-only data)
export const useChatData = () => useChatStore(useShallow((state) => ({
  activeChatId: state.activeChatId,
  chatSessions: state.chatSessions,
  activeBranchPath: state.activeBranchPath,
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
  // Streaming actions (simplified)
  pauseChatRequest: state.pauseChatRequest,
  isChatStreaming: state.isChatStreaming,
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

// Streaming state access (use streamManager directly)
// Note: Components should import streamManager directly for streaming state

// Note: Avoid computing arrays in selectors to preserve shallow-compare benefits.
