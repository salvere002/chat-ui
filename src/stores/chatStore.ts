import { create } from 'zustand';
import { Message, Chat } from '../types/chat';
import { ChatStore } from '../types/store';

// Create the chat store with Zustand
const useChatStore = create<ChatStore>((set, get) => ({
  // State
  chatSessions: [],
  activeChatId: null,
  isProcessing: false,
  error: null,
  
  // Actions
  createChat: (name?: string) => {
    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const newChat: Chat = {
      id: newChatId,
      name: name || `Chat ${get().chatSessions.length + 1}`,
      title: name || `Chat ${get().chatSessions.length + 1}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    
    set((state) => ({
      chatSessions: [newChat, ...state.chatSessions]
    }));
    
    return newChatId;
  },
  
  deleteChat: (id: string) => {
    set((state) => ({
      chatSessions: state.chatSessions.filter((chat) => chat.id !== id),
      // If the active chat is deleted, set activeChatId to null
      activeChatId: state.activeChatId === id ? null : state.activeChatId
    }));
  },
  
  setActiveChat: (id: string) => {
    set({ activeChatId: id });
  },
  
  getChatById: (id: string) => {
    return get().chatSessions.find((chat) => chat.id === id);
  },
  
  addMessageToChat: (chatId: string, message: Message) => {
    const now = new Date();
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, message],
              updatedAt: now
            } 
          : chat
      )
    }));
  },
  
  updateMessageInChat: (chatId: string, messageId: string, updates: Partial<Message>) => {
    const now = new Date();
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: chat.messages.map((msg) => 
                msg.id === messageId 
                  ? { ...msg, ...updates } 
                  : msg
              ),
              updatedAt: now
            } 
          : chat
      )
    }));
  },
  
  renameChatSession: (chatId: string, newName: string) => {
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) => 
        chat.id === chatId 
          ? { ...chat, name: newName, title: newName } 
          : chat
      )
    }));
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  }
}));

export default useChatStore; 