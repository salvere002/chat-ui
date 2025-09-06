import { Message } from '../types/chat';
import { ConversationMessage } from '../types/api';

/**
 * Builds conversation history from messages array
 * @param messages Array of messages to convert
 * @param upToIndex Optional index to limit history (exclusive)
 * @returns Array of ConversationMessage objects for API calls
 */
export function buildHistory(messages: Message[], upToIndex?: number): ConversationMessage[] {
  const messagesToProcess = upToIndex !== undefined ? messages.slice(0, upToIndex + 1) : messages;
  
  return messagesToProcess.map((msg: Message) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text,
    timestamp: msg.timestamp
  }));
}

/**
 * Interface for AI message reset data structure
 */
export interface AiMessageResetData {
  text: string;
  isComplete: boolean;
  thinkingContent?: string;
  isThinkingComplete: boolean;
  thinkingCollapsed: boolean;
  wasPaused: boolean;
}

/**
 * Creates a standardized AI message reset object
 * Used when regenerating or resetting AI message state
 * @returns Reset data object for AI messages
 */
export function createAiMessageReset(): AiMessageResetData {
  return {
    text: "",
    isComplete: false,
    thinkingContent: undefined,
    isThinkingComplete: false,
    thinkingCollapsed: true,
    wasPaused: false
  };
}