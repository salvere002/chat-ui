import { ApiClient } from '../apiClient';
import { AbstractBaseAdapter, StreamCallbacks, ProgressCallback } from './BaseAdapter';
import { ApiError, MessageRequest, MessageResponse, FileUploadResponse } from '../../types/api';

/**
 * REST API adapter for standard HTTP backend
 * Implements the BaseAdapter interface for the default REST API backend
 */
export class RestApiAdapter extends AbstractBaseAdapter {
  constructor(apiClient: ApiClient) {
    super(apiClient);
  }
  
  /**
   * Send a message and get a complete response
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    try {
      return await this.apiClient.post<MessageResponse>('/message/fetch', request);
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to send message',
        500,
        { originalError: error }
      );
    }
  }
  
  /**
   * Send a message and get a streaming response
   */
  async sendStreamingMessage(
    request: MessageRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { onChunk, onComplete, onError } = callbacks;
    
    try {
      // Set up SSE connection
      const response = await fetch(`${this.apiClient['baseUrl']}/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new ApiError(
          `Stream request failed with status: ${response.status}`,
          response.status
        );
      }
      
      // Get the reader from the response body stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }
      
      // Create a text decoder for processing chunks
      const decoder = new TextDecoder();
      let buffer = '';
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // If there's any buffer left, process it
          if (buffer) {
            this.processEventData(buffer, onChunk);
          }
          onComplete();
          break;
        }
        
        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process any complete events in the buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last potentially incomplete event
        
        for (const line of lines) {
          if (line.trim() && line.startsWith('data:')) {
            this.processEventData(line, onChunk);
          }
        }
      }
    } catch (error) {
      console.error('Error in stream request:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Process a single event data line from the SSE stream
   */
  private processEventData(eventLine: string, onChunk: StreamCallbacks['onChunk']): void {
    try {
      // Extract the JSON data from the event line
      const dataStr = eventLine.slice(eventLine.indexOf(':') + 1).trim();
      const data = JSON.parse(dataStr);
      
      // Process the chunk
      onChunk({
        text: data.text,
        imageUrl: data.imageUrl,
        complete: data.complete,
      });
    } catch (err) {
      console.error('Error parsing SSE data:', err);
    }
  }
  
  /**
   * Upload a file with progress tracking
   */
  async uploadFile(
    fileId: string,
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        // Start progress indicator
        onProgress(fileId, 0);
        
        // Create form data to send the file
        const formData = new FormData();
        formData.append('file', file);
        
        // Simulate varying progress before the actual upload
        const progressInterval = setInterval(() => {
          const progress = Math.min(85, Math.random() * 30 + 55); // Cap at 85%
          onProgress(fileId, Math.round(progress));
        }, 300);
        
        try {
          // Upload the file - don't set Content-Type header for FormData
          // The browser will automatically set the correct multipart/form-data with boundary
          const data = await this.apiClient.post<FileUploadResponse>('/upload', formData);
          
          // Set progress to 100%
          onProgress(fileId, 100);
          
          // For images, ensure we have a full URL for the API
          let fileUrl = data.url;
          if (fileUrl.startsWith('/')) {
            const baseUrl = this.apiClient['baseUrl'].replace('/api', '');
            fileUrl = `${baseUrl}${fileUrl}`;
          }
          
          // Return the file metadata
          resolve({
            ...data,
            url: fileUrl,
          });
        } finally {
          // Clear the progress interval
          clearInterval(progressInterval);
        }
      } catch (error) {
        console.error(`Upload error for ${fileId}:`, error);
        reject(error);
      }
    });
  }
  
  /**
   * Get all uploaded files
   */
  async getFiles(): Promise<FileUploadResponse[]> {
    return this.apiClient.get<FileUploadResponse[]>('/files');
  }
  
  /**
   * Get a single uploaded file by ID
   */
  async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.apiClient.get<FileUploadResponse>(`/files/${fileId}`);
  }
} 