import React, { useState, useRef, KeyboardEvent, ChangeEvent, DragEvent, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FaPaperclip, FaTimes, FaUpload, FaPaperPlane, FaPause } from 'react-icons/fa';
import { PreviewFile } from '../types/chat';
import { fileService } from '../services/fileService';
import { backend } from '../utils/config';
import { useInputStore } from '../stores';
import AgentSelector from './AgentSelector';
import ModelSelector from './ModelSelector';
import DeepResearchToggle from './DeepResearchToggle';

interface MessageInputProps {
  onSendMessage: (text: string, files?: { id: string; file: File }[]) => void;
  onPauseRequest: () => void;
  isProcessing: boolean;
  isFileProcessing?: boolean;
  selectedFiles: PreviewFile[];
  onFileRemove: (fileId: string) => void;
  onProcessFiles: (files: FileList) => void;
  showTopBorder?: boolean;
  onFocusChange?: (isFocused: boolean) => void;
}

// Convert allowed extensions from config to accept attribute format
const createAcceptAttribute = (): string => {
  const allowedExtensions = backend.uploads.allowedExtensions || [];
  
  // Create MIME type mappings for common extensions
  const mimeTypeMappings: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  // Convert extensions to accept format
  const acceptTypes = allowedExtensions.map(ext => {
    // First try to use MIME type if available
    if (mimeTypeMappings[ext]) {
      return mimeTypeMappings[ext];
    }
    // Fallback to extension format
    return `.${ext}`;
  });
  
  return acceptTypes.join(',');
};

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onPauseRequest,
  isProcessing,
  isFileProcessing = false,
  selectedFiles,
  onFileRemove,
  onProcessFiles,
  showTopBorder = true,
  onFocusChange
}) => {
  // Get input value and setter from input store
  const { inputValue: value, setInputValue: onChange, resetInput } = useInputStore();
  
  // Background texture is centralized at the app root
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  

  // Use refs for stable access to current values in callbacks
  const valueRef = useRef(value);
  const selectedFilesRef = useRef(selectedFiles);
  const onSendMessageRef = useRef(onSendMessage);

  // Update refs when props change
  valueRef.current = value;
  selectedFilesRef.current = selectedFiles;
  onSendMessageRef.current = onSendMessage;


  // Handle focus change
  const handleFocus = useCallback(() => {
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleBlur = useCallback(() => {
    onFocusChange?.(false);
  }, [onFocusChange]);

  // No per-component texture classes here

  // Function to handle Send/Pause button click
  const handleButtonClick = useCallback(() => {
    // If currently processing messages (not files), pause the request
    if (isProcessing && !isFileProcessing) {
      onPauseRequest();
      return;
    }

    // Otherwise, send the message
    const filesToSend = selectedFilesRef.current
      .filter(pf => pf.status === 'pending')
      .map(pf => ({ id: pf.id, file: pf.file }));

    const textToSend = valueRef.current.trim();

    // If nothing to send or if file processing, exit
    if ((!textToSend && filesToSend.length === 0) || isFileProcessing) return;

    // Call parent's handler
    onSendMessageRef.current(textToSend, filesToSend.length > 0 ? filesToSend : undefined);

    // Clear text input using store
    resetInput();

  }, [isProcessing, isFileProcessing, onPauseRequest, resetInput]);

  // Function to handle Enter key press
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Only send if not currently processing - don't allow pause via Enter key
      if (!isProcessing) {
        // Inline the send logic to avoid depending on handleButtonClick
        const filesToSend = selectedFilesRef.current
          .filter(pf => pf.status === 'pending')
          .map(pf => ({ id: pf.id, file: pf.file }));

        const textToSend = valueRef.current.trim();

        // If nothing to send or if file processing, exit
        if ((!textToSend && filesToSend.length === 0) || isFileProcessing) return;

        // Call parent's handler
        onSendMessageRef.current(textToSend, filesToSend.length > 0 ? filesToSend : undefined);

        // Clear text input using store
        resetInput();
      }
    }
  }, [isProcessing, isFileProcessing, resetInput]);

  // Function to handle textarea input
  const handleInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  }, [onChange]);

  // Function to trigger file input click
  const handleUploadClick = useCallback(() => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  }, [isProcessing]);

  // Function to handle file selection from input
  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    onProcessFiles(event.target.files);
    
    // Clear the input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onProcessFiles]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if the target is the dropArea or leaving the document
    if (e.currentTarget === dropAreaRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onProcessFiles(e.dataTransfer.files);
    }
  }, [onProcessFiles]);

  return (
    <div 
      className={`flex flex-col px-1 py-3 sm:p-4 ${showTopBorder ? 'border-t border-border-secondary' : ''} w-full max-w-[800px] sm:mx-auto relative transition-all duration-200 ${isDragging ? 'bg-accent-light border-accent-primary' : ''}`}
      ref={dropAreaRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay when dragging files */}
      {isDragging && (
        <div className="absolute inset-0 bg-bg-elevated/95 flex items-center justify-center rounded-lg z-10 animate-fade-in">
          <div className="flex flex-col items-center gap-3 p-5 text-accent-primary text-center border-2 border-dashed border-accent-primary rounded-lg bg-accent-light">
            <FaUpload size={32} />
            <p className="text-base font-medium m-0">Drop files to upload</p>
          </div>
        </div>
      )}
      
      {/* File Preview Area */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-bg-secondary border border-border-secondary rounded-md max-h-[120px] overflow-y-auto transition-all duration-150">
          {selectedFiles.map((pf) => (
            <div key={pf.id} className={`flex items-center gap-2 bg-bg-elevated border border-border-secondary rounded-md px-3 py-2 max-w-[200px] relative transition-all duration-150 hover:border-accent-primary hover:-translate-y-px hover:shadow-sm ${pf.status === 'error' ? 'bg-error text-text-inverse border-error' : ''}`}>
              {/* Image or Icon */}
              {fileService.isImage(pf.file) ? (
                <img src={pf.previewUrl} alt={pf.file.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-xl flex-shrink-0">📄</div>
              )}
              {/* Name and Progress/Status */}
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-medium text-text-primary truncate" title={pf.file.name}>{pf.file.name}</span>
                {pf.status === 'uploading' && (
                  <div className="w-full bg-bg-tertiary rounded-full h-1 mt-1 overflow-hidden">
                    <div className="h-full bg-accent-primary transition-all duration-300 rounded-full" style={{ width: `${pf.progress}%` }}></div>
                  </div>
                )}
                {pf.status === 'complete' && pf.finalFileData && (
                  <span className="block text-xs text-success mt-0.5">Sent: {pf.finalFileData.name}</span>
                )}
                {pf.status === 'complete' && !pf.finalFileData && <span className="block text-xs text-success mt-0.5">Sent</span>}
              </div>
              {/* Remove Button (only if pending) */}
              {pf.status === 'pending' && (
                <button onClick={() => onFileRemove(pf.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-error text-text-inverse rounded-full flex items-center justify-center text-xs cursor-pointer transition-all duration-150 hover:bg-error/80" aria-label="Remove file">
                  <FaTimes size={8} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="bg-bg-secondary border border-border-secondary rounded-lg p-2 transition-all duration-150 relative focus-within:border-border-focus focus-within:shadow-[0_0_0_3px_var(--color-accent-light)] focus-within:bg-bg-primary">
        {/* Textarea */}
        <TextareaAutosize
          ref={textAreaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Type your message or drop files..."
          disabled={isProcessing}
          minRows={2}
          maxRows={16}
          style={{ 
            transition: 'height 150ms ease'
          }}
          className="w-full px-2 sm:px-3 py-2 mb-2 bg-transparent text-text-primary border-none font-sans text-sm sm:text-base leading-normal resize-none overflow-y-auto focus:outline-none placeholder:text-text-tertiary"
        />
        
        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left side controls: Upload, Model, Agent, Deep Research */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 scrollbar-none">
            <button
              onClick={handleUploadClick} 
              className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 flex-shrink-0 hover:bg-bg-tertiary hover:text-accent-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
              aria-label="Attach file" 
              title="Attach file" 
              disabled={isProcessing}
            >
              <FaPaperclip className="w-[16px] h-[16px]" />
            </button>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <ModelSelector />
              <AgentSelector />
              <DeepResearchToggle />
            </div>
          </div>
          
          {/* Right side: Send/Pause button */}
          <button
            onClick={handleButtonClick}
            disabled={isFileProcessing || (!isProcessing && !value.trim() && selectedFiles.filter(f => f.status === 'pending').length === 0)}
            className={`flex items-center justify-center w-9 h-9 p-0 border-none rounded-md cursor-pointer transition-all duration-150 flex-shrink-0 relative overflow-hidden hover:-translate-y-px hover:shadow-sm active:scale-95 disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed ${
              isProcessing && !isFileProcessing 
                ? 'bg-orange-500 text-text-inverse hover:bg-orange-600' 
                : 'bg-accent-primary text-text-inverse hover:bg-accent-hover'
            }`}
            aria-label={isProcessing && !isFileProcessing ? "Pause response" : "Send message"}
          >
            {isFileProcessing ? 
              <span className="flex items-center justify-center gap-0.5">
                <span className="w-1 h-1 bg-current rounded-full animate-pulse-dot" />
                <span className="w-1 h-1 bg-current rounded-full animate-pulse-dot" style={{animationDelay: '-0.16s'}} />
                <span className="w-1 h-1 bg-current rounded-full animate-pulse-dot" style={{animationDelay: '-0.32s'}} />
              </span> : 
              isProcessing && !isFileProcessing ?
                <FaPause size={16} className="relative z-10" /> :
                <FaPaperPlane size={16} className="relative z-10" />
            }
          </button>
        </div>
        
        {/* Hidden file input */}
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept={createAcceptAttribute()}
        />
      </div>
    </div>
  );
};

export default MessageInput; 
