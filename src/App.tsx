import React, { useState, useCallback, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import { ToastContainer } from './components/Toast';
import { useThemeStore, useResponseModeStore, useUiSettingsStore } from './stores';
import Settings from './components/Settings';
import ShareModal from './components/ShareModal';
import LoadingIndicator from './components/LoadingIndicator';
import StudioPanel from './components/StudioPanel';
import useStudioStore from './stores/studioStore';
import { useScreenshotShare } from './hooks/useScreenshotShare';
import { useServiceBootstrap } from './hooks/useServiceBootstrap';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useSidebarState } from './hooks/useSidebarState';

const STUDIO_PANEL_LAYOUT_TRANSITION_MS = 300;

const App: React.FC = () => {
  // Theme and UI settings
  const { theme, toggleTheme } = useThemeStore();
  const { backgroundTexture } = useUiSettingsStore();
  const { selectedResponseMode, setSelectedResponseMode } = useResponseModeStore();

  // Responsive layout breakpoints
  const { isExtraWideScreen, isWideScreen, isLargeScreen } = useResponsiveLayout();

  // Service bootstrapping (MCP, Agents, Models)
  useServiceBootstrap();

  // Screenshot and share modal
  const {
    showShareModal,
    screenshotBlob,
    screenshotUrl,
    isCapturing,
    captureFullConversation,
    captureMessagePair,
    closeShareModal,
  } = useScreenshotShare();

  // Sidebar state management
  const {
    sidebarOpen,
    sidebarCollapsed,
    chatSessions,
    activeChatId,
    shouldShowStudio,
    sidebarActions,
    handleSidebarToggle,
    handleSidebarCollapse,
    handleMobileSidebarClose,
    handleChatSelected,
    handleNewChatAndClose,
  } = useSidebarState({ isLargeScreen });
  const isStudioPanelCollapsed = useStudioStore((state) => (
    activeChatId ? (state.chats[activeChatId]?.panelCollapsed ?? false) : false
  ));
  const [isStudioCollapsedForLayout, setIsStudioCollapsedForLayout] = useState(isStudioPanelCollapsed);

  useEffect(() => {
    if (isStudioPanelCollapsed) {
      const timerId = window.setTimeout(() => {
        setIsStudioCollapsedForLayout(true);
      }, STUDIO_PANEL_LAYOUT_TRANSITION_MS);
      return () => window.clearTimeout(timerId);
    }
    setIsStudioCollapsedForLayout(false);
  }, [isStudioPanelCollapsed]);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Generate texture class based on setting
  const getTextureClass = () => {
    return backgroundTexture ? 'texture-subtle' : 'texture-off';
  };

  // Memoized click handlers
  const handleThemeClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const handleSettingsClick = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
  }, []);

  return (
    <div
      className={`flex flex-col h-screen w-screen bg-bg-primary ${getTextureClass()} text-text-primary relative overflow-hidden`}
      aria-busy={isCapturing}
      {...(isCapturing ? { inert: true } : {})}
    >
      {/* Navigation bar */}
      <NavBar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={handleSidebarToggle}
        theme={theme}
        onThemeToggle={handleThemeClick}
        onShareClick={captureFullConversation}
        onSettingsClick={handleSettingsClick}
        isCapturing={isCapturing}
      />

      {/* Settings modal - only show on narrow screens */}
      {showSettings && !isWideScreen && (
        <Settings
          onClose={handleSettingsClose}
          selectedResponseMode={selectedResponseMode}
          onResponseModeChange={setSelectedResponseMode}
          isSidebar={false}
        />
      )}

      {/* Toast container for notifications */}
      <ToastContainer />

      {/* Share modal */}
      {showShareModal && screenshotUrl && (
        <ShareModal
          imageUrl={screenshotUrl}
          screenshotBlob={screenshotBlob || undefined}
          onClose={closeShareModal}
        />
      )}

      {/* Main app container */}
      <div className="flex flex-1 overflow-hidden w-full relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-modal"
            onClick={handleMobileSidebarClose}
          />
        )}

        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-modal lg:z-auto transition-transform duration-300 ease-in-out lg:block`}
          style={!isLargeScreen ? { top: 0, left: 0 } : undefined}
        >
          <ErrorBoundary>
            <Sidebar
              chats={chatSessions}
              activeChatId={activeChatId}
              onChatSelected={handleChatSelected}
              onNewChat={handleNewChatAndClose}
              onDeleteChat={sidebarActions.deleteChat}
              onClearAllChats={sidebarActions.clearAllChats}
              collapsed={sidebarCollapsed}
              onCollapse={handleSidebarCollapse}
              maxHeight={!isLargeScreen ? 'calc(100vh - 80px)' : undefined}
              isVisible={isLargeScreen || sidebarOpen}
            />
          </ErrorBoundary>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden w-full lg:w-auto @container">
          <ErrorBoundary>
            {shouldShowStudio && activeChatId ? (
              <div className="relative flex h-full">
                <div
                  className="min-w-0 shrink-0 transition-[flex-basis] duration-300 ease-in-out"
                  style={{ flexBasis: isStudioCollapsedForLayout ? '100%' : 'clamp(460px, 38vw, 760px)' }}
                >
                  <ChatInterface
                    selectedResponseMode={selectedResponseMode}
                    onMessagePairCapture={captureMessagePair}
                  />
                </div>
                <StudioPanel chatId={activeChatId} splitView={isExtraWideScreen} />
              </div>
            ) : (
              <ChatInterface
                selectedResponseMode={selectedResponseMode}
                onMessagePairCapture={captureMessagePair}
              />
            )}
          </ErrorBoundary>
        </div>

        {/* Settings sidebar - animated container for wide screens */}
        {isWideScreen && (
          <div
            className={`${showSettings ? 'w-[400px] opacity-100' : 'w-0 opacity-0'} overflow-hidden transition-all duration-300 ease-in-out`}
          >
            {showSettings && (
              <Settings
                onClose={() => setShowSettings(false)}
                selectedResponseMode={selectedResponseMode}
                onResponseModeChange={setSelectedResponseMode}
                isSidebar={true}
              />
            )}
          </div>
        )}
      </div>

      {/* Global capture overlay to disable all UI */}
      {isCapturing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9998] cursor-wait">
          <div className="px-6 py-4 rounded-lg bg-bg-elevated border border-border-primary shadow-lg">
            <LoadingIndicator size="large" type="spinner" text="Capturing… Please wait" />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
