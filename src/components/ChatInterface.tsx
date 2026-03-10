import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCode } from 'react-icons/fa';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingIndicator from './LoadingIndicator';
import SuggestedQuestions from './SuggestedQuestions';
import {
  useAgentStore,
  useChatActions,
  useChatData,
  useChatStore,
  useInputStore,
  useModelStore,
  useUiSettingsStore,
} from '../stores';
import { ResponseMode, type Chat } from '../types/chat';
import { useChatHeadless } from '../headless/useChatHeadless';

interface ChatInterfaceProps {
  selectedResponseMode: ResponseMode;
  onMessagePairCapture?: (messageId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedResponseMode, onMessagePairCapture }) => {
  const {
    activeChatId,
    activeChatMessages,
    combinedIsProcessing,
    isFileProcessing,
    selectedFiles,
    error,
    clearError,
    handlePauseRequest,
    handleSendMessage,
    handleFileRemove,
    processFiles,
  } = useChatHeadless(selectedResponseMode);

  const { chatSessions } = useChatData();
  const { updateChatMetadata } = useChatActions();
  const { showSuggestions } = useUiSettingsStore();
  const { getSuggestions, isSuggestionsLoading } = useChatStore();
  const { setInputValue } = useInputStore();

  const activeChat = useMemo(
    () => chatSessions.find((chat) => chat.id === activeChatId),
    [activeChatId, chatSessions]
  );

  useEffect(() => {
    if (!activeChatId) return;
    const chat = chatSessions.find((session) => session.id === activeChatId);
    if (!chat) return;

    const agentState = useAgentStore.getState();
    const modelState = useModelStore.getState();

    const storedAgentId = chat.selectedAgentId;
    const storedModelId = chat.selectedModelId;

    if (storedAgentId != null && agentState.selectedAgentId !== storedAgentId) {
      agentState.setSelectedAgent(storedAgentId);
    }
    if (storedModelId != null && modelState.selectedModelId !== storedModelId) {
      modelState.setSelectedModel(storedModelId);
    }

    const initUpdates: Partial<Chat> = {};
    if (storedAgentId == null && agentState.selectedAgentId != null) {
      initUpdates.selectedAgentId = agentState.selectedAgentId;
    }
    if (storedModelId == null && modelState.selectedModelId != null) {
      initUpdates.selectedModelId = modelState.selectedModelId;
    }
    if (Object.keys(initUpdates).length > 0) {
      updateChatMetadata(activeChatId, initUpdates);
    }
  }, [activeChatId, chatSessions, updateChatMetadata]);

  const currentSuggestions = getSuggestions(activeChatId || undefined);

  const [isInputFocused, setIsInputFocused] = useState(false);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputFocusChange = (focused: boolean) => {
    if (focused) {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      setIsInputFocused(true);
    } else {
      focusTimeoutRef.current = setTimeout(() => {
        setIsInputFocused(false);
      }, 150);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    setIsInputFocused(false);
  };

  const hasNoActiveChat = !activeChatId;
  const hasActiveChatButEmpty = Boolean(activeChatId && activeChatMessages.length === 0);
  const hasMessages = Boolean(activeChatId && activeChatMessages.length > 0);
  const showWelcome = hasNoActiveChat || hasActiveChatButEmpty;
  const showStudioWelcome = Boolean(activeChatId && hasActiveChatButEmpty && activeChat?.studioEnabled);

  const previousMessageCount = useRef(0);
  const [shouldAnimateTransition, setShouldAnimateTransition] = useState(false);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentMessageCount = activeChatMessages.length;

    if (previousMessageCount.current === 0 && currentMessageCount > 0) {
      setShouldAnimateTransition(true);
      setTimeout(() => setShouldAnimateTransition(false), 500);
    }

    previousMessageCount.current = currentMessageCount;
  }, [activeChatMessages.length]);

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {showWelcome ? (
        <div className="flex flex-col h-full justify-center items-center px-4 py-8">
          <div className="text-center max-w-[420px] mb-2 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-bg-elevated border border-border-secondary text-accent-primary rounded-2xl text-4xl">
              {showStudioWelcome ? <FaCode className="text-3xl" /> : '💬'}
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-3">
              {showStudioWelcome ? 'Start a Studio Conversation' : 'Start a Conversation'}
            </h3>
            <p className="text-base text-text-secondary leading-relaxed m-0">
              {showStudioWelcome
                ? 'Build files and code in Studio mode. Ask for components, scripts, or full project scaffolds.'
                : "Ask me anything! I'm here to help with your questions, tasks, and creative projects."}
            </p>
          </div>

          <div className="w-full max-w-4xl xl:max-w-[1100px] 2xl:max-w-[1400px]">
            {showSuggestions && (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <SuggestedQuestions
                    suggestions={combinedIsProcessing ? [] : currentSuggestions}
                    isLoading={isSuggestionsLoading}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
              </div>
            )}

            <MessageInput
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
              onProcessFiles={processFiles}
              showTopBorder={false}
              onFocusChange={handleInputFocusChange}
            />
          </div>
        </div>
      ) : (
        <>
          {activeChat?.studioEnabled && (
            <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary/80 border-b border-border-secondary text-text-secondary text-xs">
              <FaCode className="text-accent-primary" />
              <span className="font-medium">Studio Mode</span>
            </div>
          )}

          <MessageList
            messages={activeChatMessages}
            chatId={activeChatId}
            onMessagePairCapture={onMessagePairCapture}
          />

          <div className={`relative ${shouldAnimateTransition ? 'animate-input-to-bottom' : ''}`}>
            {showSuggestions && isInputFocused && currentSuggestions.length > 0 && !combinedIsProcessing && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-full max-w-4xl xl:max-w-[1100px] 2xl:max-w-[1400px] px-4 z-dropdown">
                <div className="flex justify-center">
                  <div className="w-full max-w-2xl">
                    <SuggestedQuestions
                      suggestions={currentSuggestions}
                      isLoading={isSuggestionsLoading}
                      onSuggestionClick={handleSuggestionClick}
                    />
                  </div>
                </div>
              </div>
            )}

            <MessageInput
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
              onProcessFiles={processFiles}
              showTopBorder={true}
              onFocusChange={handleInputFocusChange}
            />
          </div>
        </>
      )}

      {isFileProcessing && (
        <div className={`absolute ${hasMessages ? 'bottom-[90px]' : 'bottom-[120px]'} left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-secondary rounded-lg px-4 py-3 shadow-md flex items-center gap-3 z-dropdown animate-slide-up`}>
          <LoadingIndicator
            type="dots"
            text="Uploading files..."
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 m-4 p-3 bg-error text-text-inverse rounded-md text-sm cursor-pointer transition-all duration-150 animate-slide-down hover:-translate-y-0.5 hover:shadow-md" onClick={() => clearError()}>
          <span className="text-lg flex-shrink-0">⚠️</span>
          <span>{error}</span>
          <button className="ml-auto bg-transparent border-none text-current text-xl cursor-pointer opacity-80 transition-opacity duration-150 p-0 w-6 h-6 flex items-center justify-center rounded hover:opacity-100 hover:bg-white/20">×</button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
