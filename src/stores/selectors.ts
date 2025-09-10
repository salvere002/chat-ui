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

// MCP data selectors (read-only access to MCP information)
export const useMcpData = () => useMcpStore(useShallow((state) => ({
  servers: state.servers,
  parsed: state.parsed,
})));

// Get only active (enabled and successfully connected) MCP servers
export const useActiveMcpServers = () => useMcpStore(useShallow((state) => {
  const activeServers = Object.values(state.servers).filter(
    server => server.enabled && server.status === 'ok'
  );
  return activeServers;
}));

// Get all available tools from active MCP servers
export const useActiveMcpTools = () => useMcpStore(useShallow((state) => {
  const allTools: Array<{ serverKey: string; serverName?: string; tool: MCPToolInfo }> = [];
  Object.values(state.servers).forEach(server => {
    if (server.enabled && server.status === 'ok' && server.tools) {
      server.tools.forEach(tool => {
        allTools.push({
          serverKey: server.key,
          serverName: server.name,
          tool
        });
      });
    }
  });
  return allTools;
}));

// MCP actions
export const useMcpActions = () => useMcpStore(useShallow((state) => ({
  setEnabled: state.setEnabled,
  refreshServer: state.refreshServer,
  refreshAll: state.refreshAll,
})));
