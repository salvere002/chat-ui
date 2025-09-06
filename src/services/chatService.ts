import { serviceFactory } from './serviceFactory';
import { ProgressCallback } from './adapters/BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse, ConversationMessage } from '../types/api';
import { MessageFile } from '../types/chat';
import { streamManager } from './streamManager';

/**
 * Chat Service - Unified API for chat functionality
 * Uses the adapter pattern to support different backend implementations
 */
export class ChatService {
  /**
   * Get the current adapter from serviceFactory (single source of truth)
   */
  private static getAdapter() {
    return serviceFactory.getAdapter();
  }

  /**
   * Send a message and get a complete response
   */
  static async sendMessage(text: string, files: MessageFile[] = [], history: ConversationMessage[] = [], abortSignal?: AbortSignal): Promise<MessageResponse> {
    const request: MessageRequest = { text, files, history };
    return this.getAdapter().sendMessage(request, abortSignal);
  }
  
  /**
   * Send a message and get a complete response with per-conversation state management
   */
  static async sendMessageWithContext(
    chatId: string,
    messageId: string,
    text: string,
    files: MessageFile[] = [],
    history: ConversationMessage[] = []
  ): Promise<MessageResponse> {
    // Start tracking this request using StreamManager (even though it's not streaming)
    const controller = streamManager.startStream(chatId, messageId);
    
    try {
      const request: MessageRequest = { text, files, history, responseMessageId: messageId };
      const response = await this.getAdapter().sendMessage(request, controller.signal);
      streamManager.stopStream(chatId, messageId);
      return response;
    } catch (error) {
      streamManager.stopStream(chatId, messageId);
      throw error;
    }
  }
  
  /**
   * Send a message and get a streaming response with context handling
   */
  static async sendStreamingMessage(
    chatId: string,
    messageId: string,
    text: string,
    files: MessageFile[] = [],
    callbacks: {
      onChunk: (chunk: any, context: { chatId: string; messageId: string }) => void;
      onComplete: (context: { chatId: string; messageId: string }) => void;
      onError: (error: Error, context: { chatId: string; messageId: string }) => void;
    },
    history: ConversationMessage[] = [],
  ): Promise<void> {
    // Start the stream using StreamManager
    const controller = streamManager.startStream(chatId, messageId);
    const context = { chatId, messageId };
    
    const request: MessageRequest = { text, files, history, responseMessageId: messageId };
    
    try {
      return await this.getAdapter().sendStreamingMessage(
        request, 
        {
          onChunk: (chunk) => callbacks.onChunk(chunk, context),
          onComplete: () => {
            streamManager.stopStream(chatId, messageId);
            callbacks.onComplete(context);
          },
          onError: (error) => {
            streamManager.stopStream(chatId, messageId);
            callbacks.onError(error, context);
          }
        },
        controller.signal
      );
    } catch (error) {
      streamManager.stopStream(chatId, messageId);
      throw error;
    }
  }
  
  /**
   * Upload a file with progress tracking
   */
  static async uploadFile(
    fileId: string,
    file: File,
    onProgress: ProgressCallback
  ): Promise<FileUploadResponse> {
    return this.getAdapter().uploadFile(fileId, file, onProgress);
  }
  
  /**
   * Get all uploaded files
   */
  static async getFiles(): Promise<FileUploadResponse[]> {
    return this.getAdapter().getFiles();
  }
  
  /**
   * Get a single uploaded file by ID
   */
  static async getFile(fileId: string): Promise<FileUploadResponse> {
    return this.getAdapter().getFile(fileId);
  }
}

// Export utilities and types
export type { ProgressCallback } from './adapters/BaseAdapter';
export type { AdapterType } from './serviceFactory';
export { serviceFactory } from './serviceFactory'; 