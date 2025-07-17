import React, { useRef, useEffect, useState, useCallback } from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types/chat';
import { useChatStore } from '../stores';
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
  const { activeChatId, updateMessageInChat, setProcessing, getCurrentBranchMessages } = useChatStore();
  const { selectedResponseMode } = useResponseModeStore();
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [previousMessageCount, setPreviousMessageCount] = useState<number>(0);
  const [previousLastMessageId, setPreviousLastMessageId] = useState<string>('');
  
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

  // Scroll to bottom when messages change
  useEffect(() => {
    // Get current last message id
    const currentLastMessageId = messages.length > 0 ? messages[messages.length - 1].id : '';
    const shouldScrollToBottom = 
      // If message count increased (new message added)
      messages.length > previousMessageCount || 
      // Or if the last message ID changed (content updated)
      (messages.length > 0 && currentLastMessageId !== previousLastMessageId && previousLastMessageId !== '');
    
    if (shouldScrollToBottom) {
      // Use multiple timeouts to ensure it scrolls even if DOM updates are delayed
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
    }
    
    // Update previous message info
    setPreviousMessageCount(messages.length);
    setPreviousLastMessageId(currentLastMessageId);
    
    // Check if we need to show the scroll button after scrolling
    setTimeout(() => {
      checkScrollPosition();
    }, 350);
  }, [messages, previousMessageCount, previousLastMessageId, scrollToBottom, checkScrollPosition]);

  // Also check if the message content is updating (for streaming responses)
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If the last message is from AI and still processing (streaming)
      if (lastMessage.sender === 'ai' && lastMessage.isComplete === false) {
        // Ensure we're scrolled to the bottom to see the streaming message
        const scrollInterval = setInterval(() => {
          scrollToBottom();
        }, 1000); // Check every second while streaming
        
        return () => clearInterval(scrollInterval);
      }
    }
  }, [messages, scrollToBottom]);

  // Generate or regenerate AI response based on a user message
  const generateAIResponse = async (userMessageText: string, userMessageFiles: any[] = [], aiMessageId: string) => {
    if (!activeChatId) return;
    
    try {
      // Reset accumulated text
      accumulatedTextRef.current = "";
      
      // Get conversation history for the current branch (excluding the message being regenerated)
      const allBranchMessages = getCurrentBranchMessages(activeChatId);
      const aiMessageIndex = allBranchMessages.findIndex(msg => msg.id === aiMessageId);
      
      // Include history up to the user message before the AI message being regenerated
      const historyMessages = aiMessageIndex > 0 ? allBranchMessages.slice(0, aiMessageIndex) : allBranchMessages;
      const history: ConversationMessage[] = historyMessages
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp
        }));
      
      // Use the ChatService based on selected response mode
      if (selectedResponseMode === 'stream') {
        // Streaming API call
        await ChatService.sendStreamingMessage(
          userMessageText,
          userMessageFiles,
          {
            onChunk: (chunk) => {
              // Update the AI message with each chunk
              if (chunk.text) {
                // Append the new chunk to our accumulated text
                accumulatedTextRef.current += chunk.text;
                
                // Update with the accumulated text
                updateMessageInChat(activeChatId, aiMessageId, {
                  text: accumulatedTextRef.current,
                  imageUrl: chunk.imageUrl
                });
              }
            },
            onComplete: () => {
              // Mark as complete when done
              updateMessageInChat(activeChatId, aiMessageId, {
                isComplete: true
              });
              // Clear processing state
              setProcessing(false);
              // Reset accumulated text
              accumulatedTextRef.current = "";
            },
            onError: (error) => {
              // Show error and mark message as complete
              console.error('Regeneration error:', error.message);
              updateMessageInChat(activeChatId, aiMessageId, {
                text: 'Sorry, there was an error processing your request.',
                isComplete: true
              });
              // Clear processing state
              setProcessing(false);
              // Reset accumulated text
              accumulatedTextRef.current = "";
            }
          },
          history
        );
      } else {
        // Non-streaming API call
        const response = await ChatService.sendMessage(userMessageText, userMessageFiles, history);
        // Update AI message with complete response
        updateMessageInChat(activeChatId, aiMessageId, {
          text: response.text,
          isComplete: true
        });
        // Clear processing state
        setProcessing(false);
      }
    } catch (error) {
      // Handle errors
      console.error("Error generating AI response:", error);
      updateMessageInChat(activeChatId, aiMessageId, {
        text: 'Sorry, there was an error processing your request.',
        isComplete: true
      });
      setProcessing(false);
      // Reset accumulated text
      accumulatedTextRef.current = "";
    }
  };

  // Handle regenerating response
  const handleRegenerateResponse = async (userMessageId: string) => {
    if (!activeChatId) return;
    
    // Find the user message and the following AI message (if any)
    const userMessageIndex = messages.findIndex(msg => msg.id === userMessageId);
    if (userMessageIndex < 0 || userMessageIndex >= messages.length - 1) return; // No valid index or no following message
    
    const userMessage = messages[userMessageIndex];
    const aiMessage = messages[userMessageIndex + 1];
    if (aiMessage.sender !== 'ai') return; // Ensure it's really an AI message
    
    // Set processing state
    setProcessing(true);
    
    // Mark the AI message as regenerating
    updateMessageInChat(activeChatId, aiMessage.id, { 
      text: "Regenerating response...",
      isComplete: false 
    });
    
    // Generate new response using our shared function
    await generateAIResponse(userMessage.text, userMessage.files || [], aiMessage.id);
  };

  // Handle editing a user message
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!activeChatId) return;
    
    // Find message index in the array
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex < 0) return;
    
    // Update the user message
    updateMessageInChat(activeChatId, messageId, { text: newText });
    
    // If there's a following AI message response, regenerate it
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].sender === 'ai') {
      const aiMessage = messages[messageIndex + 1];
      
      // Set processing state
      setProcessing(true);
      
      // Mark the AI message as regenerating
      updateMessageInChat(activeChatId, aiMessage.id, { 
        text: "Regenerating response based on edited message...",
        isComplete: false 
      });
      
      // Use the shared function to generate the response with the edited message
      const userFiles = messages[messageIndex].files || [];
      await generateAIResponse(newText, userFiles, aiMessage.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 bg-bg-primary relative scroll-smooth" ref={messageContainerRef}>
      <div className="flex flex-col max-w-[800px] mx-auto w-full py-2 sm:py-4 px-2 sm:px-4 relative">
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
        <div ref={messagesEndRef} /> {/* Element to scroll to */}
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