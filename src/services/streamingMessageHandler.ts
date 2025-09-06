import { ChatService } from './chatService';
import { MessageFile } from '../types/chat';
import { ConversationMessage } from '../types/api';

export interface StreamingContext {
  chatId: string;
  messageId: string;
  userText: string;
  userFiles: MessageFile[];
  history: ConversationMessage[];
}

export interface StreamingCallbacks {
  onThinkingChunk: (thinking: string, isComplete: boolean) => void;
  onTextChunk: (text: string, imageUrl?: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class StreamingMessageHandler {
  private accumulatedText = '';
  
  async handleStreamingMessage(
    context: StreamingContext,
    callbacks: StreamingCallbacks,
    responseMode: 'stream' | 'fetch'
  ) {
    this.accumulatedText = '';
    
    try {
      if (responseMode === 'stream') {
        await ChatService.sendStreamingMessage(
          context.chatId,
          context.messageId,
          context.userText,
          context.userFiles,
          {
            onChunk: (chunk, streamContext) => {
              if (streamContext.chatId !== context.chatId || streamContext.messageId !== context.messageId) {
                return;
              }
              
              if (chunk.thinking) {
                callbacks.onThinkingChunk(chunk.thinking, chunk.thinkingComplete);
              }
              
              if (chunk.text) {
                this.accumulatedText += chunk.text;
                callbacks.onTextChunk(this.accumulatedText, chunk.imageUrl);
              }
            },
            onComplete: (streamContext) => {
              if (streamContext.chatId === context.chatId && streamContext.messageId === context.messageId) {
                callbacks.onComplete();
                this.accumulatedText = '';
              }
            },
            onError: (error, streamContext) => {
              if (streamContext.chatId === context.chatId && streamContext.messageId === context.messageId) {
                callbacks.onError(error);
                this.accumulatedText = '';
              }
            }
          },
          context.history
        );
      } else {
        const response = await ChatService.sendMessageWithContext(
          context.chatId,
          context.messageId,
          context.userText,
          context.userFiles,
          context.history
        );
        
        if (response.thinking) {
          callbacks.onThinkingChunk(response.thinking, true);
        }
        callbacks.onTextChunk(response.text, response.imageUrl);
        callbacks.onComplete();
      }
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
  
  resetAccumulatedText() {
    this.accumulatedText = '';
  }
}