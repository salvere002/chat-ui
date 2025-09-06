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
    
    // Throttle text updates to reduce re-renders while keeping UX smooth
    const FLUSH_INTERVAL = 80; // ms
    let latestText = '';
    let latestImageUrl: string | undefined = undefined;
    let timerId: number | null = null;
    let lastFlush = 0;

    const clearTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const flushNow = () => {
      if (latestText !== '' || latestImageUrl !== undefined) {
        updateMessageInChat(chatId, context.messageId, {
          text: latestText,
          imageUrl: latestImageUrl,
        });
        lastFlush = Date.now();
      }
      clearTimer();
    };

    const scheduleFlush = () => {
      const remaining = Math.max(0, FLUSH_INTERVAL - (Date.now() - lastFlush));
      clearTimer();
      timerId = window.setTimeout(flushNow, remaining);
    };

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
        latestText = text;
        if (imageUrl) {
          latestImageUrl = imageUrl;
          // Show images ASAP
          flushNow();
          return;
        }

        if (Date.now() - lastFlush >= FLUSH_INTERVAL) {
          flushNow();
        } else {
          scheduleFlush();
        }
      },
      
      onComplete: () => {
        // Ensure the latest text/image are applied
        flushNow();
        updateMessageInChat(chatId, context.messageId, {
          isComplete: true,
          isThinkingComplete: true
        });
        // Streaming completion is handled by streamManager
      },
      
      onError: (error: Error) => {
        // Flush any pending chunks first
        flushNow();
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
