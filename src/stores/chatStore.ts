import { create } from 'zustand';
import { Message, Chat, BranchNode } from '../types/chat';
import { ChatStore } from '../types/store';

// Create the chat store with Zustand
const useChatStore = create<ChatStore>((set, get) => ({
  // State
  chatSessions: [],
  activeChatId: null,
  isProcessing: false,
  error: null,
  // Branch state
  activeBranchPath: new Map(),
  branchTree: new Map(),
  messageBranches: new Map(),
  
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
  
  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
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
    const currentBranchId = currentBranchPath[currentBranchPath.length - 1];
    
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
  }
}));

export default useChatStore; 