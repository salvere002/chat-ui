import React, { useEffect, useState } from 'react';
import { Message, MessageFile } from '../types/chat'; // Import the Message and MessageFile types
import { FaFileAlt, FaRedo, FaEdit, FaCheck, FaTimes } from 'react-icons/fa'; // Import required icons
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import remarkGfm from 'remark-gfm'; // Import GFM plugin
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Import syntax highlighter
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Import a theme (adjust path as needed)
import type { Components } from 'react-markdown'; // Import CodeProps directly from react-markdown
import './MessageItem.css';
import { fileService } from '../services/fileService';
import { useChat } from '../contexts/ChatContext';

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

  // Helper component to render a single file attachment
  const FileAttachment: React.FC<{ file: MessageFile }> = ({ file }) => {
    // Track image URLs to prevent them from being revoked
    if (file.type.startsWith('image/')) {
      fileService.trackActiveImageUrl(file.url);
    }
    
    console.log(`Rendering FileAttachment for ${file.name} (ID: ${file.id}): URL = ${file.url}, Type = ${file.type}`);
    return (
      <div className="message-file-attachment">
        {file.type.startsWith('image/') ? (
          <img src={file.url} alt={file.name} className="message-image-preview" />
        ) : (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="message-file-link">
            <FaFileAlt className="message-file-icon" />
            <div className="message-file-details">
              <span className="message-file-name">{file.name}</span>
              <span className="message-file-size">{fileService.formatFileSize(file.size)}</span>
            </div>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className={`message-item ${sender}`}>
      <div className="message-content">
        {/* Render user's file attachments (map over the files array) */}
        {sender === 'user' && files && files.length > 0 && (
          <div className="message-files-container"> {/* Optional container for spacing/layout */}
            {files.map((file) => (
              <FileAttachment key={file.id} file={file} />
            ))}
          </div>
        )}
        {/* Render AI's image if present */}
        {imageUrl && sender === 'ai' && (
          <div className="message-ai-image-attachment">
            {/* Track this image URL to prevent revocation */}
            {(() => { fileService.trackActiveImageUrl(imageUrl); return null; })()}
            <img src={imageUrl} alt="AI generated image" className="message-image-preview" />
          </div>
        )}
        {/* Render text using ReactMarkdown if present */}
        {text && !isEditing && (
          <div className="message-text">
            <ReactMarkdown
              children={text}
              remarkPlugins={[remarkGfm]} // Enable GFM features
              components={{
                // Use 'any' for props to bypass strict type checking here
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
              } as Components } // Keep the cast for the overall components object
            />
            {/* Add typing indicator if AI message is incomplete */}
            {sender === 'ai' && isComplete === false && (
              <span className="typing-indicator">
                <span></span><span></span><span></span>
              </span>
            )}
          </div>
        )}
        {/* Edit mode text area */}
        {isEditing && (
          <div className="message-edit-container">
            <textarea
              className="message-edit-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={Math.max(3, (editText.match(/\n/g) || []).length + 1)}
            />
            <div className="message-edit-actions">
              <button className="message-edit-save" onClick={handleSaveEdit}>
                <FaCheck /> Save
              </button>
              <button className="message-edit-cancel" onClick={handleCancelEdit}>
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        )}
        {/* If no text but still incomplete (e.g., only image incoming), show indicator */}
        {!text && sender === 'ai' && isComplete === false && (
            <div className="message-text">
              <span className="typing-indicator">
                <span></span><span></span><span></span>
              </span>
            </div>
        )}
        {/* Timestamp and actions row */}
        <div className="message-footer">
          <div className="message-timestamp">{formatTime(timestamp)}</div>
          
          {/* Message actions */}
          <div className="message-actions">
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
            
            {/* For AI messages: Regenerate button (if complete) */}
            {sender === 'ai' && isComplete !== false && onRegenerateResponse && (
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
    </div>
  );
};

export default MessageItem; 