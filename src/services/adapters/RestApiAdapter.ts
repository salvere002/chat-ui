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
      return await this.apiClient.request<MessageResponse>(
        '/message/fetch', 
        { 
          method: 'POST', 
          body: JSON.stringify(request), 
          headers: { 'Content-Type': 'application/json' } 
        }
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
      // console.error('Error in RestApiAdapter stream request wrapper:', error);
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
        }
      );
      
      onProgress(fileId, 100);
      
      if (response.url && response.url.startsWith('/')) {
        const origin = new URL(this.apiClient.getBaseUrl()).origin;
        response.url = origin + response.url;
      }
      
      return response;
    } catch (error) {
      onProgress(fileId, 0);
      console.error(`Upload error for ${fileId} in RestApiAdapter:`, error);
      throw error;
    }
  }
  
  /**
   * Get all uploaded files
   */
  async getFiles(): Promise<FileUploadResponse[]> {
    return this.apiClient.request<FileUploadResponse[]>(
      '/files', 
      { method: 'GET' }
    );
  }
  
  /**
   * Get a single uploaded file by ID
   */
  async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.apiClient.request<FileUploadResponse>(
      `/files/${fileId}`,
      { method: 'GET' }
    );
  }
} 