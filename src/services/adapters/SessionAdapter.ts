import { AbstractBaseAdapter } from './BaseAdapter';
import { ApiClient, RequestInterceptor, ResponseInterceptor, DataTransformer } from '../apiClient';
import { MessageRequest, MessageResponse, FileUploadResponse } from '../../types/api';
import { StreamCallbacks, ProgressCallback } from './BaseAdapter';
import type { MCPConfigPayload, SaveMCPConfigOptions } from '../../types/mcp';

/**
 * Session-based adapter that manages session cookies for API communication.
 * Uses '/session' endpoint paths - the ApiClient handles the base URL configuration.
 */
export class SessionAdapter extends AbstractBaseAdapter {
  private sessionCookie: string | null = null;

  constructor(apiClient: ApiClient) {
    super(apiClient);
    this.capabilities.mcpConfig = true;

    // Add a request interceptor to include the session cookie
    const requestInterceptor: RequestInterceptor = (requestConfig) => {
      if (this.sessionCookie) {
        requestConfig.headers = {
          ...requestConfig.headers,
          'Cookie': `session=${this.sessionCookie}`,
        };
      }
      // Ensure credentials: 'include' is set for all requests made by this adapter instance
      requestConfig.credentials = 'include';
      return requestConfig;
    };
    this.apiClient.addRequestInterceptor(requestInterceptor);

    // Add a response interceptor to capture the session cookie
    const responseInterceptor: ResponseInterceptor = async (response) => {
      const newSessionCookieHeader = response.headers.get('set-cookie');
      if (newSessionCookieHeader) {
        const match = newSessionCookieHeader.match(/session=([^;]+)/);
        if (match && match[1]) {
          this.sessionCookie = match[1];
        }
      }
      return response;
    };
    this.apiClient.addResponseInterceptor(responseInterceptor);
  }

  async sendMessage(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse> {
    return this.apiClient.request<MessageResponse>(
      '/session/message', 
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
      this.transformMessageResponse,
      abortSignal
    );
  }

  /**
   * Transform raw message response to MessageResponse type
   */
  private transformMessageResponse: DataTransformer<any, MessageResponse> = (rawData) => {
    // Process or validate the raw data as needed
    return rawData as MessageResponse;
  };

  async sendStreamingMessage(request: MessageRequest, callbacks: StreamCallbacks, abortSignal?: AbortSignal): Promise<void> {
    await this.apiClient.streamMessages(
      '/session/stream', 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
      },
      callbacks,
      abortSignal
    );
  }

  async uploadFile(fileId: string, file: File, onProgress: ProgressCallback): Promise<FileUploadResponse> {
    onProgress(fileId, 0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);

    try {
      const response = await this.apiClient.request<FileUploadResponse>(
        '/session/upload', 
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
      throw error;
    }
  }

  /**
   * Transform raw file upload response to FileUploadResponse type
   */
  private transformFileUploadResponse: DataTransformer<any, FileUploadResponse> = (rawData) => {
    const response = rawData as FileUploadResponse;
    
    // Ensure the URL is absolute if it's a relative path from the server
    if (response.url && response.url.startsWith('/')) {
      const origin = new URL(this.apiClient.getBaseUrl()).origin;
      response.url = origin + response.url;
    }
    
    return response;
  };

  async getFiles(): Promise<FileUploadResponse[]> {
    return this.apiClient.request<FileUploadResponse[]>(
      '/session/files', 
      {
        method: 'GET',
      },
      this.transformFilesResponse
    );
  }

  /**
   * Transform raw files response to FileUploadResponse[] type
   */
  private transformFilesResponse: DataTransformer<any, FileUploadResponse[]> = (rawData) => {
    // Process or validate the raw data as needed
    return (Array.isArray(rawData) ? rawData : []) as FileUploadResponse[];
  };

  async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.apiClient.request<FileUploadResponse>(
      `/session/files/${fileId}`, 
      {
        method: 'GET',
      },
      this.transformFileUploadResponse
    );
  }

  /**
   * Save MCP config via Session adapter
   */
  async saveMcpConfig(config: MCPConfigPayload, opts?: SaveMCPConfigOptions): Promise<void> {
    const query = opts?.replace ? '?replace=1' : '';
    await this.apiClient.request<void>(
      `/session/mcp/config${query}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }
    );
  }

  /**
   * Fetch MCP config via Session adapter
   */
  async getMcpConfig(): Promise<MCPConfigPayload> {
    return this.apiClient.request<MCPConfigPayload>(
      `/session/mcp/config`,
      { method: 'GET' }
    );
  }
} 
