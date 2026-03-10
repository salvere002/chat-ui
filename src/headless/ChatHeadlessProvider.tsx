import React, { createContext, useContext } from 'react';
import type { ResponseMode } from '../types/chat';
import { useChatHeadless } from './useChatHeadless';
import type { ChatHeadlessRuntime } from './types';

const ChatHeadlessContext = createContext<ChatHeadlessRuntime | null>(null);

export interface ChatHeadlessProviderProps {
  selectedResponseMode: ResponseMode;
  children: React.ReactNode;
}

export const ChatHeadlessProvider: React.FC<ChatHeadlessProviderProps> = ({ selectedResponseMode, children }) => {
  const runtime = useChatHeadless(selectedResponseMode);
  return (
    <ChatHeadlessContext.Provider value={runtime}>
      {children}
    </ChatHeadlessContext.Provider>
  );
};

export const useChatHeadlessContext = (): ChatHeadlessRuntime => {
  const context = useContext(ChatHeadlessContext);
  if (!context) {
    throw new Error('useChatHeadlessContext must be used within a ChatHeadlessProvider');
  }
  return context;
};
