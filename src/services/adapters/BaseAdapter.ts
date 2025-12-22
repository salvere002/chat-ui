import { ApiClient, StreamChunkInterceptor, StreamResponseInterceptor, RequestInterceptor, ErrorInterceptor } from '../apiClient';
import { 
  MessageRequest, 
  MessageResponse, 
  StreamMessageChunk,
  FileUploadResponse
} from '../../types/api';
import type { Agent, Model } from '../../types/chat';

/**
 * Callbacks for stream message processing
 */
export interface StreamCallbacks {
  onChunk: (chunk: StreamMessageChunk) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * File upload progress callback
 */
export type ProgressCallback = (fileId: string, progress: number) => void;

/**
 * Base service adapter interface
 * Defines the core functionality that all adapters must implement
 */
export type AdapterCapabilities = {
  mcpConfig?: boolean;
};

export interface BaseAdapter {
  /** Adapter feature capabilities */
  capabilities: AdapterCapabilities;
  /**
   * Send a message and get a complete response
   */
  sendMessage(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse>;
  
  /**
   * Send a message and get a streaming response
   */
  sendStreamingMessage(
    request: MessageRequest, 
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void>;
  
  /**
   * Upload a file
   */
  uploadFile(
    fileId: string, 
    file: File, 
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse>;
  
  /**
   * Get all uploaded files
   */
  getFiles(): Promise<FileUploadResponse[]>;
  
  /**
   * Get a single uploaded file by ID
   */
  getFile(fileId: string): Promise<FileUploadResponse>;

  /**
   * Fetch available agents from the backend
   */
  getAgents(): Promise<Agent[]>;

  /**
   * Fetch available models from the backend
   */
  getModels(): Promise<Model[]>;

  /**
   * Save MCP configuration to backend via adapter-specific path/logic
   */
  saveMcpConfig(config: import('../../types/mcp').MCPConfigPayload): Promise<void>;

  /**
   * Fetch MCP configuration from backend via adapter-specific path/logic
   */
  getMcpConfig(): Promise<import('../../types/mcp').MCPConfigPayload>;
}

/**
 * Abstract base class for service adapters
 * Provides common functionality and enforces the adapter interface
 */
export abstract class AbstractBaseAdapter implements BaseAdapter {
  protected apiClient: ApiClient;
  public capabilities: AdapterCapabilities = { mcpConfig: false };
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.setupInterceptors();
  }
  
  /**
   * Setup adapter-specific interceptors
   * Override this method in concrete adapters to register custom interceptors
   */
  protected setupInterceptors(): void {
    // Default implementation - no interceptors
    // Concrete adapters can override this to add their own interceptors
  }
  
  /**
   * Helper methods for registering interceptors
   */
  protected addStreamChunkInterceptor(interceptor: StreamChunkInterceptor): void {
    this.apiClient.addStreamChunkInterceptor(interceptor);
  }
  
  protected addStreamRequestInterceptor(interceptor: RequestInterceptor): void {
    this.apiClient.addStreamRequestInterceptor(interceptor);
  }
  
  protected addStreamResponseInterceptor(interceptor: StreamResponseInterceptor): void {
    this.apiClient.addStreamResponseInterceptor(interceptor);
  }
  
  protected addStreamErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.apiClient.addStreamErrorInterceptor(interceptor);
  }
  
  abstract sendMessage(request: MessageRequest, abortSignal?: AbortSignal): Promise<MessageResponse>;
  abstract sendStreamingMessage(request: MessageRequest, callbacks: StreamCallbacks, abortSignal?: AbortSignal): Promise<void>;
  abstract uploadFile(fileId: string, file: File, onProgress: ProgressCallback): Promise<FileUploadResponse>;
  abstract getFiles(): Promise<FileUploadResponse[]>;
  abstract getFile(fileId: string): Promise<FileUploadResponse>;

  async getAgents(): Promise<Agent[]> {
    throw new Error('Feature not supported by this adapter: agents');
  }

  async getModels(): Promise<Model[]> {
    throw new Error('Feature not supported by this adapter: models');
  }

  // Default MCP config methods throw to indicate unsupported by adapter unless overridden
  async saveMcpConfig(
    _config: import('../../types/mcp').MCPConfigPayload
  ): Promise<void> {
    throw new Error('Feature not supported by this adapter: mcpConfig');
  }

  async getMcpConfig(): Promise<import('../../types/mcp').MCPConfigPayload> {
    throw new Error('Feature not supported by this adapter: mcpConfig');
  }
} 
