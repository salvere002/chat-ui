import React, { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react';
import { Message, MessageFile } from '../types/chat'; // Import the Message and MessageFile types
import { FaCheck, FaTimes } from 'react-icons/fa'; // Import required icons
import { useBranchActions, useChatActions, useChatUtils, useBranchData } from '../stores';
import { ChatService } from '../services/chatService';
import { useResponseModeStore } from '../stores';
import LoadingIndicator from './LoadingIndicator';
import ThinkingSection from './ThinkingSection';
import { ConversationMessage } from '../types/api';
import BranchNavigator, { BranchData } from './MessageItem/BranchNavigator';
import MessageActions from './MessageItem/MessageActions';
import { EmbeddedImage, FileAttachment } from './MessageItem/FileComponents';
import MemoizedMarkdown from './MessageItem/MemoizedMarkdown';

interface MessageItemProps {
  message: Message;
  onRegenerateResponse?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  chatId: string;
}


// MessageHeader Component - Handles thinking section for AI messages
const MessageHeader: React.FC<{
  sender: 'user' | 'ai';
  thinkingContent?: string;
  isThinkingComplete?: boolean;
  isComplete?: boolean;
  thinkingCollapsed?: boolean;
  onThinkingToggle: (collapsed: boolean) => void;
}> = memo(({ 
  sender, 
  thinkingContent, 
  isThinkingComplete, 
  isComplete, 
  thinkingCollapsed, 
  onThinkingToggle 
}) => {
  // Only render thinking section for AI messages
  if (sender !== 'ai' || (!thinkingContent && (thinkingContent === undefined || isThinkingComplete))) {
    return null;
  }

  return (
    <div className="mb-3">
      <ThinkingSection
        thinkingContent={thinkingContent}
        isThinkingComplete={isThinkingComplete}
        isStreaming={!isComplete}
        initialCollapsed={thinkingCollapsed !== false}
        onToggle={onThinkingToggle}
      />
    </div>
  );
});

MessageHeader.displayName = 'MessageHeader';

// MessageBody Component - Handles file attachments, images, text content, and edit mode
const MessageBody: React.FC<{
  sender: 'user' | 'ai';
  text?: string;
  files?: MessageFile[];
  imageUrl?: string;
  isComplete?: boolean;
  isEditing: boolean;
  editText: string;
  wasPaused?: boolean;
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}> = memo(({ 
  sender, 
  text, 
  files, 
  imageUrl, 
  isComplete, 
  isEditing, 
  editText, 
  wasPaused, 
  onTextareaChange, 
  onSaveEdit, 
  onCancelEdit, 
  textareaRef 
}) => {
  const isIncomplete = sender === 'ai' && isComplete === false;

  return (
    <>
      {/* Render user's file attachments */}
      {files && files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {files.map((file) => (
            <FileAttachment key={file.id} file={file} />
          ))}
        </div>
      )}
      
      {/* Render AI's image if present */}
      {imageUrl && sender === 'ai' && (
        <EmbeddedImage imageUrl={imageUrl} />
      )}
      
      {/* Render text content */}
      {text && !isEditing && (
        <MemoizedMarkdown text={text} isIncomplete={isIncomplete} />
      )}
      
      {/* Edit mode text area */}
      {isEditing && (
        <div className="w-full">
          <textarea
            ref={textareaRef}
            className="w-full min-h-[80px] p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-lg font-sans text-sm leading-normal resize-none transition-all duration-150 focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)]"
            value={editText}
            onChange={onTextareaChange}
            placeholder="Edit your message..."
            autoFocus
          />
          <div className="flex gap-1 mt-2 justify-end">
            <button className="flex items-center gap-1 px-2 py-1 bg-transparent text-text-secondary border border-border-primary rounded text-xs cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary" onClick={onCancelEdit}>
              <FaTimes size={10} /> Cancel
            </button>
            <button className="flex items-center gap-1 px-2 py-1 bg-accent-primary text-text-inverse border-none rounded text-xs cursor-pointer transition-all duration-150 hover:bg-accent-hover" onClick={onSaveEdit}>
              <FaCheck size={10} /> Save
            </button>
          </div>
        </div>
      )}
      
      {/* If no text but still incomplete (e.g., only image incoming), show indicator */}
      {!text && isIncomplete && (
        <LoadingIndicator type="dots" size="small" />
      )}

      {/* If no text and was paused, show placeholder */}
      {!text && wasPaused && sender === 'ai' && (
        <div className="text-text-tertiary italic text-sm opacity-70">
          Response was paused before any content was generated.
        </div>
      )}
    </>
  );
});

