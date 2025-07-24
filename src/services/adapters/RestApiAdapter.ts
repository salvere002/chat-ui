import { ApiClient, DataTransformer } from '../apiClient';
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
   * Setup REST API-specific stream interceptors
   */
  protected setupInterceptors(): void {
    // Add logging interceptor for debugging
    this.addStreamChunkInterceptor((rawChunk, _accumulated, _callbacks) => {
      // For REST API, we can add logging or basic preprocessing
      console.debug('REST API Stream chunk received:', rawChunk.substring(0, 100) + '...');
      
      // Let default SSE parser handle the chunk
      return { shouldContinue: true, customHandling: false };
    });

    // Add error handling for REST API specific errors
    this.addStreamErrorInterceptor(async (error, _requestOptions) => {
      console.error('REST API Stream error:', error);
      
      // Add any REST API specific error handling here
      // For now, just re-throw the error
      throw error;
    });
  }
  
  /**
   * Send a message and get a complete response
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    try {
      return await this.apiClient.request<MessageResponse>(
        '/message/fetch', 
        { 
          method: 'POST', 
          body: JSON.stringify(request), 
          headers: { 'Content-Type': 'application/json' } 
        },
        this.transformMessageResponse
      );
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
   * Transform raw message response to MessageResponse type
   */
  private transformMessageResponse: DataTransformer<any, MessageResponse> = (rawData) => {
    // Process the raw data into the expected MessageResponse type
    // This allows for normalization, validation, or transformation of the API response
    return rawData as MessageResponse;
  };
  
  /**
   * Send a message and get a streaming response
   */
  async sendStreamingMessage(
    request: MessageRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      await this.apiClient.streamMessages(
        '/message/stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        callbacks
      );
    } catch (error) {
      // The streamMessages method in ApiClient should handle calling callbacks.onError
      // So, this catch block might only be for truly unexpected errors or can be simplified/removed
      // if ApiClient.streamMessages guarantees onError is called.
      // For now, let ApiClient handle it, RestApiAdapter just calls it.
      // callbacks.onError(error instanceof Error ? error : new Error(String(error)));
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
    onProgress(fileId, 0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);

    try {
      const response = await this.apiClient.request<FileUploadResponse>(
        `/upload`,
        {
          method: 'POST',
          body: formData,
        },
        this.transformFileUploadResponse
      );
      
      onProgress(fileId, 100);
      return response;
    } catch (error) {
      onProgress(fileId, 0);
      console.error(`Upload error for ${fileId} in RestApiAdapter:`, error);
      throw error;
    }
  }
  
  /**
   * Transform raw file upload response to FileUploadResponse type
   */
  private transformFileUploadResponse: DataTransformer<any, FileUploadResponse> = (rawData) => {
    const response = rawData as FileUploadResponse;
    
    // Post-process the response if needed
    if (response.url && response.url.startsWith('/')) {
      const origin = new URL(this.apiClient.getBaseUrl()).origin;
      response.url = origin + response.url;
    }
    
    return response;
  };
  
  /**
   * Get all uploaded files
   */
  async getFiles(): Promise<FileUploadResponse[]> {
    return this.apiClient.request<FileUploadResponse[]>(
      '/files', 
      { method: 'GET' },
      this.transformFilesResponse
    );
  }
  
  /**
   * Transform raw files response to FileUploadResponse[] type
   */
  private transformFilesResponse: DataTransformer<any, FileUploadResponse[]> = (rawData) => {
    // Ensure we have an array and process each item
    const files = Array.isArray(rawData) ? rawData : [];
    
    // Process each file response
    return files.map(file => {
      if (file.url && file.url.startsWith('/')) {
        const origin = new URL(this.apiClient.getBaseUrl()).origin;
        file.url = origin + file.url;
      }
      return file;
    });
  };
  
  /**
   * Get a single uploaded file by ID
   */
  async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.apiClient.request<FileUploadResponse>(
      `/files/${fileId}`,
      { method: 'GET' },
      this.transformFileUploadResponse
    );
  }
} 