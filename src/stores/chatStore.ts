import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, Chat, BranchNode } from '../types/chat';
import { ChatStore } from '../types/store';
import { configManager } from '../utils/config';
import { streamManager } from '../services/streamManager';

// Create the chat store with Zustand
const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
  // State
  chatSessions: [],
  activeChatId: null,
  error: null,
  // Branch state
  activeBranchPath: new Map(),
  branchTree: new Map(),
  messageBranches: new Map(),
  // Suggestions state
  suggestions: new Map(),
  isSuggestionsLoading: false,
  
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
    
    const state = get();
    // Initialize branch data for new chat
    state.activeBranchPath.set(newChatId, ['main']);
    state.branchTree.set(newChatId, new Map());
    state.messageBranches.set(newChatId, new Map());
    
    set((state) => ({
      chatSessions: [newChat, ...state.chatSessions],
      activeBranchPath: new Map(state.activeBranchPath),
      branchTree: new Map(state.branchTree),
      messageBranches: new Map(state.messageBranches)
    }));
    
    return newChatId;
  },
  
  deleteChat: (id: string) => {
    // Stop any active streams for this chat before deletion
    streamManager.stopAllStreamsForChat(id);
    
    set((state) => {
      const remainingChats = state.chatSessions.filter((chat) => chat.id !== id);
      
      // Clean up branch state for the deleted chat
      const newActiveBranchPath = new Map(state.activeBranchPath);
      const newBranchTree = new Map(state.branchTree);
      const newMessageBranches = new Map(state.messageBranches);
      
      newActiveBranchPath.delete(id);
      newBranchTree.delete(id);
      newMessageBranches.delete(id);
      
      // If the active chat is deleted, select a sensible next chat
      let newActiveChatId = state.activeChatId;
      if (state.activeChatId === id) {
        // Select the most recently updated chat, or null if no chats remain
        newActiveChatId = remainingChats.length > 0 
          ? remainingChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].id
          : null;
      }
      
      return {
        chatSessions: remainingChats,
        activeChatId: newActiveChatId,
        activeBranchPath: newActiveBranchPath,
        branchTree: newBranchTree,
        messageBranches: newMessageBranches
      };
    });
  },

  clearAllChats: () => {
    // Clean up all active streams before clearing state
    streamManager.cleanup();
    
    set(() => ({
      chatSessions: [],
      activeChatId: null,
      activeBranchPath: new Map(),
      branchTree: new Map(),
      messageBranches: new Map(),
      suggestions: new Map()
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
    const state = get();
    
    // Initialize branch data if not exists
    if (!state.activeBranchPath.has(chatId)) {
      state.activeBranchPath.set(chatId, ['main']);
      state.branchTree.set(chatId, new Map());
      state.messageBranches.set(chatId, new Map());
    }
    
    // Set default branch properties for new message
    const currentBranchPath = state.activeBranchPath.get(chatId) || ['main'];
    const currentBranchId = currentBranchPath[currentBranchPath.length - 1];
    
    const messageWithBranch: Message = {
      ...message,
      branchId: currentBranchId,
      children: [],
      parentId: undefined // Will be set based on current branch context
    };
    
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, messageWithBranch],
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
  
  // Per-conversation streaming actions
  startChatStreaming: (chatId: string, messageId: string, controller: AbortController) => {
    const now = new Date();
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) => 
        chat.id === chatId 
          ? {
              ...chat,
              streamingState: {
                isStreaming: true,
                currentMessageId: messageId,
                abortController: controller,
                streamStartTime: now
              },
              updatedAt: now
            }
          : chat
      )
    }));
  },

  stopChatStreaming: (chatId: string) => {
    const now = new Date();
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) => 
        chat.id === chatId 
          ? {
              ...chat,
              streamingState: undefined,
              updatedAt: now
            }
          : chat
      )
    }));
  },

  getChatStreamingState: (chatId: string) => {
    const state = get();
    const chat = state.chatSessions.find(c => c.id === chatId);
    return chat?.streamingState || null;
  },

  getActiveStreamingChats: () => {
    const state = get();
    return state.chatSessions
      .filter(chat => chat.streamingState?.isStreaming)
      .map(chat => chat.id);
  },

  isChatStreaming: (chatId: string) => {
    const state = get();
    const chat = state.chatSessions.find(c => c.id === chatId);
    return chat?.streamingState?.isStreaming || false;
  },

  pauseChatRequest: (chatId: string) => {
    const state = get();
    const chat = state.chatSessions.find(c => c.id === chatId);
    if (chat?.streamingState?.isStreaming && chat.streamingState.currentMessageId) {
      // Use StreamManager to stop the stream
      streamManager.stopStream(chatId, chat.streamingState.currentMessageId);
      // Update chat state (removed inconsistent second parameter)
      get().stopChatStreaming(chatId);
    }
  },
  
  // Branch management methods
  getCurrentBranchMessages: (chatId: string) => {
    const state = get();
    const chat = state.chatSessions.find(c => c.id === chatId);
    if (!chat) return [];
    
    const currentBranchPath = state.activeBranchPath.get(chatId) || ['main'];
    
    
    // For proper tree structure, we need to build the path correctly
    // The current branch path represents the active path through the tree
    // We should only show messages that are EXACTLY on this path
    
    // Start from the deepest branch and work backwards
    
    // Get all messages and organize by branch
    const messagesByBranch = new Map<string, Message[]>();
    chat.messages.forEach(msg => {
      const branchId = msg.branchId;
      if (!messagesByBranch.has(branchId)) {
        messagesByBranch.set(branchId, []);
      }
      messagesByBranch.get(branchId)!.push(msg);
    });
    
    // Build the result by following the branch path
    // All branches are equal - we follow the path from root to current branch
    const result: Message[] = [];
    
    // For each branch in the path, we need to:
    // 1. Include messages from that branch up to the next branch point
    // 2. Then switch to the next branch in the path
    
    for (let i = 0; i < currentBranchPath.length; i++) {
      const branchId = currentBranchPath[i];
      const branchMessages = (messagesByBranch.get(branchId) || [])
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (i === currentBranchPath.length - 1) {
        // Last branch in path - include all messages
        result.push(...branchMessages);
      } else {
        // Not the last branch - include messages up to the branch point
        const nextBranchId = currentBranchPath[i + 1];
        const branchTree = state.branchTree.get(chatId);
        const nextBranchNode = branchTree?.get(nextBranchId);
        
        if (nextBranchNode) {
          // Include messages up to (but not including) the branch point
          const branchPointIndex = branchMessages.findIndex(msg => msg.id === nextBranchNode.messageId);
          const messagesToInclude = branchPointIndex >= 0 
            ? branchMessages.slice(0, branchPointIndex)
            : branchMessages;
          result.push(...messagesToInclude);
        } else {
          // If we can't find the branch node, include all messages
          result.push(...branchMessages);
        }
      }
    }
    
    return result;
  },
  
  createBranchFromMessage: (chatId: string, messageId: string, newMessage: Message) => {
    const state = get();
    const newBranchId = `branch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Fix: Find the source message to get its parent relationship
    const sourceMessage = state.chatSessions.find(c => c.id === chatId)?.messages.find(m => m.id === messageId);
    const parentMessageId = sourceMessage?.parentId || messageId;
    
    // Create new branch node - should reference the parent message, not the source message
    const branchNode: BranchNode = {
      id: newBranchId,
      messageId: parentMessageId, // This should be the common parent where branches diverge
      depth: (state.activeBranchPath.get(chatId)?.length || 1),
      childBranches: []
    };
    
    // Create message with branch info - make it a SIBLING, not a child
    const messageWithBranch: Message = {
      ...newMessage,
      branchId: newBranchId,
      parentId: parentMessageId, // Use source's parent, not source's ID
      children: []
    };
    
    
    const now = new Date();
    set((state) => {
      // Update branch tree
      const newBranchTree = new Map(state.branchTree);
      const chatBranchTree = new Map(newBranchTree.get(chatId) || new Map());
      chatBranchTree.set(newBranchId, branchNode);
      newBranchTree.set(chatId, chatBranchTree);
      
      // Update message branches - add to the parent message's branches, not the source message
      const newMessageBranches = new Map(state.messageBranches);
      const chatMessageBranches = new Map(newMessageBranches.get(chatId) || new Map());
      const messageBranches = chatMessageBranches.get(parentMessageId) || [];
      chatMessageBranches.set(parentMessageId, [...messageBranches, newBranchId]);
      newMessageBranches.set(chatId, chatMessageBranches);
      

      return {
        ...state,
        chatSessions: state.chatSessions.map((chat) => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: [
                  ...chat.messages.map(msg => {
                    if (msg.id === parentMessageId) {
                      // Setting branchPoint=true for PARENT message, not source message
                      return { ...msg, branchPoint: true, children: [...msg.children, messageWithBranch.id] };
                    }
                    return msg;
                  }),
                  messageWithBranch
                ],
                updatedAt: now
              } 
            : chat
        ),
        branchTree: newBranchTree,
        messageBranches: newMessageBranches
      };
    });
    
    return newBranchId;
  },
  
  switchToBranch: (chatId: string, branchId: string) => {
    set((state) => {
      const newActiveBranchPath = new Map(state.activeBranchPath);
      
      // Build branch path by traversing up from target branch
      const buildBranchPath = (targetBranchId: string): string[] => {
        // If it's the root branch (main), return just that
        if (targetBranchId === 'main') return ['main'];
        
        const chatBranchTree = state.branchTree.get(chatId);
        const branchNode = chatBranchTree?.get(targetBranchId);
        
        // If we can't find the branch node, default to main + this branch
        if (!branchNode) return ['main', targetBranchId];
        
        // Find parent branch by looking at the parent message's branch
        const chat = state.chatSessions.find(c => c.id === chatId);
        const parentMessage = chat?.messages.find(m => m.id === branchNode.messageId);
        
        // If no parent message or parent is in main branch, this branch comes from main
        if (!parentMessage) {
          return ['main', targetBranchId];
        }
        
        // If parent message is in main branch, path is main -> this branch
        if (parentMessage.branchId === 'main') {
          return ['main', targetBranchId];
        }
        
        // Otherwise, recursively build path from parent branch
        const parentPath = buildBranchPath(parentMessage.branchId);
        return [...parentPath, targetBranchId];
      };
      
      const newPath = buildBranchPath(branchId);
      newActiveBranchPath.set(chatId, newPath);
      
      return {
        ...state,
        activeBranchPath: newActiveBranchPath
      };
    });
  },
  
  deleteBranch: (chatId: string, branchId: string) => {
    if (branchId === 'main') return; // Can't delete main branch
    
    const now = new Date();
    set((state) => {
      const newBranchTree = new Map(state.branchTree);
      const chatBranchTree = new Map(newBranchTree.get(chatId) || new Map());
      const branchNode = chatBranchTree.get(branchId);
      
      if (!branchNode) return state;
      
      // Remove branch from tree
      chatBranchTree.delete(branchId);
      newBranchTree.set(chatId, chatBranchTree);
      
      // Update message branches
      const newMessageBranches = new Map(state.messageBranches);
      const chatMessageBranches = new Map(newMessageBranches.get(chatId) || new Map());
      
      // Remove branchId from all message branch lists
      for (const [messageId, branches] of chatMessageBranches.entries()) {
        const filtered = branches.filter((id: string) => id !== branchId);
        if (filtered.length > 0) {
          chatMessageBranches.set(messageId, filtered);
        } else {
          chatMessageBranches.delete(messageId);
        }
      }
      newMessageBranches.set(chatId, chatMessageBranches);
      
      // Update parent message's branchPoint status
      const parentMessageId = branchNode.messageId;
      const remainingBranches = chatMessageBranches.get(parentMessageId) || [];
      
      // Switch to main branch if currently on deleted branch
      const newActiveBranchPath = new Map(state.activeBranchPath);
      const currentPath = newActiveBranchPath.get(chatId) || ['main'];
      if (currentPath.includes(branchId)) {
        newActiveBranchPath.set(chatId, ['main']);
      }
      
      return {
        ...state,
        chatSessions: state.chatSessions.map((chat) => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: [
                  ...chat.messages
                    .filter(msg => msg.branchId !== branchId)
                    .map(msg => 
                      msg.id === parentMessageId && remainingBranches.length <= 1
                        ? { ...msg, branchPoint: false }
                        : msg
                    )
                ],
                updatedAt: now
              } 
            : chat
        ),
        branchTree: newBranchTree,
        messageBranches: newMessageBranches,
        activeBranchPath: newActiveBranchPath
      };
    });
  },
  
  getBranchingPoints: (chatId: string) => {
    const chat = get().chatSessions.find(c => c.id === chatId);
    if (!chat) return [];
    
    return chat.messages.filter(msg => msg.branchPoint === true);
  },
  
  getBranchOptionsAtMessage: (chatId: string, messageId: string) => {
    const state = get();
    const chat = state.chatSessions.find(c => c.id === chatId);
    if (!chat) {
      return [];
    }

    const message = chat.messages.find(msg => msg.id === messageId);
    if (!message) {
      return [];
    }

    let versions: Message[] = [];
    const parentId = message.parentId;

    if (parentId) {
      const parentMessage = chat.messages.find(msg => msg.id === parentId);
      if (parentMessage) {
        const childMessages = chat.messages.filter(msg => msg.parentId === parentId);
        versions = [parentMessage, ...childMessages];
      }
    } else if (message.branchPoint) {
      const childMessages = chat.messages.filter(msg => msg.parentId === messageId);
      versions = [message, ...childMessages];
    } else {
      return [];
    }

    if (versions.length <= 1) {
      return [];
    }

    const branchOptions: BranchNode[] = versions.map(v => {
      const chatBranchTree = state.branchTree.get(chatId);
      const branchNode = chatBranchTree?.get(v.branchId);
      return {
        id: v.branchId,
        messageId: v.id,
        depth: branchNode?.depth || 0,
        childBranches: branchNode?.childBranches || [],
      };
    });

    return branchOptions;
  },
  
  getBreadcrumb: (chatId: string) => {
    const state = get();
    return state.activeBranchPath.get(chatId) || ['main'];
  },

  // Dump/Load functionality with overloads
  dump: (chatId?: string) => {
    const state = get();
    
    if (chatId) {
      // Single conversation dump
      const chat = state.chatSessions.find(c => c.id === chatId);
      
      if (!chat) {
        throw new Error(`Chat with ID ${chatId} not found`);
      }

      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        type: 'single',
        conversation: {
          ...chat,
          createdAt: chat.createdAt.toISOString(),
          updatedAt: chat.updatedAt.toISOString(),
          messages: chat.messages.map(message => ({
            ...message,
            timestamp: message.timestamp.toISOString()
          }))
        },
        branchData: {
          activeBranchPath: state.activeBranchPath.get(chatId) || ['main'],
          branchTree: Array.from((state.branchTree.get(chatId) || new Map()).entries()),
          messageBranches: Array.from((state.messageBranches.get(chatId) || new Map()).entries())
        }
      };
    } else {
      // All conversations dump
      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        type: 'all',
        conversations: state.chatSessions.map(chat => ({
          ...chat,
          createdAt: chat.createdAt.toISOString(),
          updatedAt: chat.updatedAt.toISOString(),
          messages: chat.messages.map(message => ({
            ...message,
            timestamp: message.timestamp.toISOString()
          }))
        })),
        branchData: {
          activeBranchPath: Array.from(state.activeBranchPath.entries()),
          branchTree: Array.from(state.branchTree.entries()).map(([chatId, tree]) => [
            chatId,
            Array.from(tree.entries())
          ]),
          messageBranches: Array.from(state.messageBranches.entries()).map(([chatId, branches]) => [
            chatId,
            Array.from(branches.entries())
          ])
        },
        activeChatId: state.activeChatId
      };
    }
  },

  load: (data: any, replaceExisting: boolean = false, chatId?: string) => {
    if (!data.version) {
      throw new Error('Invalid data format - missing version');
    }

    const state = get();

    if (chatId) {
      // Single conversation load - extract specific conversation from data
      let conversationData;
      
      if (data.type === 'single') {
        // Data contains single conversation
        conversationData = data;
      } else if (data.type === 'all' && data.conversations) {
        // Data contains all conversations - find the specific one
        const targetConversation = data.conversations.find((chat: any) => chat.id === chatId);
        if (!targetConversation) {
          throw new Error(`Chat with ID ${chatId} not found in data`);
        }
        
        // Create single conversation data format
        conversationData = {
          version: data.version,
          exportedAt: data.exportedAt,
          type: 'single',
          conversation: targetConversation,
          branchData: {
            activeBranchPath: data.branchData.activeBranchPath.find(([id]: [string, any]) => id === chatId)?.[1] || ['main'],
            branchTree: data.branchData.branchTree.find(([id]: [string, any]) => id === chatId)?.[1] || [],
            messageBranches: data.branchData.messageBranches.find(([id]: [string, any]) => id === chatId)?.[1] || []
          }
        };
      } else {
        throw new Error('Invalid data format for single conversation load');
      }

      // Load single conversation
      if (!conversationData.conversation) {
        throw new Error('Invalid conversation data format');
      }

      const importedChat = conversationData.conversation;
      
      const chat = {
        ...importedChat,
        createdAt: new Date(importedChat.createdAt),
        updatedAt: new Date(importedChat.updatedAt),
        messages: importedChat.messages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }))
      };

      const existingChatIndex = state.chatSessions.findIndex(c => c.id === chat.id);
      
      if (existingChatIndex >= 0 && !replaceExisting) {
        throw new Error(`Chat with ID ${chat.id} already exists. Set replaceExisting to true to overwrite.`);
      }

      const branchData = conversationData.branchData;
      const newActiveBranchPath = new Map(state.activeBranchPath);
      const newBranchTree = new Map(state.branchTree);
      const newMessageBranches = new Map(state.messageBranches);

      newActiveBranchPath.set(chat.id, branchData.activeBranchPath);
      newBranchTree.set(chat.id, new Map(branchData.branchTree));
      newMessageBranches.set(chat.id, new Map(branchData.messageBranches));

      set((state) => {
        let newChatSessions;
        
        if (existingChatIndex >= 0 && replaceExisting) {
          newChatSessions = [...state.chatSessions];
          newChatSessions[existingChatIndex] = chat;
        } else {
          newChatSessions = [chat, ...state.chatSessions];
        }

        return {
          chatSessions: newChatSessions,
          activeBranchPath: newActiveBranchPath,
          branchTree: newBranchTree,
          messageBranches: newMessageBranches
        };
      });

      return chat.id;
    } else {
      // All conversations load
      let conversationsData;
      
      if (data.type === 'all') {
        conversationsData = data;
      } else if (data.type === 'single') {
        // Convert single conversation to all format
        conversationsData = {
          version: data.version,
          exportedAt: data.exportedAt,
          type: 'all',
          conversations: [data.conversation],
          branchData: {
            activeBranchPath: [[data.conversation.id, data.branchData.activeBranchPath]],
            branchTree: [[data.conversation.id, data.branchData.branchTree]],
            messageBranches: [[data.conversation.id, data.branchData.messageBranches]]
          },
          activeChatId: data.conversation.id
        };
      } else {
        throw new Error('Invalid data format for all conversations load');
      }

      if (!conversationsData.conversations) {
        throw new Error('Invalid conversations data format');
      }

      if (!replaceExisting && state.chatSessions.length > 0) {
        throw new Error('Existing conversations found. Set replaceExisting to true to overwrite all conversations.');
      }

      const conversations = conversationsData.conversations.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }))
      }));

      const branchData = conversationsData.branchData;
      const activeBranchPath = new Map(branchData.activeBranchPath) as Map<string, string[]>;
      const branchTree = new Map(
        branchData.branchTree.map(([chatId, tree]: [string, any]) => [
          chatId,
          new Map(tree)
        ])
      ) as Map<string, Map<string, BranchNode>>;
      const messageBranches = new Map(
        branchData.messageBranches.map(([chatId, branches]: [string, any]) => [
          chatId,
          new Map(branches)
        ])
      ) as Map<string, Map<string, string[]>>;

      set((state) => ({
        ...state,
        chatSessions: conversations,
        activeChatId: conversationsData.activeChatId || null,
        activeBranchPath,
        branchTree,
        messageBranches
      }));

      return conversations.map((chat: any) => chat.id);
    }
  },


  // Suggestions actions
  setSuggestions: ((chatIdOrSuggestions: string | string[], suggestions?: string[]) => {
    let targetChatId: string;
    let targetSuggestions: string[];
    
    if (typeof chatIdOrSuggestions === 'string') {
      // Called with explicit chatId
      targetChatId = chatIdOrSuggestions;
      targetSuggestions = suggestions!;
    } else {
      // Called with just suggestions, use activeChatId
      const state = get();
      if (!state.activeChatId) return; // No active chat to update
      targetChatId = state.activeChatId;
      targetSuggestions = chatIdOrSuggestions;
    }
    
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      newSuggestions.set(targetChatId, targetSuggestions);
      return { suggestions: newSuggestions };
    });
  }) as ((chatId: string, suggestions: string[]) => void) & ((suggestions: string[]) => void),

  getSuggestions: (chatId?: string) => {
    const state = get();
    const targetChatId = chatId || state.activeChatId;
    
    // If no target chat, return default suggestions
    if (!targetChatId) {
      return configManager.getDefaultSuggestions();
    }
    
    // Return chat-specific suggestions or defaults if none exist
    return state.suggestions.get(targetChatId) || configManager.getDefaultSuggestions();
  },

  clearSuggestions: (chatId?: string) => {
    const state = get();
    const targetChatId = chatId || state.activeChatId;
    if (!targetChatId) return;
    
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      newSuggestions.delete(targetChatId);
      return { suggestions: newSuggestions };
    });
  },

  setSuggestionsLoading: (loading: boolean) => {
    set({ isSuggestionsLoading: loading });
  }
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        chatSessions: state.chatSessions,
        activeChatId: state.activeChatId,
        activeBranchPath: Array.from(state.activeBranchPath.entries()),
        branchTree: Array.from(state.branchTree.entries()).map(([chatId, tree]) => [
          chatId,
          Array.from(tree.entries())
        ]),
        messageBranches: Array.from(state.messageBranches.entries()).map(([chatId, branches]) => [
          chatId,
          Array.from(branches.entries())
        ]),
        suggestions: Array.from(state.suggestions.entries())
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Maps
          state.activeBranchPath = new Map(state.activeBranchPath as any);
          state.branchTree = new Map(
            (state.branchTree as any).map(([chatId, tree]: [string, any]) => [
              chatId,
              new Map(tree)
            ])
          );
          state.messageBranches = new Map(
            (state.messageBranches as any).map(([chatId, branches]: [string, any]) => [
              chatId,
              new Map(branches)
            ])
          );
          state.suggestions = new Map(state.suggestions as any);
          
          // Convert date strings back to Date objects
          state.chatSessions = state.chatSessions.map(chat => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages.map(message => ({
              ...message,
              timestamp: new Date(message.timestamp)
            }))
          }));
        }
      }
    }
  )
);

export default useChatStore; 