MessageBody.displayName = 'MessageBody';

// MessageFooter Component - Handles branch navigation, timestamp, and action buttons
const MessageFooter: React.FC<{
  sender: 'user' | 'ai';
  timestamp: Date;
  wasPaused?: boolean;
  isComplete?: boolean;
  branchData: BranchData;
  onPreviousBranch: () => void;
  onNextBranch: () => void;
  // Message actions props
  text?: string;
  copied: boolean;
  isEditing: boolean;
  onCopyMessage: () => void;
  onSetIsEditing: (editing: boolean) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onRegenerateResponse?: () => void;
}> = memo(({ 
  sender, 
  timestamp, 
  wasPaused, 
  isComplete, 
  branchData, 
  onPreviousBranch, 
  onNextBranch,
  // Message actions
  text,
  copied,
  isEditing,
  onCopyMessage,
  onSetIsEditing,
  onEditMessage,
  onRegenerateResponse
}) => {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <BranchNavigator
        branchData={branchData}
        onPreviousBranch={onPreviousBranch}
        onNextBranch={onNextBranch}
      />
      
      {/* Actions footer - only show when hovering */}
      <div className="flex items-center mt-1 px-1 opacity-0 transition-opacity duration-150 text-xs text-text-tertiary gap-2 group-hover:opacity-100">
        <div className="mr-auto flex items-center gap-2">
          {formatTime(timestamp)}
          {wasPaused && sender === 'ai' && (
            <span className="text-orange-500 text-xs opacity-70" title="Response was paused">
              ⏸
            </span>
          )}
        </div>
        
        <MessageActions
          sender={sender}
          text={text}
          copied={copied}
          isEditing={isEditing}
          isComplete={isComplete}
          onCopyMessage={onCopyMessage}
          onSetIsEditing={onSetIsEditing}
          onEditMessage={onEditMessage}
          onRegenerateResponse={onRegenerateResponse}
        />
      </div>
    </>
  );
});

MessageFooter.displayName = 'MessageFooter';





