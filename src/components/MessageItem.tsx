import React, { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react';
import { Message, MessageFile } from '../types/chat'; // Import the Message and MessageFile types
import { FaCheck, FaTimes } from 'react-icons/fa'; // Import required icons
import { useBranchActions, useChatActions, useBranchData } from '../stores';
import { useStreamingMessage } from '../hooks/useStreamingMessage';
import { useResponseModeStore } from '../stores';
import LoadingIndicator from './LoadingIndicator';
import ThinkingSection from './ThinkingSection';
import { ConversationMessage } from '../types/api';
import BranchNavigator, { BranchData } from './MessageItem/BranchNavigator';
import { buildHistory } from '../utils/messageUtils';
import MessageActions from './MessageItem/MessageActions';
import { EmbeddedImage, FileAttachment } from './MessageItem/FileComponents';
import MemoizedMarkdown from './MessageItem/MemoizedMarkdown';
import { formatTime } from '../utils/timeUtils';
import { generateMessageId } from '../utils/id';
import clsx from 'clsx';
import copyToClipboard from 'copy-to-clipboard';

interface MessageItemProps {
  message: Message;
  onRegenerateResponse?: (userMessageId: string) => void | Promise<void>;
  onEditMessage?: (messageId: string, newText: string) => void;
  onMessagePairCapture?: (messageId: string) => void;
  chatId: string;
  canRegenerate?: boolean;
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
  onCodeUpdate?: (oldCode: string, newCode: string) => void;
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
  textareaRef,
  onCodeUpdate
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
        <MemoizedMarkdown text={text} isIncomplete={isIncomplete} onCodeUpdate={onCodeUpdate} />
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
  onMessagePairCapture?: () => void;
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
  onRegenerateResponse,
  onMessagePairCapture
}) => {

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
          onMessagePairCapture={onMessagePairCapture}
        />
      </div>
    </>
  );
});

MessageFooter.displayName = 'MessageFooter';





const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerateResponse, onEditMessage, onMessagePairCapture, chatId, canRegenerate }) => {
  // Destructure files array instead of single file
  const { text, sender, timestamp, files, imageUrl, isComplete, id, thinkingContent, isThinkingComplete, thinkingCollapsed, wasPaused } = message;
  const hasThinking = sender === 'ai' && !!thinkingContent;
  
  // Get store methods using selective subscriptions
  const { 
    getBranchOptionsAtMessage,
    switchToBranch, 
    createBranchFromMessage
  } = useBranchActions();
  
  const {
    addMessageToChat,
    updateMessageInChat
  } = useChatActions();
  const { getCurrentBranchMessages } = useBranchData();
  
  // Get response mode selection for AI responses
  const { selectedResponseMode } = useResponseModeStore();
  
  // Get streaming message handler
  const { sendStreamingMessage } = useStreamingMessage(selectedResponseMode);
  
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
      const aiMessageId = generateMessageId();
      
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
      const history: ConversationMessage[] = buildHistory(historyMessages);
      
      // Use the centralized streaming hook
      await sendStreamingMessage({
        chatId,
        messageId: aiMessageId,
        userText,
        userFiles,
        history
      });
    } catch (error) {
      // Handle errors
      console.error("Error generating AI response for new branch:", error);
      // Error handling completed - streaming automatically stopped by streamManager
    }
  };


  // Handle creating new branch (replacing edit functionality)
  const handleCreateBranch = () => {
    if (!editText.trim()) {
      setIsEditing(false);
      return;
    }


    // Create a new version of this message in a new branch
    // The new message should have a new ID but replace the original in the new branch
    const newMessage = {
      id: generateMessageId(), // New unique ID
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

  // Handle code block update from code editor
  const handleCodeUpdate = useCallback((oldCode: string, newCode: string) => {
    if (!text || oldCode === newCode) return;
    
    // Find and replace the old code block with the new one
    // Code blocks in markdown are wrapped with triple backticks
    // We need to find the exact occurrence and replace it
    const updatedText = text.replace(oldCode, newCode);
    
    if (updatedText !== text) {
      updateMessageInChat(chatId, id, { text: updatedText });
    }
  }, [text, chatId, id, updateMessageInChat]);

  // Memoized copy message handler
  const handleCopyMessage = useCallback(() => {
    if (text) {
      const ok = copyToClipboard(text);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
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

  // Stable regenerate click handler that invokes parent with this message id
  const handleRegenerateClick = useCallback(() => {
    if (onRegenerateResponse) {
      onRegenerateResponse(id);
    }
  }, [onRegenerateResponse, id]);

  // Stable message pair capture handler that invokes parent with this message id
  const handleMessagePairCapture = useCallback(() => {
    if (onMessagePairCapture) {
      onMessagePairCapture(id);
    }
  }, [onMessagePairCapture, id]);


  // Memoize expensive style calculations
  const containerClasses = useMemo(() => clsx(
    'group flex flex-col px-2 sm:px-4 xl:px-6 py-2 xl:py-3 max-w-[95%] sm:max-w-[92%] xl:max-w-[88%] 2xl:max-w-[85%] animate-message-slide transition-colors duration-150 hover:bg-bg-secondary hover:rounded-lg',
    sender === 'user' ? 'self-end items-end' : 'self-start items-start',
    (isEditing || hasThinking) && 'editing w-[95%] sm:w-[92%] xl:w-[88%] 2xl:w-[85%] max-w-[95%] sm:max-w-[92%] xl:max-w-[88%] 2xl:max-w-[85%]'
  ), [sender, isEditing, hasThinking]);

  const messageClasses = useMemo(() => clsx(
    'relative px-3 sm:px-4 py-3 rounded-lg max-w-full break-words transition-all duration-150 hover:-translate-y-px hover:shadow-sm message-bubble',
    (isEditing || hasThinking) ? 'w-full' : 'w-fit',
    sender === 'user' 
      ? 'bg-accent-primary text-text-inverse rounded-br-sm' 
      : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
  ), [sender, isEditing, hasThinking]);

  return (
    <div 
      className={containerClasses}
      data-message-id={id}
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
          onCodeUpdate={handleCodeUpdate}
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
        onRegenerateResponse={canRegenerate ? handleRegenerateClick : undefined}
        onMessagePairCapture={sender === 'ai' && isComplete !== false ? handleMessagePairCapture : undefined}
      />
    </div>
  );
};

export default memo(MessageItem);
