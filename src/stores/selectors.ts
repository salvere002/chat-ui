import { useShallow } from 'zustand/react/shallow';
import useChatStore from './chatStore';
import useMcpStore from './mcpStore';
import type { MCPToolInfo } from '../services/mcpService';

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
  selectChat: state.selectChat,
  addMessageToChat: state.addMessageToChat,
  updateMessageInChat: state.updateMessageInChat,
  renameChatSession: state.renameChatSession,
  // Streaming actions (simplified)
  pauseChatRequest: state.pauseChatRequest,
  isChatStreaming: state.isChatStreaming,
  // Backend integration actions
  setChatList: state.setChatList,
  markChatAsLoading: state.markChatAsLoading,
  loadChatDetails: state.loadChatDetails,
  updateChatMetadata: state.updateChatMetadata,
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

// MCP data selectors (read-only access to MCP information)
export const useMcpData = () => useMcpStore(useShallow((state) => ({
  servers: state.servers,
  parsed: state.parsed,
})));

// Get only active (enabled and successfully connected) MCP servers
// Return only keys for active servers to minimize re-renders
export const useActiveMcpServerKeys = () => useMcpStore(useShallow((state) => {
  const keys = Object.keys(state.servers);
  const activeKeys: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const s = state.servers[k];
    if (s?.enabled && s.status === 'ok') activeKeys.push(k);
  }
  return activeKeys;
}));

// Get all available tools from active MCP servers
// Return a light-weight lookup of tools by server key
export const useActiveMcpToolsByServer = () => useMcpStore(useShallow((state) => {
  const result: Record<string, MCPToolInfo[]> = {};
  const servers = state.servers;
  for (const key in servers) {
    const s = servers[key];
    if (s?.enabled && s.status === 'ok' && Array.isArray(s.tools)) {
      result[key] = s.tools;
    }
  }
  return result;
}));

// MCP actions
export const useMcpActions = () => useMcpStore(useShallow((state) => ({
  setEnabled: state.setEnabled,
  refreshServer: state.refreshServer,
  refreshAll: state.refreshAll,
})));