const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerateResponse, onEditMessage, chatId }) => {
  // Destructure files array instead of single file
  const { text, sender, timestamp, files, imageUrl, isComplete, id, thinkingContent, isThinkingComplete, thinkingCollapsed, wasPaused } = message;
  
  // Get store methods using selective subscriptions
  const { 
    getBranchOptionsAtMessage,
    switchToBranch, 
    createBranchFromMessage
  } = useBranchActions();
  
  const {
    addMessageToChat,
    updateMessageInChat,
    startChatStreaming,
    stopChatStreaming
  } = useChatActions();
  
  const { getChatById } = useChatUtils();
  const { getCurrentBranchMessages } = useBranchData();
  
  // Get response mode selection for AI responses
  const { selectedResponseMode } = useResponseModeStore();
  
  // Local state for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');

  // State for copy button feedback
  const [copied, setCopied] = useState(false);

  // Handle thinking section toggle
  const handleThinkingToggle = (collapsed: boolean) => {
    updateMessageInChat(chatId, id, {
      thinkingCollapsed: collapsed
    });
  };

  // Ref for textarea auto-resizing
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Memoized branch calculations
  const branchOptions = useMemo(
    () => getBranchOptionsAtMessage(chatId, id),
    [getBranchOptionsAtMessage, chatId, id]
  );
  
  const branchData = useMemo(() => {
    const hasBranches = branchOptions.length > 1 || message.branchPoint === true;
    const totalBranches = Math.max(branchOptions.length, hasBranches ? 2 : 1);
    const currentBranchIndex = branchOptions.findIndex(option => option.id === message.branchId);
    const actualCurrentBranchIndex = currentBranchIndex >= 0 ? currentBranchIndex : 0;
    
    return {
      hasBranches,
      totalBranches,
      currentBranchIndex,
      actualCurrentBranchIndex
    };
  }, [branchOptions, message.branchPoint, message.branchId]);
  
  const { hasBranches, totalBranches, actualCurrentBranchIndex } = branchData;
  
  
  // Auto-resize the textarea based on content
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scrollHeight
    }
  };
  
  // Call resize on edit text change
  useEffect(() => {
    if (isEditing) {
      autoResizeTextarea();
    }
  }, [editText, isEditing]);

  // Memoized branch navigation handlers
  const handlePreviousBranch = useCallback(() => {
    if (hasBranches && actualCurrentBranchIndex > 0 && branchOptions.length > actualCurrentBranchIndex - 1) {
      const previousBranch = branchOptions[actualCurrentBranchIndex - 1];
      if (previousBranch) {
        switchToBranch(chatId, previousBranch.id);
      }
    }
  }, [hasBranches, actualCurrentBranchIndex, branchOptions, switchToBranch, chatId]);

  const handleNextBranch = useCallback(() => {
    if (hasBranches && actualCurrentBranchIndex < totalBranches - 1 && branchOptions.length > actualCurrentBranchIndex + 1) {
      const nextBranch = branchOptions[actualCurrentBranchIndex + 1];
      if (nextBranch) {
        switchToBranch(chatId, nextBranch.id);
      }
    }
  }, [hasBranches, actualCurrentBranchIndex, totalBranches, branchOptions, switchToBranch, chatId]);

  // Generate AI response for new branch
  const generateAIResponseForNewBranch = async (userText: string, userFiles: any[]) => {
    if (!chatId) return;
    
    try {
      // Create a unique message ID for AI response
      const aiMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Start streaming for this specific chat/message
      const abortController = new AbortController();
      startChatStreaming(chatId, aiMessageId, abortController);
      
      // Create initial AI message (will be updated with stream)
      // It should inherit the current branch context
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isComplete: false,
        branchId: message.branchId, // Inherit current branch context
        children: []
      };
      
      // Add initial empty AI message to the chat
      addMessageToChat(chatId, aiMessage);
      
      // Get conversation history for the current branch (up to the current message)
      const allBranchMessages = getCurrentBranchMessages(chatId);
      const currentMessageIndex = allBranchMessages.findIndex(msg => msg.id === message.id);
      
      // Include history up to the current message
      const historyMessages = currentMessageIndex >= 0 ? allBranchMessages.slice(0, currentMessageIndex + 1) : allBranchMessages;
      const history: ConversationMessage[] = historyMessages
        .map((msg: Message) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp
        }));
      
      // Use the ChatService based on selected response mode
      if (selectedResponseMode === 'stream') {
        // Reset accumulated text
        accumulatedTextRef.current = '';
        
        // Streaming API call
        await ChatService.sendStreamingMessage(
          chatId,
          aiMessageId,
          userText,
          userFiles,
          {
            onChunk: (chunk: any, _context: { chatId: string; messageId: string }) => {
              // Handle thinking content streaming
              if (chunk.thinking) {
                const currentMessage = getChatById(chatId)?.messages.find((m: Message) => m.id === aiMessageId);
                updateMessageInChat(chatId, aiMessageId, {
                  thinkingContent: `${currentMessage?.thinkingContent || ''}${chunk.thinking}`,
                  isThinkingComplete: chunk.thinkingComplete,
                  thinkingCollapsed: currentMessage?.thinkingCollapsed ?? true // Default to collapsed
                });
              }
              
              // Handle regular response content streaming
              if (chunk.text) {
                accumulatedTextRef.current += chunk.text;
                updateMessageInChat(chatId, aiMessageId, {
                  text: accumulatedTextRef.current,
                  imageUrl: chunk.imageUrl
                });
              }
            },
            onComplete: (_context: { chatId: string; messageId: string }) => {
              // Mark as complete when done
              updateMessageInChat(chatId, aiMessageId, {
                isComplete: true,
                isThinkingComplete: true // Ensure thinking is also marked complete
              });
              // Clear streaming state 
              stopChatStreaming(chatId);
              // Reset accumulated text
              accumulatedTextRef.current = '';
            },
            onError: (error: Error, _context: { chatId: string; messageId: string }) => {
              // Don't show error for aborted requests
              if (error.name !== 'AbortError') {
                console.error('AI response error:', error.message);
                updateMessageInChat(chatId, aiMessageId, {
                  text: 'Sorry, there was an error processing your request.',
                  isComplete: true
                });
              } else {
                // For aborted requests, mark current message as complete with existing content
                updateMessageInChat(chatId, aiMessageId, {
                  isComplete: true,
                  isThinkingComplete: true,
                  wasPaused: true
                });
              }
              // Clear streaming state
              stopChatStreaming(chatId);
              // Reset accumulated text
              accumulatedTextRef.current = '';
            }
          },
          history
        );
      } else {
        // Non-streaming API call
        try {
          const response = await ChatService.sendMessage(userText, userFiles, history, abortController.signal);
          // Update AI message with complete response
          updateMessageInChat(chatId, aiMessageId, {
            text: response.text,
            imageUrl: response.imageUrl,
            isComplete: true,
            thinkingContent: response.thinking,
            isThinkingComplete: true
          });
        } catch (error) {
          // Handle abort vs other errors
          if (error instanceof Error && error.name === 'AbortError') {
            // For aborted requests, mark current message as complete with existing content
            updateMessageInChat(chatId, aiMessageId, {
              isComplete: true,
              wasPaused: true
            });
          } else {
            // Show error and mark message as complete
            console.error('AI response error:', error instanceof Error ? error.message : 'Unknown error');
            updateMessageInChat(chatId, aiMessageId, {
              text: 'Sorry, there was an error processing your request.',
              isComplete: true
            });
          }
        } finally {
          // Clear streaming state
          stopChatStreaming(chatId);
        }
      }
    } catch (error) {
      // Handle errors
      console.error("Error generating AI response for new branch:", error);
      stopChatStreaming(chatId);
    }
  };

  // Helper to get current message text (for streaming)  
  const accumulatedTextRef = useRef<string>('');

  // Handle creating new branch (replacing edit functionality)
  const handleCreateBranch = () => {
    if (!editText.trim()) {
      setIsEditing(false);
      return;
    }


    // Create a new version of this message in a new branch
    // The new message should have a new ID but replace the original in the new branch
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // New unique ID
      text: editText.trim(),
      sender: message.sender,
      timestamp: new Date(), // New timestamp
      files: message.files || [],
      isComplete: true,
      children: [],
      branchId: message.branchId, // Will be updated by createBranchFromMessage
      parentId: message.parentId
    };

    // Create branch from THIS message (not parent) - this message will have multiple branches
    const newBranchId = createBranchFromMessage(chatId, message.id, newMessage);
    switchToBranch(chatId, newBranchId);
    
    // Generate AI response for the new branch
    generateAIResponseForNewBranch(editText.trim(), message.files || []);
    
    setIsEditing(false);
  };

  // Handle edit save (now creates branch instead)
  const handleSaveEdit = () => {
    handleCreateBranch();
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditText(text || '');
    setIsEditing(false);
  };

  // Memoized copy message handler
  const handleCopyMessage = useCallback(() => {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      });
    }
  }, [text]);

  // Memoized setIsEditing callback for MessageActions
  const handleSetIsEditing = useCallback((editing: boolean) => {
    setIsEditing(editing);
  }, []);

  // Handle textarea input change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };


  // Memoize expensive style calculations
  const containerClasses = useMemo(() => 
    `group flex flex-col px-2 sm:px-4 py-2 max-w-[90%] sm:max-w-[85%] animate-message-slide transition-colors duration-150 hover:bg-bg-secondary hover:rounded-lg ${
      sender === 'user' ? 'self-end items-end' : 'self-start items-start'
    } ${
      isEditing ? 'editing w-[90%] sm:w-[85%] max-w-[90%] sm:max-w-[85%]' : ''
    }`,
    [sender, isEditing]
  );

  const messageClasses = useMemo(() => 
    `relative px-3 sm:px-4 py-3 rounded-lg max-w-full break-words transition-all duration-150 hover:-translate-y-px hover:shadow-sm ${
      isEditing ? 'w-full' : 'w-fit'
    } ${
      sender === 'user' 
        ? 'bg-accent-primary text-text-inverse rounded-br-sm' 
        : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
    }`,
    [sender, isEditing]
  );

  return (
    <div 
      className={containerClasses}
        data-is-complete={isComplete !== false}
      >
      <div className={messageClasses}>
        <MessageHeader
          sender={sender}
          thinkingContent={thinkingContent}
          isThinkingComplete={isThinkingComplete}
          isComplete={isComplete}
          thinkingCollapsed={thinkingCollapsed}
          onThinkingToggle={handleThinkingToggle}
        />

        <MessageBody
          sender={sender}
          text={text}
          files={files}
          imageUrl={imageUrl}
          isComplete={isComplete}
          isEditing={isEditing}
          editText={editText}
          wasPaused={wasPaused}
          onTextareaChange={handleTextareaChange}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          textareaRef={textareaRef}
        />
      </div>
      
      <MessageFooter
        sender={sender}
        timestamp={timestamp}
        wasPaused={wasPaused}
        isComplete={isComplete}
        branchData={branchData}
        onPreviousBranch={handlePreviousBranch}
        onNextBranch={handleNextBranch}
        text={text}
        copied={copied}
        isEditing={isEditing}
        onCopyMessage={handleCopyMessage}
        onSetIsEditing={handleSetIsEditing}
        onEditMessage={onEditMessage}
        onRegenerateResponse={onRegenerateResponse}
      />
    </div>
  );
};

export default MessageItem;