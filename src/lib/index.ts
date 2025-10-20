/**
 * Chat UI Component Library
 *
 * Main entry point for using Chat UI as a reusable component library.
 * Export core components, stores, services, types, and utilities.
 */

// ============================================================================
// Core Components
// ============================================================================
export { default as ChatInterface } from '../components/ChatInterface';
export { default as MessageList } from '../components/MessageList';
export { default as MessageInput } from '../components/MessageInput';
export { default as MessageItem } from '../components/MessageItem';
export { default as Sidebar } from '../components/Sidebar';
export { default as Settings } from '../components/Settings';
export { default as ChatList } from '../components/ChatList';

// ============================================================================
// UI Components
// ============================================================================
export { default as LoadingIndicator } from '../components/LoadingIndicator';
export { default as ThinkingIndicator } from '../components/ThinkingIndicator';
export { default as ThinkingSection } from '../components/ThinkingSection';
export { default as ErrorBoundary } from '../components/ErrorBoundary';
export { ToastContainer } from '../components/Toast';
export { default as ChartRenderer } from '../components/ChartRenderer';

// ============================================================================
// Sub-components
// ============================================================================
export { default as BranchNavigator } from '../components/MessageItem/BranchNavigator';
export { default as MessageActions } from '../components/MessageItem/MessageActions';
export { EmbeddedImage, FileAttachment } from '../components/MessageItem/FileComponents';
export { default as CodeBlock } from '../components/MessageItem/CodeBlock';

// ============================================================================
// State Management (Zustand Stores)
// ============================================================================
export {
  default as useChatStore,
} from '../stores/chatStore';

export {
  default as useThemeStore,
} from '../stores/themeStore';

export {
  default as useToastStore,
} from '../stores/toastStore';

export {
  default as useResponseModeStore,
} from '../stores/responseModeStore';

export {
  default as useServiceConfigStore,
} from '../stores/serviceConfigStore';

export {
  default as useInputStore,
} from '../stores/inputStore';

export {
  default as useMcpStore,
} from '../stores/mcpStore';

// Store selectors for performance optimization
export {
  useChatData,
  useChatActions,
  useBranchData,
} from '../stores/selectors';

// ============================================================================
// Services
// ============================================================================
export { ChatService } from '../services/chatService';
export { fileService } from '../services/fileService';
export { streamManager } from '../services/streamManager';
export { getMcpConfigViaAdapter, isMcpConfigSupported } from '../services/mcpConfigService';

// Service Factory
export { serviceFactory } from '../services/serviceFactory';

// ============================================================================
// Custom Hooks
// ============================================================================
export { useFileUpload } from '../hooks/useFileUpload';
export { useStreamingMessage } from '../hooks/useStreamingMessage';
export { useImageUrlCache } from '../hooks/useImageUrlCache';

// ============================================================================
// Types
// ============================================================================
export type {
  Message,
  MessageFile,
  Chat,
  ResponseMode,
} from '../types/chat';

export type {
  ChatStore,
  ThemeStore,
  ToastStore,
  ResponseModeStore,
} from '../types/store';

export type {
  MessageResponse,
  StreamMessageChunk,
  ConversationMessage,
} from '../types/api';

export type {
  MCPServerConfig,
  MCPConfigPayload,
} from '../types/mcp';

// ============================================================================
// Utilities
// ============================================================================
export { configManager } from '../utils/config';
export { generateMessageId, generateChatId } from '../utils/id';
export { buildHistory } from '../utils/messageUtils';

// ============================================================================
// CSS - Import Tailwind styles
// ============================================================================
// Note: Consumer applications must configure Tailwind CSS
// See COMPONENT_USAGE.md for setup instructions
import { ensureChatUiStyles } from './styleManager';
// Auto-inject styles so consumers don't need to import CSS
ensureChatUiStyles();

// ============================================================================
// Turnkey App Shells
// ============================================================================
export { default } from './ChatUIApp';
export { default as ChatUIApp } from './ChatUIApp';
export type { ChatUIAppProps } from './ChatUIApp';
