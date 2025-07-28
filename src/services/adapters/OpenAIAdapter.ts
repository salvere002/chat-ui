import { AbstractBaseAdapter, StreamCallbacks, ProgressCallback } from './BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse, StreamMessageChunk } from '../../types/api';
import { ApiClient, DataTransformer } from '../apiClient';

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
   * Setup OpenAI-specific stream interceptors
   */
  protected setupInterceptors(): void {
    // Add OpenAI-specific chunk interceptor for custom parsing
    this.addStreamChunkInterceptor((rawChunk, _accumulated, callbacks) => {
      // Handle OpenAI's Server-Sent Events format
      try {
        // Check for OpenAI completion marker
        if (rawChunk.includes('[DONE]')) {
          return { shouldContinue: false, customHandling: false };
        }

        // Try to parse OpenAI streaming format directly
        // OpenAI sends: data: {"choices":[{"delta":{"content":"text"}}]}
        const lines = rawChunk.split('\n');
        let hasProcessedChunk = false;

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const jsonStr = line.substring(6); // Remove 'data: ' prefix
              const data = JSON.parse(jsonStr);
              
              // Extract content from OpenAI response format
              const content = data.choices?.[0]?.delta?.content || '';
              const finishReason = data.choices?.[0]?.finish_reason;
              
              if (content || finishReason) {
                const chunk: StreamMessageChunk = {
                  text: content,
                  complete: finishReason !== null && finishReason !== undefined
                };
                
                callbacks.onChunk(chunk);
                hasProcessedChunk = true;
              }
            } catch (parseError) {
              // If JSON parsing fails, let default SSE parser handle it
              continue;
            }
          }
        }

        if (hasProcessedChunk) {
          // We handled the chunk, don't let default parser process it
          return { shouldContinue: true, customHandling: true };
        }
        
        // Let default SSE parser handle it
        return { shouldContinue: true, customHandling: false };
      } catch (error) {
        // On any error, fall back to default parsing
        return { shouldContinue: true, customHandling: false };
      }
    });
  }

  /**
   * Send a message and get a complete response
   */
  async sendMessage(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse> {
    try {
      return await this.apiClient.request<MessageResponse, any>(
        `${this.baseUrl}/chat/completions`,
        {
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
        },
        this.transformOpenAIMessageResponse,
        abortSignal
      );
    } catch (error) {
      console.error('Error in OpenAI request:', error);
      // ApiClient.request will throw ApiError, so we can simplify error handling here
      // or re-throw if specific logging/transformation is needed.
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Transform OpenAI chat completion response to MessageResponse type
   */
  private transformOpenAIMessageResponse: DataTransformer<any, MessageResponse> = (responseData) => {
    return {
      text: responseData.choices[0]?.message?.content || '',
    };
  };

  /**
   * Send a message and get a streaming response
   */
  async sendStreamingMessage(
    request: MessageRequest,
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      await this.apiClient.streamMessages(
        `${this.baseUrl}/chat/completions`,
        {
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
            stream: true
          })
        },
        callbacks, // Pass original callbacks, ApiClient.streamMessages will handle onChunk with parsed data
        abortSignal
      );
    } catch (error) {
      // ApiClient.streamMessages calls callbacks.onError internally
      // This catch block can be removed or simplified if not adding extra logic.
      console.error('Error in OpenAIAdapter stream request wrapper:', error);
      // callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Format request message into OpenAI's expected format
   */
  private formatMessages(request: MessageRequest) {
    const { text } = request;
    
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
    fileId: string, // fileId is not used by OpenAI file upload API directly in this simplified form
    file: File, 
    onProgress: ProgressCallback // ApiClient.request doesn't support onProgress directly with fetch
  ): Promise<FileUploadResponse> {
    try {
      onProgress(fileId, 0);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');
      
      const response = await this.apiClient.request<FileUploadResponse, any>(
        `${this.baseUrl}/files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
            // Content-Type for FormData is set by browser
          },
          body: formData
        },
        this.transformOpenAIFileResponse
      );
      
      onProgress(fileId, 100);
      return response;
    } catch (error) {
      onProgress(fileId, 0);
      console.error('Error uploading file to OpenAI:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Transform OpenAI file response to FileUploadResponse type
   */
  private transformOpenAIFileResponse: DataTransformer<any, FileUploadResponse> = (responseData) => {
    return {
      id: responseData.id,
      name: responseData.filename,
      type: '',
      size: responseData.bytes,
      url: ''
    };
  };

  /**
   * Get all uploaded files
   */
  async getFiles(): Promise<FileUploadResponse[]> {
    try {
      return await this.apiClient.request<FileUploadResponse[], any>(
        `${this.baseUrl}/files`, 
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        },
        this.transformOpenAIFilesListResponse
      );
    } catch (error) {
      console.error('Error getting files from OpenAI:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Transform OpenAI files list response to FileUploadResponse[] type
   */
  private transformOpenAIFilesListResponse: DataTransformer<any, FileUploadResponse[]> = (responseData) => {
    return responseData.data.map((file: any) => ({
      id: file.id,
      name: file.filename,
      type: '', 
      size: file.bytes,
      url: ''  
    }));
  };

  /**
   * Get a single uploaded file by ID
   */
  async getFile(fileId: string): Promise<FileUploadResponse> {
    try {
      return await this.apiClient.request<FileUploadResponse, any>(
        `${this.baseUrl}/files/${fileId}`, 
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        },
        this.transformOpenAIFileResponse
      );
    } catch (error) {
      console.error('Error getting file from OpenAI:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
} 