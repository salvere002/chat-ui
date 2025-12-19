import { serviceFactory } from './serviceFactory';
import { ProgressCallback } from './adapters/BaseAdapter';
import { MessageRequest, MessageResponse, FileUploadResponse, ConversationMessage } from '../types/api';
import { MessageFile } from '../types/chat';
import useAuthStore from '../stores/authStore';
import { useAgentStore } from '../stores';
import { streamManager } from './streamManager';

/**
 * Chat Service - Unified API for chat functionality
 * Uses the adapter pattern to support different backend implementations
 */
export class ChatService {
  private static async ensureAuthBootstrapped(): Promise<void> {
    try {
      await useAuthStore.getState().bootstrap();
    } catch {
      // Best-effort: proceed even if auth bootstrap fails
    }
  }

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
    await this.ensureAuthBootstrapped();
    const { deepResearchEnabled } = useAgentStore.getState();
    const request: MessageRequest = { text, files, history, deepResearch: deepResearchEnabled };
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
    await this.ensureAuthBootstrapped();
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
    await this.ensureAuthBootstrapped();
    // Start the stream using StreamManager
    const controller = streamManager.startStream(chatId, messageId);
    const context = { chatId, messageId };
    
    // Include deepResearch setting from agent store
    const { deepResearchEnabled } = useAgentStore.getState();
    const request: MessageRequest = { text, files, history, deepResearch: deepResearchEnabled, responseMessageId: messageId };
    
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
    await this.ensureAuthBootstrapped();
    return this.getAdapter().uploadFile(fileId, file, onProgress);
  }

  /**
   * Get all uploaded files
   */
  static async getFiles(): Promise<FileUploadResponse[]> {
    await this.ensureAuthBootstrapped();
    return this.getAdapter().getFiles();
  }

  /**
   * Get a single uploaded file by ID
   */
  static async getFile(fileId: string): Promise<FileUploadResponse> {
    await this.ensureAuthBootstrapped();
    return this.getAdapter().getFile(fileId);
  }

  /**
   * Get chat details (messages and branch data)
   * This is a placeholder for backend integration
   */
  static async getChatDetails(_chatId: string): Promise<{ messages: any[], branchData?: any }> {
    await this.ensureAuthBootstrapped();
    // In a real implementation, this would call the adapter
    // return this.getAdapter().getChatDetails(chatId);

    // For now, simulate a network delay and return empty data
    // The actual data loading logic will depend on the backend API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ messages: [] });
      }, 500);
    });
  }
}

// Export utilities and types
export type { ProgressCallback } from './adapters/BaseAdapter';
export type { AdapterType } from './serviceFactory';
export { serviceFactory } from './serviceFactory'; 
