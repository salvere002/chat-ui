import React, { useRef, useEffect, useState, useCallback } from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types/chat';
import { useChatActions, useBranchData } from '../stores';
import { ChatService } from '../services/chatService';
import { useResponseModeStore } from '../stores';
import { ConversationMessage } from '../types/api';

interface MessageListProps {
  messages: Message[];
  chatId: string | null;
}


const MessageList: React.FC<MessageListProps> = ({ messages, chatId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const accumulatedTextRef = useRef<string>("");
  
  // Use selective subscriptions
  const { updateMessageInChat, startChatStreaming, stopChatStreaming } = useChatActions();
  const { getCurrentBranchMessages } = useBranchData();
  const { selectedResponseMode } = useResponseModeStore();
  
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [previousMessageCount, setPreviousMessageCount] = useState<number>(0);
  const [previousLastMessageId, setPreviousLastMessageId] = useState<string>('');

  // Use refs for stable access to store methods
  const updateMessageInChatRef = useRef(updateMessageInChat);
  const startChatStreamingRef = useRef(startChatStreaming);
  const stopChatStreamingRef = useRef(stopChatStreaming);
  const getCurrentBranchMessagesRef = useRef(getCurrentBranchMessages);
  const selectedResponseModeRef = useRef(selectedResponseMode);

  // Update refs when store values change
  updateMessageInChatRef.current = updateMessageInChat;
  startChatStreamingRef.current = startChatStreaming;
  stopChatStreamingRef.current = stopChatStreaming;
  getCurrentBranchMessagesRef.current = getCurrentBranchMessages;
  selectedResponseModeRef.current = selectedResponseMode;
  
  // Scroll to bottom function - memoized to prevent unnecessary recreations
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesEndRef]);

  // Check if user has scrolled up enough to show the button
  const checkScrollPosition = useCallback(() => {
    if (!messageContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Show button when scrolled up more than 100px from bottom
    const isScrolledUp = distanceFromBottom > 100;
    setShowScrollButton(isScrolledUp);
  }, [messageContainerRef]);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);
  
  // Add scroll event listener
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      messageContainer.addEventListener('scroll', handleScroll);
      // Force initial check after a small delay
      setTimeout(() => checkScrollPosition(), 200);
      return () => messageContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, checkScrollPosition]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
    
    // Force show button initially if there's enough content to scroll
    setTimeout(() => {
      if (messageContainerRef.current) {
        const { scrollHeight, clientHeight } = messageContainerRef.current;
        if (scrollHeight > clientHeight + 100) {
          setShowScrollButton(true);
        }
      }
    }, 300);
  }, []); 

  // Scroll to bottom when messages change - optimized version
  useEffect(() => {
    // Get current last message id
    const currentLastMessageId = messages.length > 0 ? messages[messages.length - 1].id : '';
    const shouldScrollToBottom = 
      // Only scroll if message count increased (new message added)
      messages.length > previousMessageCount ||
      // Or if the last message content actually changed (but only if we had previous messages)
      (messages.length > 0 && 
       currentLastMessageId !== previousLastMessageId && 
       previousLastMessageId !== '' &&
       previousMessageCount > 0);
    
    if (shouldScrollToBottom) {
      // Use requestAnimationFrame for smooth scrolling without blocking UI
      let rafId: number;
      let attempts = 0;
      const maxAttempts = 3;
      
      const attemptScroll = () => {
        rafId = requestAnimationFrame(() => {
          scrollToBottom();
          attempts++;
          
          // Only retry if we haven't reached max attempts and container exists
          if (attempts < maxAttempts && messageContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
            const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 10;
            
            if (!isScrolledToBottom) {
              attemptScroll(); // Retry if not scrolled to bottom
            } else {
              // Check scroll position after successful scroll
              requestAnimationFrame(() => checkScrollPosition());
            }
          } else {
            // Final check after all attempts
            requestAnimationFrame(() => checkScrollPosition());
          }
        });
      };
      
      attemptScroll();
      
      // Cleanup function to cancel animation frame if component unmounts
      return () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      };
    }
    
    // Update previous message info
    setPreviousMessageCount(messages.length);
    setPreviousLastMessageId(currentLastMessageId);
  }, [messages, previousMessageCount, previousLastMessageId, scrollToBottom, checkScrollPosition]);

  // Optimized streaming scroll behavior - only scroll during active streaming
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If the last message is from AI and still processing (streaming)
      if (lastMessage.sender === 'ai' && lastMessage.isComplete === false) {
        let rafId: number;
        let timeoutId: number;
        let isActive = true; // Flag to control whether streaming scroll should continue
        
        const smoothScrollForStreaming = () => {
          if (!isActive) return; // Stop if effect has been cleaned up
          
          rafId = requestAnimationFrame(() => {
            if (!isActive) return; // Double-check before scrolling
            
            // Check if user has manually scrolled up - if so, respect their choice
            if (messageContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
              const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
              
              // If user scrolled up more than 100px, stop auto-scrolling during streaming
              if (distanceFromBottom > 100) {
                return; // Don't force scroll if user has scrolled away
              }
            }
            
            scrollToBottom();
            
            // Schedule next scroll check, but only if still active
            if (isActive) {
              timeoutId = window.setTimeout(() => {
                if (isActive) {
                  smoothScrollForStreaming();
                }
              }, 500);
            }
          });
        };
        
        // Start streaming scroll
        smoothScrollForStreaming();
        
        return () => {
          // Clean up and stop streaming scroll
          isActive = false;
          if (rafId) {
            cancelAnimationFrame(rafId);
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
      }
    }
  }, [messages, scrollToBottom]);

  // Generate or regenerate AI response based on a user message
  const generateAIResponse = useCallback(async (userMessageText: string, userMessageFiles: any[] = [], aiMessageId: string) => {
    if (!chatId) return;
    
    try {
      // Start streaming for this specific chat/message
      const abortController = new AbortController();
      startChatStreamingRef.current(chatId, aiMessageId, abortController);
      
      // Reset accumulated text
      accumulatedTextRef.current = "";
      
      // Get conversation history for the current branch (excluding the message being regenerated)
      const allBranchMessages = getCurrentBranchMessagesRef.current(chatId);
      const aiMessageIndex = allBranchMessages.findIndex(msg => msg.id === aiMessageId);
      
      // Include history up to the user message before the AI message being regenerated
      const historyMessages = aiMessageIndex > 0 ? allBranchMessages.slice(0, aiMessageIndex) : allBranchMessages;
      const history: ConversationMessage[] = historyMessages
        .map((msg: Message) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp
        }));
      
      // Use the ChatService based on selected response mode
      if (selectedResponseModeRef.current === 'stream') {
        // Streaming API call
        await ChatService.sendStreamingMessage(
          chatId,
          aiMessageId,
          userMessageText,
          userMessageFiles,
          {
            onChunk: (chunk, context) => {
              // Validate context
              if (context.chatId !== chatId || context.messageId !== aiMessageId) {
                return;
              }
              
              // Handle thinking content streaming
              if (chunk.thinking) {
                const currentMessage = getCurrentBranchMessagesRef.current(chatId).find((m: Message) => m.id === aiMessageId);
                updateMessageInChatRef.current(chatId, aiMessageId, {
                  thinkingContent: `${currentMessage?.thinkingContent || ''}${chunk.thinking}`,
                  isThinkingComplete: chunk.thinkingComplete,
                  thinkingCollapsed: currentMessage?.thinkingCollapsed ?? true
                });
              }
              
              // Handle regular response content streaming
              if (chunk.text) {
                // Append the new chunk to our accumulated text
                accumulatedTextRef.current += chunk.text;
                
                // Update with the accumulated text
                updateMessageInChatRef.current(chatId, aiMessageId, {
                  text: accumulatedTextRef.current,
                  imageUrl: chunk.imageUrl
                });
              }
            },
            onComplete: (context) => {
              if (context.chatId === chatId && context.messageId === aiMessageId) {
                // Mark as complete when done
                updateMessageInChatRef.current(chatId, aiMessageId, {
                  isComplete: true,
                  isThinkingComplete: true // Ensure thinking is also marked complete
                });
                // Clear streaming state
                stopChatStreamingRef.current(chatId);
                // Reset accumulated text
                accumulatedTextRef.current = "";
              }
            },
            onError: (error, context) => {
              if (context.chatId === chatId && context.messageId === aiMessageId) {
                // Don't show error for aborted requests
                if (error.name !== 'AbortError') {
                  console.error('Regeneration error:', error.message);
                  updateMessageInChatRef.current(chatId, aiMessageId, {
                    text: 'Sorry, there was an error processing your request.',
                    isComplete: true
                  });
                } else {
                  // For aborted requests, mark current message as complete with existing content
                  updateMessageInChatRef.current(chatId, aiMessageId, {
                    isComplete: true,
                    isThinkingComplete: true,
                    wasPaused: true
                  });
                }
                // Clear streaming state
                stopChatStreamingRef.current(chatId);
                // Reset accumulated text
                accumulatedTextRef.current = "";
              }
            }
          },
          history
        );
      } else {
        // Non-streaming API call
        try {
          const response = await ChatService.sendMessage(userMessageText, userMessageFiles, history, abortController.signal);
          // Update AI message with complete response
          updateMessageInChatRef.current(chatId, aiMessageId, {
            text: response.text,
            isComplete: true,
            thinkingContent: response.thinking,
            isThinkingComplete: true
          });
          stopChatStreamingRef.current(chatId);
        } catch (error) {
          // Handle abort vs other errors
          if (error instanceof Error && error.name === 'AbortError') {
            // For aborted requests, mark current message as complete with existing content
            updateMessageInChatRef.current(chatId, aiMessageId, {
              isComplete: true,
              wasPaused: true
            });
          } else {
            // Show error and mark message as complete
            console.error('Regeneration error:', error instanceof Error ? error.message : 'Unknown error');
            updateMessageInChatRef.current(chatId, aiMessageId, {
              text: 'Sorry, there was an error processing your request.',
              isComplete: true
            });
          }
          stopChatStreamingRef.current(chatId);
        }
      }
    } catch (error) {
      // Handle errors
      console.error("Error generating AI response:", error);
      updateMessageInChatRef.current(chatId, aiMessageId, {
        text: 'Sorry, there was an error processing your request.',
        isComplete: true
      });
      stopChatStreamingRef.current(chatId);
      // Reset accumulated text
      accumulatedTextRef.current = "";
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
    updateMessageInChatRef.current(chatId, aiMessage.id, { 
      text: "",
      isComplete: false,
      thinkingContent: undefined,
      isThinkingComplete: false,
      thinkingCollapsed: true,
      wasPaused: false
    });
    
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
      updateMessageInChatRef.current(chatId, aiMessage.id, { 
        text: "",
        isComplete: false,
        thinkingContent: undefined,
        isThinkingComplete: false,
        thinkingCollapsed: true,
        wasPaused: false
      });
      
      // Use the shared function to generate the response with the edited message
      const userFiles = messages[messageIndex].files || [];
      await generateAIResponse(newText, userFiles, aiMessage.id);
    }
  }, [chatId, messages, generateAIResponse]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 bg-bg-primary relative scroll-smooth" ref={messageContainerRef}>
      <div className="flex flex-col max-w-[800px] w-full py-2 sm:py-4 px-1 sm:px-4 sm:mx-auto relative pb-32">
        {messages.map((msg, index) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            chatId={chatId || ''}
            onRegenerateResponse={
              msg.sender === 'user' && 
              index < messages.length - 1 && 
              messages[index + 1].sender === 'ai' 
                ? () => handleRegenerateResponse(msg.id) 
                : undefined
            }
            onEditMessage={msg.sender === 'user' ? handleEditMessage : undefined}
          />
        ))}
        
        {/* Show disclaimer centered after the last AI message */}
        {messages.length > 0 && messages[messages.length - 1].sender === 'ai' && messages[messages.length - 1].isComplete !== false && (
          <div className="w-full flex justify-center">
            <p className="text-xs text-text-tertiary">
              Please verify important information before use.
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-32" /> {/* Element to scroll to with spacing */}
      </div>
      
      {showScrollButton && (
        <button 
          className="fixed bottom-[100px] sm:bottom-[120px] right-3 sm:right-5 w-10 h-10 bg-bg-elevated text-text-secondary border border-border-secondary rounded-full shadow-md flex items-center justify-center cursor-pointer z-sticky opacity-90 transition-all duration-150 animate-fade-in hover:opacity-100 hover:-translate-y-0.5 hover:shadow-lg hover:bg-accent-primary hover:text-text-inverse hover:border-accent-primary active:translate-y-0 active:scale-95" 
          onClick={scrollToBottom}
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