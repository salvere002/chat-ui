import React, { useEffect, useState, useRef } from 'react';
import { Message, MessageFile } from '../types/chat'; // Import the Message and MessageFile types
import { FaFileAlt, FaRedo, FaEdit, FaCheck, FaTimes, FaCopy } from 'react-icons/fa'; // Import required icons
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import remarkGfm from 'remark-gfm'; // Import GFM plugin
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Import syntax highlighter
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Import a theme (adjust path as needed)
import type { Components } from 'react-markdown'; // Import CodeProps directly from react-markdown
import './MessageItem.css';
import { fileService } from '../services/fileService';
import { useChatStore } from '../stores';
import LoadingIndicator from './LoadingIndicator';

interface MessageItemProps {
  message: Message;
  onRegenerateResponse?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerateResponse, onEditMessage }) => {
  // Destructure files array instead of single file
  const { text, sender, timestamp, files, imageUrl, isComplete, id } = message;
  
  // Local state for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');

  // State for copy button feedback
  const [copied, setCopied] = useState(false);

  // Ref for textarea auto-resizing
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle edit save
  const handleSaveEdit = () => {
    if (onEditMessage && editText.trim()) {
      onEditMessage(id, editText);
    }
    setIsEditing(false);
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
    
    console.log(`Rendering FileAttachment for ${file.name} (ID: ${file.id}): URL = ${file.url}, Type = ${file.type}`);
    return (
      <div className="file-attachment">
        {file.type.startsWith('image/') ? (
          <img src={file.url} alt={file.name} className="message-image-preview" />
        ) : (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-link">
            <FaFileAlt className="file-icon" />
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{fileService.formatFileSize(file.size)}</span>
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
      className={`message-item ${sender} ${isEditing ? 'editing' : ''}`} 
      data-is-complete={isComplete !== false}
    >
      <div className="message-content">
        {/* Render user's file attachments */}
        {files && files.length > 0 && (
          <div className="file-attachments-wrapper">
            {files.map((file) => (
              <FileAttachment key={file.id} file={file} />
            ))}
          </div>
        )}
        
        {/* Render AI's image if present */}
        {imageUrl && sender === 'ai' && (
          <div className="ai-image-wrapper">
            {/* Track this image URL to prevent revocation */}
            {(() => { fileService.trackActiveImageUrl(imageUrl); return null; })()}
            <img src={imageUrl} alt="AI generated" className="message-image-preview" />
          </div>
        )}
        
        {/* Render text content */}
        {text && !isEditing && (
          <div className="message-text">
            <ReactMarkdown
              children={text}
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
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
          <div className="message-edit-container">
            <textarea
              ref={textareaRef}
              className="message-edit-textarea"
              value={editText}
              onChange={handleTextareaChange}
              placeholder="Edit your message..."
              autoFocus
            />
            <div className="message-edit-actions">
              <button className="message-edit-cancel" onClick={handleCancelEdit}>
                <FaTimes /> Cancel
              </button>
              <button className="message-edit-save" onClick={handleSaveEdit}>
                <FaCheck /> Save
              </button>
            </div>
          </div>
        )}
        
        {/* If no text but still incomplete (e.g., only image incoming), show indicator */}
        {!text && isIncomplete && (
          <LoadingIndicator type="dots" size="small" />
        )}
      </div>
      
      {/* Actions footer - only show when hovering (moved outside message-content) */}
      <div className="message-footer">
        <div className="message-timestamp">{formatTime(timestamp)}</div>
        
        <div className="message-actions">
          {/* Copy button for all messages with text */}
          {text && (
            <button 
              className={`message-action-button copy-button ${copied ? 'copied' : ''}`} 
              onClick={handleCopyMessage}
              title={copied ? "Copied" : "Copy text"}
            >
              <FaCopy />
            </button>
          )}
          
          {/* For user messages: Edit button (if editable and complete) */}
          {sender === 'user' && isComplete !== false && onEditMessage && !isEditing && (
            <button 
              className="message-action-button edit-button" 
              onClick={() => setIsEditing(true)}
              title="Edit message"
            >
              <FaEdit />
            </button>
          )}
          
          {/* Regenerate button for user messages */}
          {sender === 'user' && isComplete !== false && onRegenerateResponse && (
            <button 
              className="message-action-button regenerate-button" 
              onClick={onRegenerateResponse}
              title="Regenerate response"
            >
              <FaRedo />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;