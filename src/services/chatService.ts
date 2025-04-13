import { defaultAdapter } from './serviceFactory';
import { StreamCallbacks, ProgressCallback } from './adapters/BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse } from '../types/api';
import { MessageFile } from '../types/chat';

/**
 * Chat Service - Unified API for chat functionality
 * Uses the adapter pattern to support different backend implementations
 */
export class ChatService {
  /**
   * Send a message and get a complete response
   */
  static async sendMessage(text: string, files: MessageFile[] = []): Promise<MessageResponse> {
    const request: MessageRequest = { text, files };
    return defaultAdapter.sendMessage(request);
  }
  
  /**
   * Send a message and get a streaming response
   */
  static async sendStreamingMessage(
    text: string,
    files: MessageFile[] = [],
    callbacks: StreamCallbacks
  ): Promise<void> {
    const request: MessageRequest = { text, files };
    return defaultAdapter.sendStreamingMessage(request, callbacks);
  }
  
  /**
   * Upload a file with progress tracking
   */
  static async uploadFile(
    fileId: string,
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse> {
    return defaultAdapter.uploadFile(fileId, file, onProgress);
  }
  
  /**
   * Get all uploaded files
   */
  static async getFiles(): Promise<FileUploadResponse[]> {
    return defaultAdapter.getFiles();
  }
  
  /**
   * Get a single uploaded file by ID
   */
  static async getFile(fileId: string): Promise<FileUploadResponse> {
    return defaultAdapter.getFile(fileId);
  }
}

// Export utilities and types
export type { StreamCallbacks, ProgressCallback } from './adapters/BaseAdapter';
export type { AdapterType } from './serviceFactory';
export { serviceFactory } from './serviceFactory'; 