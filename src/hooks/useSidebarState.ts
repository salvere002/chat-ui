import { useState, useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatStore, useStudioStore } from '../stores';

interface SidebarStateOptions {
  isLargeScreen: boolean;
}

interface SidebarState {
  // State
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Chat data
  chatSessions: ReturnType<typeof useChatStore.getState>['chatSessions'];
  activeChatId: string | null;
  activeChat: ReturnType<typeof useChatStore.getState>['chatSessions'][number] | undefined;
  studioChatState: ReturnType<typeof useStudioStore.getState>['chats'][string] | undefined;
  hasStudioFiles: boolean;
  shouldShowStudio: boolean;

  // Actions
  sidebarActions: {
    selectChat: (id: string) => void;
    createChat: (title: string) => string;
    deleteChat: (id: string) => void;
    clearAllChats: () => void;
  };

  // Handlers
  handleSidebarToggle: () => void;
  handleSidebarCollapse: () => void;
  handleMobileSidebarClose: () => void;
  handleChatSelected: (chatId: string) => void;
  handleNewChatAndClose: () => void;
}

/**
 * Hook that manages sidebar state including open/collapsed states,
 * chat selection, and auto-collapse behavior for studio mode.
 */
export function useSidebarState({ isLargeScreen }: SidebarStateOptions): SidebarState {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const autoCollapsedStudioChatsRef = useRef<Set<string>>(new Set());

  // Chat data subscriptions
  const sidebarData = useChatStore(
    useShallow((state) => ({
      chatSessions: state.chatSessions,
      activeChatId: state.activeChatId,
    }))
  );

  const studioChatState = useStudioStore(
    useShallow((state) =>
      sidebarData.activeChatId ? state.chats[sidebarData.activeChatId] : undefined
    )
  );

  const sidebarActions = useChatStore(
    useShallow((state) => ({
      selectChat: state.selectChat,
      createChat: state.createChat,
      deleteChat: state.deleteChat,
      clearAllChats: state.clearAllChats,
    }))
  );

  // Derived state
  const activeChat = sidebarData.activeChatId
    ? sidebarData.chatSessions.find((c) => c.id === sidebarData.activeChatId)
    : undefined;
  const hasStudioFiles = Boolean(studioChatState && studioChatState.order.length > 0);
  const shouldShowStudio = isLargeScreen && Boolean(activeChat?.studioEnabled) && hasStudioFiles;

  // Auto-collapse sidebar when studio is shown for first time
  useEffect(() => {
    const chatId = sidebarData.activeChatId;
    if (!chatId) return;
    if (!isLargeScreen) return;
    if (!activeChat?.studioEnabled) return;
    if (!hasStudioFiles) return;

    if (!autoCollapsedStudioChatsRef.current.has(chatId)) {
      autoCollapsedStudioChatsRef.current.add(chatId);
      if (!sidebarCollapsed || sidebarOpen) {
        setSidebarCollapsed(true);
        setSidebarOpen(false);
      }
    }
  }, [
    sidebarData.activeChatId,
    isLargeScreen,
    activeChat?.studioEnabled,
    hasStudioFiles,
    sidebarCollapsed,
    sidebarOpen,
  ]);

  // Handlers
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      // When opening on mobile (< lg), ensure sidebar is expanded
      if (next && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarCollapsed(false);
      }
      return next;
    });
  }, []);

  const handleSidebarCollapse = useCallback(() => {
    // On mobile (< lg), closing should hide the sidebar entirely
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
      return;
    }
    // Desktop: toggle collapsed width
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleMobileSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleChatSelected = useCallback(
    (chatId: string) => {
      sidebarActions.selectChat(chatId);
      setSidebarOpen(false); // Close sidebar on mobile after selection
    },
    [sidebarActions]
  );

  const handleNewChatAndClose = useCallback(() => {
    const newChatId = sidebarActions.createChat('New Conversation');
    sidebarActions.selectChat(newChatId);
    setSidebarOpen(false); // Close sidebar on mobile after creating new chat
  }, [sidebarActions]);

  return {
    sidebarOpen,
    sidebarCollapsed,
    chatSessions: sidebarData.chatSessions,
    activeChatId: sidebarData.activeChatId,
    activeChat,
    studioChatState,
    hasStudioFiles,
    shouldShowStudio,
    sidebarActions,
    handleSidebarToggle,
    handleSidebarCollapse,
    handleMobileSidebarClose,
    handleChatSelected,
    handleNewChatAndClose,
  };
}

export default useSidebarState;
