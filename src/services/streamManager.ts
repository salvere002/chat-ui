/**
 * StreamManager - Handles concurrent streaming operations across multiple conversations
 * Manages AbortControllers and stream state for each active conversation
 */

interface ActiveStream {
  chatId: string;
  messageId: string;
  controller: AbortController;
  startTime: Date;
}

export class StreamManager {
  private static instance: StreamManager;
  private activeStreams = new Map<string, ActiveStream>();

  private constructor() {}

  static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  /**
   * Start a new stream for a specific chat and message
   */
  startStream(chatId: string, messageId: string): AbortController {
    const controller = new AbortController();
    const streamKey = this.getStreamKey(chatId, messageId);
    
    // If there's already a stream for this message, abort it first
    this.stopStream(chatId, messageId);
    
    const stream: ActiveStream = {
      chatId,
      messageId,
      controller,
      startTime: new Date()
    };
    
    this.activeStreams.set(streamKey, stream);
    console.debug(`StreamManager: Started stream for chat ${chatId}, message ${messageId}`);
    
    return controller;
  }

  /**
   * Stop a specific stream
   */
  stopStream(chatId: string, messageId: string): void {
    const streamKey = this.getStreamKey(chatId, messageId);
    const stream = this.activeStreams.get(streamKey);
    
    if (stream) {
      try {
        stream.controller.abort();
      } catch (error) {
        console.warn(`StreamManager: Error aborting stream ${streamKey}:`, error);
      }
      this.activeStreams.delete(streamKey);
      console.debug(`StreamManager: Stopped stream for chat ${chatId}, message ${messageId}`);
    }
  }

  /**
   * Stop all streams for a specific chat
   */
  stopAllStreamsForChat(chatId: string): void {
    const streamsToStop: string[] = [];
    
    for (const [streamKey, stream] of this.activeStreams.entries()) {
      if (stream.chatId === chatId) {
        streamsToStop.push(streamKey);
      }
    }
    
    streamsToStop.forEach(streamKey => {
      const stream = this.activeStreams.get(streamKey);
      if (stream) {
        this.stopStream(stream.chatId, stream.messageId);
      }
    });
  }

  /**
   * Get all active streaming chat IDs
   */
  getActiveStreamingChats(): string[] {
    const chatIds = new Set<string>();
    for (const stream of this.activeStreams.values()) {
      chatIds.add(stream.chatId);
    }
    return Array.from(chatIds);
  }

  /**
   * Check if a specific chat has any active streams
   */
  isStreamingInChat(chatId: string): boolean {
    for (const stream of this.activeStreams.values()) {
      if (stream.chatId === chatId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific message is currently streaming
   */
  isMessageStreaming(chatId: string, messageId: string): boolean {
    const streamKey = this.getStreamKey(chatId, messageId);
    return this.activeStreams.has(streamKey);
  }

  /**
   * Get the current streaming message ID for a chat (if any)
   */
  getCurrentStreamingMessageId(chatId: string): string | null {
    for (const stream of this.activeStreams.values()) {
      if (stream.chatId === chatId) {
        return stream.messageId;
      }
    }
    return null;
  }

  /**
   * Get stream information for a specific chat
   */
  getStreamInfo(chatId: string): { messageId: string; startTime: Date } | null {
    for (const stream of this.activeStreams.values()) {
      if (stream.chatId === chatId) {
        return {
          messageId: stream.messageId,
          startTime: stream.startTime
        };
      }
    }
    return null;
  }

  /**
   * Clean up all streams (useful for app cleanup)
   */
  cleanup(): void {
    for (const stream of this.activeStreams.values()) {
      try {
        stream.controller.abort();
      } catch (error) {
        console.warn('StreamManager: Error during cleanup:', error);
      }
    }
    this.activeStreams.clear();
    console.debug('StreamManager: All streams cleaned up');
  }

  /**
   * Get total number of active streams
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Generate a unique key for a stream
   */
  private getStreamKey(chatId: string, messageId: string): string {
    return `${chatId}-${messageId}`;
  }
}

// Export singleton instance
export const streamManager = StreamManager.getInstance();