import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import { ToastContainer } from '../components/Toast';
import { useChatStore, useThemeStore, useResponseModeStore, useServiceConfigStore, useMcpStore } from '../stores';
import { useShallow } from 'zustand/react/shallow';
import Settings from '../components/Settings';
import ErrorBoundary from '../components/ErrorBoundary';
import { FaSun, FaMoon, FaCog, FaBars, FaTimes } from 'react-icons/fa';
import { getMcpConfigViaAdapter, isMcpConfigSupported } from '../services/mcpConfigService';
import type { AdapterType } from '../services/serviceFactory';
import type { ResponseMode } from '../types/chat';
import { ensureChatUiStyles } from './styleManager';

/**
 * ChatUIApp
 *
 * Full-page chat application shell that composes Sidebar + ChatInterface
 * and wires up the minimal stores required (theme + response mode + chat).
 *
 * Consumers can import this default export to render a complete chat UI
 * without caring about internal components.
 */
export interface ChatUIAppProps {
  variant?: 'auto' | 'full' | 'embedded';
  className?: string;
  style?: React.CSSProperties;
  title?: string;

  // One-shot configuration knobs for consumers embedding the full app
  serviceConfig?: {
    adapterType?: AdapterType;
    baseUrl?: string;
  };
  initialTheme?: 'light' | 'dark';
  initialResponseMode?: ResponseMode;
  hideHeader?: boolean;
  defaultSidebarCollapsed?: boolean;
  mcpSync?: boolean; // enable/disable auto MCP config sync
}

