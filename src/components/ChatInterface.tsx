import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingIndicator from './LoadingIndicator';
import { ResponseMode } from '../types/chat';
import { useChatHeadless } from '../headless/useChatHeadless';

interface ChatInterfaceProps {
  selectedResponseMode: ResponseMode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedResponseMode }) => {
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

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary relative overflow-hidden">
      {/* Show empty state if no active chat */}
      {!activeChatId && activeChatMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
          <div className="text-center max-w-[420px]">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-accent-light text-accent-primary rounded-2xl text-4xl">
              💬
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-3">No Active Conversation</h3>
            <p className="text-base text-text-secondary leading-relaxed m-0">
              Start a new chat by typing a message below or choose an existing conversation from the sidebar.
            </p>
          </div>

          {/* Input area with proper spacing */}
          <div className="w-full max-w-4xl mt-8">
            <MessageInput
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
              onProcessFiles={processFiles}
              showTopBorder={false}
            />
          </div>
        </div>
      ) : (
        /* Active conversation with messages */
        <>
          <MessageList
            messages={activeChatMessages}
            chatId={activeChatId}
          />

          {/* Bottom-positioned message input */}
          <div className="relative">
            <MessageInput
              onSendMessage={handleSendMessage}
              onPauseRequest={handlePauseRequest}
              isProcessing={combinedIsProcessing}
              isFileProcessing={isFileProcessing}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
              onProcessFiles={processFiles}
              showTopBorder={true}
            />
          </div>
        </>
      )}

      {/* Display file upload loading state only */}
      {isFileProcessing && (
        <div className={`absolute ${activeChatId && activeChatMessages.length > 0 ? 'bottom-[90px]' : 'bottom-[120px]'} left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-secondary rounded-lg px-4 py-3 shadow-md flex items-center gap-3 z-dropdown animate-slide-up`}>
          <LoadingIndicator
            type="dots"
            text="Uploading files..."
          />
        </div>
      )}

      {/* Display error state */}
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
