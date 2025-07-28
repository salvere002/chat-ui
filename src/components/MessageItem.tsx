import React, { useEffect, useState, useRef } from 'react';
import { Message, MessageFile } from '../types/chat'; // Import the Message and MessageFile types
import { FaFileAlt, FaRedo, FaEdit, FaCheck, FaTimes, FaCopy, FaChevronLeft, FaChevronRight } from 'react-icons/fa'; // Import required icons
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import remarkGfm from 'remark-gfm'; // Import GFM plugin
import remarkMath from 'remark-math'; // Import math plugin
import rehypeKatex from 'rehype-katex'; // Import KaTeX plugin
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Import syntax highlighter
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Dark theme
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Light theme
import type { Components } from 'react-markdown'; // Import CodeProps directly from react-markdown
import { fileService } from '../services/fileService';
import useChatStore from '../stores/chatStore';
import { ChatService } from '../services/chatService';
import { useResponseModeStore, useThemeStore } from '../stores';
import LoadingIndicator from './LoadingIndicator';
import ThinkingSection from './ThinkingSection';
import { ConversationMessage } from '../types/api';

interface MessageItemProps {
  message: Message;
  onRegenerateResponse?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  chatId: string;
}

// CodeBlock component with copy functionality
const CodeBlock: React.FC<{ children: string; language: string; className?: string }> = ({ 
  children, 
  language, 
  className,
  ...props 
}) => {
  const [copied, setCopied] = useState(false);
  const { theme } = useThemeStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 500); // Show checkmark for 0.5s
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Use theme-appropriate syntax highlighting
  const syntaxTheme = theme === 'dark' ? vscDarkPlus : oneLight;

  return (
    <div className="relative group/codeblock">
      <SyntaxHighlighter
        style={syntaxTheme}
        language={language}
        PreTag="div"
        className={className}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          backgroundColor: theme === 'dark' ? 'var(--color-bg-secondary)' : '#f8f9fa',
          border: `1px solid var(--color-border-secondary)`,
          fontSize: '0.875rem', // 14px - smaller font size
          lineHeight: '1.5',
          padding: '1rem',
        }}
        {...props}
      >
        {children}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 bg-bg-tertiary hover:bg-bg-secondary text-text-tertiary hover:text-text-primary border border-border-secondary rounded opacity-0 group-hover/codeblock:opacity-100 transition-all duration-200"
        title={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <FaCheck className="text-accent-primary text-xs" />
        ) : (
          <FaCopy className="text-xs" />
        )}
      </button>
    </div>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerateResponse, onEditMessage, chatId }) => {
  // Destructure files array instead of single file
  const { text, sender, timestamp, files, imageUrl, isComplete, id, thinkingContent, isThinkingComplete, thinkingCollapsed, wasPaused } = message;
  
  // Get store methods for branch management
  const { 
    getBranchOptionsAtMessage, 
    switchToBranch, 
    createBranchFromMessage,
    addMessageToChat,
    updateMessageInChat,
    setProcessing,
    getCurrentBranchMessages,
    getChatById
  } = useChatStore();
  
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
  
  // Get branch options
  const branchOptions = getBranchOptionsAtMessage(chatId, id);
  
  
  // Check if this message has branches (either from getBranchOptionsAtMessage or branchPoint flag)
  const hasBranches = branchOptions.length > 1 || message.branchPoint === true;
  const totalBranches = Math.max(branchOptions.length, hasBranches ? 2 : 1);
  
  // Find current branch index
  const currentBranchIndex = branchOptions.findIndex(option => option.id === message.branchId);
  const actualCurrentBranchIndex = currentBranchIndex >= 0 ? currentBranchIndex : 0;
  
  
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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };


  // Handle branch navigation
  const handlePreviousBranch = () => {
    if (hasBranches && actualCurrentBranchIndex > 0 && branchOptions.length > actualCurrentBranchIndex - 1) {
      const previousBranch = branchOptions[actualCurrentBranchIndex - 1];
      if (previousBranch) {
        switchToBranch(chatId, previousBranch.id);
      }
    }
  };

  const handleNextBranch = () => {
    if (hasBranches && actualCurrentBranchIndex < totalBranches - 1 && branchOptions.length > actualCurrentBranchIndex + 1) {
      const nextBranch = branchOptions[actualCurrentBranchIndex + 1];
      if (nextBranch) {
        switchToBranch(chatId, nextBranch.id);
      }
    }
  };

  // Generate AI response for new branch
  const generateAIResponseForNewBranch = async (userText: string, userFiles: any[]) => {
    if (!chatId) return;
    
    try {
      // Set processing state
      setProcessing(true);
      
      // Create a unique message ID for AI response
      const aiMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
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
        .map(msg => ({
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
          userText,
          userFiles,
          {
            onChunk: (chunk) => {
              // Handle thinking content streaming
              if (chunk.thinking) {
                const currentMessage = getChatById(chatId)?.messages.find(m => m.id === aiMessageId);
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
            onComplete: () => {
              // Mark as complete when done
              updateMessageInChat(chatId, aiMessageId, {
                isComplete: true,
                isThinkingComplete: true // Ensure thinking is also marked complete
              });
              // Clear processing state
              setProcessing(false);
              // Reset accumulated text
              accumulatedTextRef.current = '';
            },
            onError: (error) => {
              // Show error and mark message as complete
              console.error('AI response error:', error.message);
              updateMessageInChat(chatId, aiMessageId, {
                text: 'Sorry, there was an error processing your request.',
                isComplete: true
              });
              // Clear processing state
              setProcessing(false);
              // Reset accumulated text
              accumulatedTextRef.current = '';
            }
          },
          history
        );
      } else {
        // Non-streaming API call
        const response = await ChatService.sendMessage(userText, userFiles, history);
        // Update AI message with complete response
        updateMessageInChat(chatId, aiMessageId, {
          text: response.text,
          imageUrl: response.imageUrl,
          isComplete: true,
          thinkingContent: response.thinking,
          isThinkingComplete: true
        });
        // Clear processing state
        setProcessing(false);
      }
    } catch (error) {
      // Handle errors
      console.error("Error generating AI response for new branch:", error);
      setProcessing(false);
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

  // Handle copy message
  const handleCopyMessage = () => {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      });
    }
  };

  // Handle textarea input change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };

  // Helper component to render a single file attachment
  const FileAttachment: React.FC<{ file: MessageFile }> = ({ file }) => {
    // Track image URLs to prevent them from being revoked
    if (file.type.startsWith('image/')) {
      fileService.trackActiveImageUrl(file.url);
    }
    
    // Rendering FileAttachment
    return (
      <div className="inline-block max-w-xs bg-bg-secondary border border-border-secondary rounded-lg overflow-hidden">
        {file.type.startsWith('image/') ? (
          <img src={file.url} alt={file.name} className="w-full h-auto max-w-xs max-h-48 object-cover" />
        ) : (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 text-text-primary hover:bg-bg-tertiary transition-colors duration-150">
            <FaFileAlt className="text-accent-primary text-lg flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{file.name}</span>
              <span className="text-xs text-text-tertiary">{fileService.formatFileSize(file.size)}</span>
            </div>
          </a>
        )}
      </div>
    );
  };

  // Check if this is an incomplete AI message (for streaming)
  const isIncomplete = sender === 'ai' && isComplete === false;

  return (
    <div 
      className={`group flex flex-col px-2 sm:px-4 py-2 max-w-[90%] sm:max-w-[85%] animate-message-slide transition-colors duration-150 hover:bg-bg-secondary hover:rounded-lg ${sender === 'user' ? 'self-end items-end' : 'self-start items-start'} ${isEditing ? 'editing w-[90%] sm:w-[85%] max-w-[90%] sm:max-w-[85%]' : ''}`}
      data-is-complete={isComplete !== false}
    >
      <div className={`relative px-3 sm:px-4 py-3 rounded-lg max-w-full w-fit break-words transition-all duration-150 hover:-translate-y-px hover:shadow-sm ${
        sender === 'user' 
          ? 'bg-accent-primary text-text-inverse rounded-br-sm' 
          : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
      }`}>
        {/* Render thinking section for AI messages */}
        {sender === 'ai' && (thinkingContent || (thinkingContent !== undefined && !isThinkingComplete)) && (
          <div className="mb-3">
            <ThinkingSection
              thinkingContent={thinkingContent}
              isThinkingComplete={isThinkingComplete}
              isStreaming={!isComplete}
              initialCollapsed={thinkingCollapsed !== false}
              onToggle={handleThinkingToggle}
            />
          </div>
        )}

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
          <div className="mb-3">
            {/* Track this image URL to prevent revocation */}
            {(() => { fileService.trackActiveImageUrl(imageUrl); return null; })()}
            <img src={imageUrl} alt="AI generated" className="w-full h-auto max-w-xs max-h-48 object-cover rounded-lg" />
          </div>
        )}
        
        {/* Render text content */}
        {text && !isEditing && (
          <div className="prose prose-sm max-w-none text-current">
            <ReactMarkdown
              children={text}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      className={className}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              } as Components}
            />
            
            {/* Add typing indicator if AI message is incomplete */}
            {isIncomplete && (
              <LoadingIndicator type="dots" size="small" />
            )}
          </div>
        )}
        
        {/* Edit mode text area */}
        {isEditing && (
          <div className="w-full">
            <textarea
              ref={textareaRef}
              className="w-full min-h-[80px] p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-lg font-sans text-sm leading-normal resize-none transition-all duration-150 focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)]"
              value={editText}
              onChange={handleTextareaChange}
              placeholder="Edit your message..."
              autoFocus
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button className="flex items-center gap-2 px-3 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary" onClick={handleCancelEdit}>
                <FaTimes /> Cancel
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm cursor-pointer transition-all duration-150 hover:bg-accent-hover" onClick={handleSaveEdit}>
                <FaCheck /> Save
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
      </div>
      
      {/* Branch indicator - always visible when branches exist */}
      {hasBranches && totalBranches > 1 && (
        <div className="flex items-center mt-1 px-1 text-xs gap-2">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-secondary rounded-md p-1">
            <button 
              className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
              onClick={handlePreviousBranch}
              disabled={actualCurrentBranchIndex <= 0}
              title="Previous branch"
            >
              <FaChevronLeft className="text-[10px]" />
            </button>
            <span className="text-xs text-text-secondary font-medium min-w-[24px] text-center px-1">
              {actualCurrentBranchIndex + 1}/{totalBranches}
            </span>
            <button 
              className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
              onClick={handleNextBranch}
              disabled={actualCurrentBranchIndex >= totalBranches - 1}
              title="Next branch"
            >
              <FaChevronRight className="text-[10px]" />
            </button>
          </div>
        </div>
      )}
      
      {/* Actions footer - only show when hovering (moved outside message-content) */}
      <div className="flex items-center mt-1 px-1 opacity-0 transition-opacity duration-150 text-xs text-text-tertiary gap-2 group-hover:opacity-100">
        <div className="mr-auto flex items-center gap-2">
          {formatTime(timestamp)}
          {wasPaused && sender === 'ai' && (
            <span className="text-orange-500 text-xs opacity-70" title="Response was paused">
              ⏸
            </span>
          )}
        </div>
        
        <div className="flex gap-1 items-center">
          
          {/* Copy button for all messages with text */}
          {text && (
            <button 
              className={`flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90 ${copied ? 'text-success' : ''}`}
              onClick={handleCopyMessage}
              title={copied ? "Copied" : "Copy text"}
            >
              {copied ? <span className="absolute inset-0 flex items-center justify-center text-base animate-check-mark">✓</span> : <FaCopy className="relative z-10 text-sm" />}
            </button>
          )}
          
          {/* For user messages: Create Branch button (replacing edit) */}
          {sender === 'user' && isComplete !== false && onEditMessage && !isEditing && (
            <button 
              className="flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90"
              onClick={() => setIsEditing(true)}
              title="Create new branch"
            >
              <FaEdit className="relative z-10 text-sm" />
            </button>
          )}
          
          {/* Regenerate button for user messages */}
          {sender === 'user' && isComplete !== false && onRegenerateResponse && (
            <button 
              className="flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90"
              onClick={onRegenerateResponse}
              title="Regenerate response"
            >
              <FaRedo className="relative z-10 text-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;