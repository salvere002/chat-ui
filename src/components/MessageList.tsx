import React, { useRef, useState, useCallback, useEffect } from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types/chat';
import { useChatActions, useBranchData, useResponseModeStore } from '../stores';
import { useStreamingMessage } from '../hooks/useStreamingMessage';
import { ConversationMessage } from '../types/api';
import { buildHistory, createAiMessageReset } from '../utils/messageUtils';
import { useScrollManager } from '../hooks/useScrollManager';

interface MessageListProps {
  messages: Message[];
  chatId: string | null;
  onMessagePairCapture?: (messageId: string) => void;
}


const MessageList: React.FC<MessageListProps> = ({ messages, chatId, onMessagePairCapture }) => {
  const {
    containerRef: messageContainerRef,
    endRef: messagesEndRef,
    scrollToBottom,
    scrollToBottomManual,
    shouldAutoScroll
  } = useScrollManager();

  // Use selective subscriptions
  const { updateMessageInChat } = useChatActions();
  const { getCurrentBranchMessages } = useBranchData();
  const { selectedResponseMode } = useResponseModeStore();

  // Get streaming message handler
  const { sendStreamingMessage } = useStreamingMessage(selectedResponseMode);

  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);

  // Use refs for stable access to store methods
  const updateMessageInChatRef = useRef(updateMessageInChat);
  const getCurrentBranchMessagesRef = useRef(getCurrentBranchMessages);
  const selectedResponseModeRef = useRef(selectedResponseMode);

  // Update refs when store values change
  updateMessageInChatRef.current = updateMessageInChat;
  getCurrentBranchMessagesRef.current = getCurrentBranchMessages;
  selectedResponseModeRef.current = selectedResponseMode;

  // Manage scroll button visibility and auto-scroll
  const checkScrollButton = useCallback(() => {
    const container = messageContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
  }, [messageContainerRef]);

  // Auto-scroll on new messages
  useEffect(() => {
    // Only scroll if user is near bottom; hook enforces this
    scrollToBottom();
    // Update button visibility
    checkScrollButton();
  }, [messages.length, scrollToBottom, checkScrollButton]);

  // Streaming auto-scroll
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id;
  const lastMessageText = lastMessage?.text;
  const lastMessageIsStreaming = lastMessage?.sender === 'ai' && lastMessage?.isComplete === false;

  useEffect(() => {
    if (lastMessageIsStreaming && shouldAutoScroll()) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [lastMessageId, lastMessageText, lastMessageIsStreaming, shouldAutoScroll, scrollToBottom]);

  // Attach scroll listener
  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;
    const handler = () => checkScrollButton();
    container.addEventListener('scroll', handler, { passive: true });
    return () => {
      container.removeEventListener('scroll', handler);
    };
  }, [messageContainerRef, checkScrollButton]);

  // Generate or regenerate AI response based on a user message
  const generateAIResponse = useCallback(async (userMessageText: string, userMessageFiles: any[] = [], aiMessageId: string) => {
    if (!chatId) return;

    try {
      // Reset AI message
      updateMessageInChatRef.current(chatId, aiMessageId, createAiMessageReset());

      // Get conversation history for the current branch (excluding the message being regenerated)
      const allBranchMessages = getCurrentBranchMessagesRef.current(chatId);
      const aiMessageIndex = allBranchMessages.findIndex(msg => msg.id === aiMessageId);

      // Include history up to the user message before the AI message being regenerated
      const historyMessages = aiMessageIndex > 0 ? allBranchMessages.slice(0, aiMessageIndex) : allBranchMessages;
      const history: ConversationMessage[] = buildHistory(historyMessages);

      // Use the centralized streaming hook
      await sendStreamingMessage({
        chatId,
        messageId: aiMessageId,
        userText: userMessageText,
        userFiles: userMessageFiles,
        history
      });
    } catch (error) {
      // Handle errors
      console.error("Error generating AI response:", error);
      updateMessageInChatRef.current(chatId, aiMessageId, {
        text: 'Sorry, there was an error processing your request.',
        isComplete: true
      });
      // Error handling completed - streaming automatically stopped by streamManager
    }
  }, [chatId]);

  // Handle regenerating response
  const handleRegenerateResponse = useCallback(async (userMessageId: string) => {
    if (!chatId) return;

    // Find the user message and the following AI message (if any)
    const userMessageIndex = messages.findIndex(msg => msg.id === userMessageId);
    if (userMessageIndex < 0 || userMessageIndex >= messages.length - 1) return; // No valid index or no following message

    const userMessage = messages[userMessageIndex];
    const aiMessage = messages[userMessageIndex + 1];
    if (aiMessage.sender !== 'ai') return; // Ensure it's really an AI message

    // Processing state will be set by generateAIResponse

    // Mark the AI message as regenerating and reset thinking content
    updateMessageInChatRef.current(chatId, aiMessage.id, createAiMessageReset());

    // Generate new response using our shared function
    await generateAIResponse(userMessage.text, userMessage.files || [], aiMessage.id);
  }, [chatId, messages, generateAIResponse]);

  // Handle editing a user message
  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    if (!chatId) return;

    // Find message index in the array
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex < 0) return;

    // Update the user message
    updateMessageInChatRef.current(chatId, messageId, { text: newText });

    // If there's a following AI message response, regenerate it
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].sender === 'ai') {
      const aiMessage = messages[messageIndex + 1];

      // Processing state will be set by generateAIResponse

      // Mark the AI message as regenerating and reset thinking content
      updateMessageInChatRef.current(chatId, aiMessage.id, createAiMessageReset());

      // Use the shared function to generate the response with the edited message
      const userFiles = messages[messageIndex].files || [];
      await generateAIResponse(newText, userFiles, aiMessage.id);
    }
  }, [chatId, messages, generateAIResponse]);

  return (
    <div className="flex-1 min-h-0 relative">
      <div
        className="h-full overflow-y-auto overflow-x-hidden p-0 relative scroll-smooth"
        ref={messageContainerRef}
      >
        <div
          className={`flex flex-col max-w-[800px] mx-auto w-full py-2 px-2 relative @min-w-[520px]:py-4 @min-w-[520px]:px-4`}
          data-conversation-root
        >
          {messages.map((msg, index) => {
            const canRegenerate = (
              msg.sender === 'user' &&
              index < messages.length - 1 &&
              messages[index + 1].sender === 'ai'
            );
            return (
              <MessageItem
                key={msg.id}
                message={msg}
                chatId={chatId || ''}
                canRegenerate={canRegenerate}
                onRegenerateResponse={handleRegenerateResponse}
                onEditMessage={msg.sender === 'user' ? handleEditMessage : undefined}
                onMessagePairCapture={msg.sender === 'ai' ? onMessagePairCapture : undefined}
              />
            );
          })}
          {messages.length > 0 &&
            messages[messages.length - 1].sender === 'ai' &&
            messages[messages.length - 1].isComplete !== false && (
              <div className={`w-full flex justify-center px-2 pb-8 @min-w-[520px]:px-4`}>
                <p className="text-xs text-text-tertiary">
                  Please verify important information before use.
                </p>
              </div>
            )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollButton && (
        <button
          className={`fixed bottom-[100px] right-3 w-10 h-10 bg-bg-elevated text-text-secondary border border-border-secondary rounded-full shadow-md flex items-center justify-center cursor-pointer z-sticky opacity-90 transition-all duration-150 animate-fade-in hover:opacity-100 hover:-translate-y-0.5 hover:shadow-lg hover:bg-accent-primary hover:text-text-inverse hover:border-accent-primary active:translate-y-0 active:scale-95 @min-w-[520px]:bottom-[120px] @min-w-[520px]:right-5`}
          onClick={scrollToBottomManual}
          aria-label="Scroll to bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
};

export default MessageList;