const ChatUIApp: React.FC<ChatUIAppProps> = ({
  variant = 'auto',
  className,
  style,
  title = 'Chat UI',
  serviceConfig,
  initialTheme,
  initialResponseMode,
  hideHeader,
  defaultSidebarCollapsed = false,
  mcpSync = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  // Ensure styles are present (no CSS import required by consumer)
  useEffect(() => { ensureChatUiStyles(); }, []);
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const { selectedResponseMode, setSelectedResponseMode } = useResponseModeStore();

  const sidebarData = useChatStore(useShallow((s) => ({
    chats: s.chatSessions,
    activeChatId: s.activeChatId,
  })));
  const sidebarActions = useChatStore(useShallow((s) => ({
    setActiveChat: s.setActiveChat,
    createChat: s.createChat,
    deleteChat: s.deleteChat,
    clearAllChats: s.clearAllChats,
  })));

  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!!defaultSidebarCollapsed);

  // Observe container size for auto-adaptive layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, []);

  // Apply consumer-provided initial theme once on mount
  useEffect(() => {
    if (initialTheme === 'light' || initialTheme === 'dark') {
      setTheme(initialTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply consumer-provided initial response mode once on mount
  useEffect(() => {
    if (initialResponseMode === 'stream' || initialResponseMode === 'fetch') {
      setSelectedResponseMode(initialResponseMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bootstrap + re-sync MCP config whenever adapter changes (parity with standalone)
  const { type: currentAdapterType, url: currentAdapterBaseUrl } = useServiceConfigStore(useShallow((s) => ({
    type: s.currentAdapterType,
    url: s.configs[s.currentAdapterType].baseUrl,
  })));
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!mcpSync) return;
        if (!isMcpConfigSupported()) return;
        const remote = await getMcpConfigViaAdapter();
        if (cancelled) return;
        if (remote && typeof remote === 'object') {
          await useMcpStore.getState().setJson(JSON.stringify(remote));
        }
      } catch {
        // Ignore adapters/backends that don't support MCP sync
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentAdapterType, currentAdapterBaseUrl, mcpSync]);

  // Apply consumer-provided service configuration on change
  const applyServiceConfig = useMemo(() => ({
    adapterType: serviceConfig?.adapterType,
    baseUrl: serviceConfig?.baseUrl,
  }), [serviceConfig?.adapterType, serviceConfig?.baseUrl]);

  useEffect(() => {
    const state = useServiceConfigStore.getState();
    const incomingType = applyServiceConfig.adapterType;
    const incomingBaseUrl = applyServiceConfig.baseUrl;
    if (!incomingType && !incomingBaseUrl) return;

    try {
      const activeType = state.currentAdapterType;
      const targetType = incomingType || activeType;
      if (incomingBaseUrl) {
        state.updateConfig(targetType, { baseUrl: incomingBaseUrl });
      }
      if (incomingType) {
        state.setCurrentAdapterType(incomingType);
      }
    } catch (e) {
      // Non-fatal: if consumer passes invalid data, ignore
      // eslint-disable-next-line no-console
      console.warn('Invalid serviceConfig provided to ChatUIApp:', e);
    }
  }, [applyServiceConfig]);

  const handleThemeClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const effectiveVariant: 'embedded' | 'full' = useMemo(() => {
    if (variant === 'auto') return 'embedded';
    return variant;
  }, [variant]);

  // Show header by default for full parity with mobile view.
  // Consumers can explicitly hide it via prop.
  const effectiveHideHeader = hideHeader === true;

  // Calculate sidebar max-height based on container size
  const sidebarMaxHeight = useMemo(() => {
    if (!containerSize) return undefined;
    // Subtract header height (if present) and some padding
    const headerHeight = effectiveHideHeader ? 0 : 60; // Approximate header height
    const padding = 20; // Some padding from bottom
    return `${containerSize.height - headerHeight - padding}px`;
  }, [containerSize, effectiveHideHeader]);
  const containerClass = effectiveVariant === 'embedded'
    ? 'flex flex-col h-full w-full bg-bg-primary text-text-primary relative overflow-hidden'
    : 'flex flex-col h-screen w-screen bg-bg-primary text-text-primary relative overflow-hidden';

  // Whether we want overlay-style sidebar (like mobile) based on container size
  const overlay = variant === 'auto' ? (containerSize ? containerSize.width < 520 || containerSize.height < 560 : false) : effectiveVariant === 'embedded';

  return (
    <div ref={containerRef} data-theme={theme} className={`@container ${containerClass} ${className ?? ''}`.trim()} style={style}>
      {/* Header bar */}
      {!effectiveHideHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border-primary z-sticky">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => {
                setSidebarOpen((prev) => {
                  const next = !prev;
                  // When opening in overlay mode (mobile/embedded), ensure expanded state
                  if (next && overlay) {
                    setSidebarCollapsed(false);
                  }
                  return next;
                });
              }}
              className={`${overlay ? '' : 'lg:hidden'} flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95`}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <FaTimes className="relative z-10" /> : <FaBars className="relative z-10" />}
            </button>
            <h1 className="text-xl font-semibold text-text-primary transition-opacity duration-200 select-none">{title}</h1>
          </div>
          <div className="flex gap-2 items-center">
            {/* Theme toggle */}
            <button
              onClick={handleThemeClick}
              className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <FaMoon className="relative z-10" /> : <FaSun className="relative z-10" />}
            </button>
            {/* Settings */}
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95"
              aria-label="Open settings"
            >
              <FaCog className="relative z-10" />
            </button>
          </div>
        </div>
      )}

      {/* Settings modal (scoped to container) */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
          scopeTo={containerRef.current ?? undefined}
        />
      )}

      {/* Toasts */}
      <ToastContainer />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden w-full relative">
        {/* Overlay for compact/auto mode */}
        {sidebarOpen && overlay && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-modal" onClick={() => setSidebarOpen(false)} />
        )}
        {/* Sidebar */}
        <div
          className={overlay
            ? `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} absolute z-modal transition-transform duration-300 ease-in-out`
            : 'relative z-auto translate-x-0'}
          style={overlay ? { top: 0, left: 0 } : undefined}
        >
          <ErrorBoundary>
            <Sidebar
              chats={sidebarData.chats}
              activeChatId={sidebarData.activeChatId}
              onChatSelected={(id) => { sidebarActions.setActiveChat(id); setSidebarOpen(false); }}
              onNewChat={() => { const id = sidebarActions.createChat('New Conversation'); sidebarActions.setActiveChat(id); setSidebarOpen(false); }}
              onDeleteChat={sidebarActions.deleteChat}
              onClearAllChats={sidebarActions.clearAllChats}
              collapsed={sidebarCollapsed}
              onCollapse={() => {
                // In overlay mode (mobile/embedded), collapse should close the sidebar entirely
                if (overlay) {
                  setSidebarOpen(false);
                  return;
                }
                setSidebarCollapsed((c) => !c);
              }}
              maxHeight={overlay ? sidebarMaxHeight : undefined}
              isVisible={!overlay || sidebarOpen}
            />
          </ErrorBoundary>
        </div>
        {/* Chat content */}
        <div className={effectiveVariant === 'embedded' ? 'flex-1 min-h-0 overflow-hidden w-full' : 'flex-1 overflow-hidden w-full lg:w-auto'}>
          <ErrorBoundary>
            <ChatInterface selectedResponseMode={selectedResponseMode} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default ChatUIApp;
