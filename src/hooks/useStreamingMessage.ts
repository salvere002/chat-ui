import { useCallback, useRef } from 'react';
import { useChatActions, useChatUtils } from '../stores';
import { StreamingMessageHandler, StreamingContext } from '../services/streamingMessageHandler';
import { createThinkingUpdateData } from '../utils/thinkingUtils';
import { Message } from '../types/chat';

export const useStreamingMessage = (responseMode: 'stream' | 'fetch') => {
  const { updateMessageInChat } = useChatActions();
  const { getChatById } = useChatUtils();
  const handlerRef = useRef(new StreamingMessageHandler());
  
  const sendStreamingMessage = useCallback(async (context: StreamingContext) => {
    const { chatId } = context;
    // Streaming state is now managed by streamManager automatically
    
    const callbacks = {
      onThinkingChunk: (thinking: string, isComplete: boolean) => {
        const currentMessage = getChatById(chatId)?.messages.find((m: Message) => m.id === context.messageId);
        const updateData = createThinkingUpdateData(
          currentMessage?.thinkingContent,
          thinking,
          isComplete,
          currentMessage?.thinkingCollapsed
        );
        updateMessageInChat(chatId, context.messageId, updateData);
      },
      
      onTextChunk: (text: string, imageUrl?: string) => {
        updateMessageInChat(chatId, context.messageId, {
          text,
          imageUrl
        });
      },
      
      onComplete: () => {
        updateMessageInChat(chatId, context.messageId, {
          isComplete: true,
          isThinkingComplete: true
        });
        // Streaming completion is handled by streamManager
      },
      
      onError: (error: Error) => {
        if (error.name !== 'AbortError') {
          updateMessageInChat(chatId, context.messageId, {
            text: 'Sorry, there was an error processing your request.',
            isComplete: true
          });
        } else {
          updateMessageInChat(chatId, context.messageId, {
            isComplete: true,
            isThinkingComplete: true,
            wasPaused: true
          });
        }
        // Streaming completion is handled by streamManager
      }
    };
    
    await handlerRef.current.handleStreamingMessage(context, callbacks, responseMode);
  }, [responseMode, updateMessageInChat, getChatById]);
  
  return { sendStreamingMessage };
};