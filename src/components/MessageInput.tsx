import React, { useState, useRef, KeyboardEvent, ChangeEvent, useEffect, DragEvent } from 'react';
import { FaPaperclip, FaTimes, FaUpload, FaPaperPlane } from 'react-icons/fa'; // Added FaPaperPlane
import { PreviewFile } from '../types/chat';
import { fileService } from '../services/fileService';
import './MessageInput.css';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: (text: string, files?: { id: string; file: File }[]) => void;
  isProcessing: boolean;
  initialFiles?: PreviewFile[];
}

const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSendMessage,
  isProcessing,
  initialFiles = []
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);

  // Effect to sync with initialFiles prop when it changes
  useEffect(() => {
    setSelectedFiles(initialFiles);
  }, [initialFiles]);

  // Effect to auto-resize textarea on mount and when value changes
  useEffect(() => {
    if (textAreaRef.current) {
      adjustTextareaHeight();
    }
  }, [value]);

  // Function to adjust textarea height
  const adjustTextareaHeight = () => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    
    // Reset height to auto so we can get the right scrollHeight
    textarea.style.height = 'auto';
    
    // Set height based on content
    const newHeight = Math.min(textarea.scrollHeight, 150); // Cap at max-height
    textarea.style.height = `${newHeight}px`;
  };

  // Function to handle Send button click
  const handleSendClick = () => {
    const filesToSend = selectedFiles
      .filter(pf => pf.status === 'pending')
      .map(pf => ({ id: pf.id, file: pf.file }));

    const textToSend = value.trim();

    // If nothing to send or if processing, exit
    if ((!textToSend && filesToSend.length === 0) || isProcessing) return;

    // Call parent's handler
    onSendMessage(textToSend, filesToSend.length > 0 ? filesToSend : undefined);

    // Clear text input locally
    onChange('');

    // Reset textarea height
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
    }
  };

  // Function to handle Enter key press
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendClick();
    }
  };

  // Function to auto-resize textarea
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    adjustTextareaHeight();
  };

  // Function to trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Function to handle files from any source (input or drop)
  const processFiles = (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const newPreviewFiles = Array.from(files)
      .map(file => fileService.createPreviewFile(file));
    
    // Add to existing files
    setSelectedFiles(prev => [...prev, ...newPreviewFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to handle file selection from input
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    processFiles(event.target.files);
  };

  // Function to handle removing a file
  const handleRemoveFile = (idToRemove: string) => {
    // Find the file to remove
    const fileToRemove = selectedFiles.find(f => f.id === idToRemove);
    
    // Revoke preview URL if not a completed upload
    if (fileToRemove && fileToRemove.status !== 'complete') {
      fileService.revokePreviewUrl(fileToRemove.id);
    }
    
    // Remove from state
    setSelectedFiles(prev => prev.filter(file => file.id !== idToRemove));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if the target is the dropArea or leaving the document
    if (e.currentTarget === dropAreaRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`message-input-container ${isDragging ? 'drag-active' : ''}`}
      ref={dropAreaRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay when dragging files */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-prompt">
            <FaUpload size={32} />
            <p>Drop files to upload</p>
          </div>
        </div>
      )}
      
      {/* File Preview Area */}
      {selectedFiles.length > 0 && (
        <div className="file-preview-area">
          {selectedFiles.map((pf) => (
            <div key={pf.id} className={`file-preview-item status-${pf.status}`}>
              {/* Image or Icon */}
              {fileService.isImage(pf.file) ? (
                <img src={pf.previewUrl} alt={pf.file.name} className="file-preview-image" />
              ) : (
                <div className="file-preview-icon">📄</div>
              )}
              {/* Name and Progress/Status */}
              <div className="file-preview-details">
                <span className="file-preview-name" title={pf.file.name}>{pf.file.name}</span>
                {pf.status === 'uploading' && (
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${pf.progress}%` }}></div>
                  </div>
                )}
                {pf.status === 'complete' && pf.finalFileData && (
                  <span className="status-text complete">Sent: {pf.finalFileData.name}</span>
                )}
                {pf.status === 'complete' && !pf.finalFileData && <span className="status-text complete">Sent</span>}
              </div>
              {/* Remove Button (only if pending) */}
              {pf.status === 'pending' && (
                <button onClick={() => handleRemoveFile(pf.id)} className="remove-file-button" aria-label="Remove file">
                  <FaTimes size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="message-input-area">
        <button 
          onClick={handleUploadClick} 
          className="upload-button" 
          aria-label="Attach file" 
          title="Attach file" 
          disabled={isProcessing}
        >
          <FaPaperclip />
        </button>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
        />
        <textarea
          ref={textAreaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or drop files..."
          rows={1}
          disabled={isProcessing}
          className="message-textarea"
        />
        <button
          onClick={handleSendClick}
          disabled={isProcessing || (!value.trim() && selectedFiles.filter(f => f.status === 'pending').length === 0)}
          className={`send-button ${isProcessing ? 'is-processing' : ''}`}
          aria-label="Send message"
        >
          {isProcessing ? 
            <span className="loading-dots"></span> : 
            <FaPaperPlane size={16} />
          }
        </button>
      </div>
    </div>
  );
};

export default MessageInput; 