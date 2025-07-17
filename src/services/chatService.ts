import { serviceFactory, AdapterType } from './serviceFactory';
import { StreamCallbacks, ProgressCallback } from './adapters/BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse, ConversationMessage } from '../types/api';
import { MessageFile } from '../types/chat';

/**
 * Chat Service - Unified API for chat functionality
 * Uses the adapter pattern to support different backend implementations
 */
export class ChatService {
  private static adapter = serviceFactory.getAdapter();

  /**
   * Configure the chat service with a specific adapter type
   */
  static configure(config: { adapterType: AdapterType; sessionEndpoint?: string; baseUrl?: string }) {
    // If baseUrl is provided, update the default API client
    if (config.baseUrl) {
      serviceFactory.updateDefaultApiClient(config.baseUrl);
    }
    
    // Switch to the specified adapter type, passing along baseUrl and sessionEndpoint
    this.adapter = serviceFactory.switchAdapter(
      config.adapterType,
      config.baseUrl,
      config.sessionEndpoint
    );
  }

  /**
   * Send a message and get a complete response
   */
  static async sendMessage(text: string, files: MessageFile[] = [], history: ConversationMessage[] = []): Promise<MessageResponse> {
    const request: MessageRequest = { text, files, history };
    return this.adapter.sendMessage(request);
  }
  
  /**
   * Send a message and get a streaming response
   */
  static async sendStreamingMessage(
    text: string,
    files: MessageFile[] = [],
    callbacks: StreamCallbacks,
    history: ConversationMessage[] = []
  ): Promise<void> {
    const request: MessageRequest = { text, files, history };
    return this.adapter.sendStreamingMessage(request, callbacks);
  }
  
  /**
   * Upload a file with progress tracking
   */
  static async uploadFile(
    fileId: string,
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse> {
    return this.adapter.uploadFile(fileId, file, onProgress);
  }
  
  /**
   * Get all uploaded files
   */
  static async getFiles(): Promise<FileUploadResponse[]> {
    return this.adapter.getFiles();
  }
  
  /**
   * Get a single uploaded file by ID
   */
  static async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.adapter.getFile(fileId);
  }
}

// Export utilities and types
export type { StreamCallbacks, ProgressCallback } from './adapters/BaseAdapter';
export type { AdapterType } from './serviceFactory';
export { serviceFactory } from './serviceFactory'; 