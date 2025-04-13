import React, { useState, useCallback, useRef } from 'react';
import { ChatService, StreamCallbacks } from '../../services/chatService';
import { Message, MessageFile } from '../../types/chat';
import { nanoid } from 'nanoid';

/**
 * Example component demonstrating the usage of the chat service
 */
const ChatExample: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const activeMessageRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add a new message to the chat
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);
  
  // Update an existing message by ID
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg)
    );
  }, []);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  // Handle progress updates during file upload
  const handleProgress = useCallback((fileId: string, progress: number) => {
    setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
  }, []);
  
  // Upload files and get their metadata
  const uploadFiles = async (): Promise<MessageFile[]> => {
    if (!files.length) return [];
    
    const uploadedFiles: MessageFile[] = [];
    
    for (const file of files) {
      const fileId = nanoid();
      try {
        const uploadedFile = await ChatService.uploadFile(fileId, file, handleProgress);
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setHasError(true);
      }
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Reset state
    setFiles([]);
    setUploadProgress({});
    
    return uploadedFiles;
  };
  
  // Send a message using either streaming or regular API
  const sendMessage = async (useStreaming = true) => {
    if (!inputText.trim() && !files.length) return;
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      // Create a user message
      const userMessageId = nanoid();
      const userMessage: Message = {
        id: userMessageId,
        text: inputText,
        sender: 'user',
        timestamp: new Date(),
      };
      
      // Add the user message to the chat
      addMessage(userMessage);
      
      // Clear the input
      setInputText('');
      
      // Upload any files
      const uploadedFiles = await uploadFiles();
      
      // If there was an error during file upload, stop here
      if (hasError) {
        setIsLoading(false);
        return;
      }
      
      // Update the user message with the uploaded files
      if (uploadedFiles.length > 0) {
        updateMessage(userMessageId, { files: uploadedFiles });
      }
      
      // Create an empty AI message to be filled with the streaming response
      const aiMessageId = nanoid();
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isComplete: false,
      };
      
      // Add the initial AI message
      addMessage(aiMessage);
      
      // Track the active message ID
      activeMessageRef.current = aiMessageId;
      
      if (useStreaming) {
        // Define streaming callbacks
        const callbacks: StreamCallbacks = {
          onChunk: (chunk) => {
            if (!activeMessageRef.current) return;
            
            updateMessage(activeMessageRef.current, {
              text: (messages.find(m => m.id === activeMessageRef.current)?.text || '') + (chunk.text || ''),
              imageUrl: chunk.imageUrl,
              isComplete: chunk.complete,
            });
          },
          onComplete: () => {
            setIsLoading(false);
            setHasError(false);
            activeMessageRef.current = null;
          },
          onError: (error) => {
            console.error('Stream error:', error);
            setIsLoading(false);
            setHasError(true);
            
            // Update the AI message with error text
            if (activeMessageRef.current) {
              updateMessage(activeMessageRef.current, {
                text: `[Error: ${error.message || 'Failed to fetch response'}]`,
                isComplete: true,
              });
            }
            
            activeMessageRef.current = null;
          }
        };
        
        // Send the message with streaming
        await ChatService.sendStreamingMessage(userMessage.text, uploadedFiles, callbacks);
      } else {
        // Send the message without streaming
        const response = await ChatService.sendMessage(userMessage.text, uploadedFiles);
        
        // Update the AI message with the response
        updateMessage(aiMessageId, {
          text: response.text,
          imageUrl: response.imageUrl,
          isComplete: true,
        });
        
        setIsLoading(false);
        setHasError(false);
        activeMessageRef.current = null;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setHasError(true);
      
      // Add an error message to the chat if we don't have an active message yet
      if (activeMessageRef.current) {
        updateMessage(activeMessageRef.current, {
          text: `[Error sending message: ${error instanceof Error ? error.message : 'Failed to fetch'}]`,
          isComplete: true,
        });
      } else {
        // If no active message exists, create a new one for the error
        const errorMessageId = nanoid();
        addMessage({
          id: errorMessageId,
          text: `[Error sending message: ${error instanceof Error ? error.message : 'Failed to fetch'}]`,
          sender: 'ai',
          timestamp: new Date(),
          isComplete: true,
        });
      }
      
      activeMessageRef.current = null;
    }
  };
  
  return (
    <div className="chat-example">
      <div className="message-list">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              <p>{message.text}</p>
              
              {message.imageUrl && (
                <div className="message-image">
                  <img src={message.imageUrl} alt="AI generated" />
                </div>
              )}
              
              {message.files && message.files.length > 0 && (
                <div className="message-files">
                  {message.files.map(file => (
                    <div key={file.id} className="file-item">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        {file.name} ({file.type.split('/')[0]}, {(file.size / 1024).toFixed(1)}KB)
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && !hasError && activeMessageRef.current === null && (
          <div className="loading-indicator">Loading...</div>
        )}
      </div>
      
      <div className="message-input">
        <div className="file-uploads">
          {files.length > 0 && (
            <div className="selected-files">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  {file.name} - {uploadProgress[file.name] || 0}%
                </div>
              ))}
            </div>
          )}
          
          <label className="file-upload-button">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            📎
          </label>
        </div>
        
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(true);
            }
          }}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        
        <button
          onClick={() => sendMessage(true)}
          disabled={isLoading || (!inputText.trim() && !files.length)}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatExample; 