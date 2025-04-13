import { AbstractBaseAdapter, StreamCallbacks, ProgressCallback } from './BaseAdapter';
import { ApiError, MessageRequest, MessageResponse, FileUploadResponse } from '../../types/api';
import { ApiClient } from '../apiClient';

/**
 * OpenAI API adapter
 * Implements the BaseAdapter interface for OpenAI API
 */
export class OpenAIAdapter extends AbstractBaseAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(
    apiClient: ApiClient, 
    config: { 
      apiKey: string; 
      model?: string; 
      baseUrl?: string;
    }
  ) {
    super(apiClient);
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4-turbo';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  /**
   * Send a message and get a complete response
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.formatMessages(request),
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `OpenAI request failed: ${response.status} - ${errorText}`,
          response.status
        );
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || '',
        // OpenAI doesn't provide images in standard completions
        // If using DALL-E, would need a separate endpoint call
      };
    } catch (error) {
      console.error('Error in OpenAI request:', error);
      throw error instanceof Error ? error : new Error(String(error));
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.formatMessages(request),
          temperature: 0.7,
          max_tokens: 1000,
          stream: true // Enable streaming
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `OpenAI stream request failed: ${response.status} - ${errorText}`,
          response.status
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete();
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE format from OpenAI
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines or "data: [DONE]"
          if (!trimmedLine || trimmedLine === 'data: [DONE]') {
            continue;
          }
          
          // Process data line
          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6);
            
            try {
              // Skip initial empty data object
              if (jsonStr === '[DONE]') continue;
              
              const json = JSON.parse(jsonStr);
              const content = json.choices[0]?.delta?.content;
              
              if (content) {
                onChunk({ text: content });
              }
            } catch (err) {
              console.error('Error parsing OpenAI stream data:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in OpenAI stream request:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Format request message into OpenAI's expected format
   */
  private formatMessages(request: MessageRequest) {
    const { text, files = [] } = request;
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: text }
    ];

    // If there are files, would need to format for OpenAI's API
    // This is a simplified implementation that doesn't handle file attachments
    // Would need to use OpenAI's file upload API for actual implementation
    
    return messages;
  }

  /**
   * Upload a file
   * This is a simplified implementation that would need enhancement
   * for actual usage with OpenAI's file endpoints
   */
  async uploadFile(
    fileId: string, 
    file: File, 
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse> {
    try {
      // Start progress reporting
      onProgress(fileId, 0);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');
      
      // Upload to OpenAI
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });
      
      // Complete progress
      onProgress(fileId, 100);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `File upload failed: ${response.status} - ${errorText}`,
          response.status
        );
      }
      
      const data = await response.json();
      
      return {
        id: data.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: '' // OpenAI doesn't provide direct URLs for uploaded files
      };
    } catch (error) {
      console.error('Error uploading file to OpenAI:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get all uploaded files
   */
  async getFiles(): Promise<FileUploadResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `Failed to fetch files: ${response.status} - ${errorText}`,
          response.status
        );
      }
      
      const data = await response.json();
      
      return data.data.map((file: any) => ({
        id: file.id,
        name: file.filename,
        type: '', // OpenAI doesn't provide MIME type
        size: file.bytes,
        url: ''  // OpenAI doesn't provide direct URLs for files
      }));
    } catch (error) {
      console.error('Error getting files from OpenAI:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get a single uploaded file by ID
   */
  async getFile(fileId: string): Promise<FileUploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `Failed to fetch file: ${response.status} - ${errorText}`,
          response.status
        );
      }
      
      const file = await response.json();
      
      return {
        id: file.id,
        name: file.filename,
        type: '', // OpenAI doesn't provide MIME type
        size: file.bytes,
        url: ''  // OpenAI doesn't provide direct URLs
      };
    } catch (error) {
      console.error('Error getting file from OpenAI:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
} 