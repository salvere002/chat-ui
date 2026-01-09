import { create } from 'zustand';
import { StudioStore } from '../types/store';
import { StudioChatState, StudioFile } from '../types/studio';
import { generateId } from '../utils/id';

const createEmptyChatState = (): StudioChatState => ({
  files: {},
  order: [],
  activeFileName: undefined,
  panelCollapsed: false,
});

const useStudioStore = create<StudioStore>()((set) => ({
  chats: {},

  ensureChat: (chatId: string) => {
    set((state) => {
      if (state.chats[chatId]) return state;
      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: createEmptyChatState(),
        },
      };
    });
  },

  startFile: (chatId, file) => {
    set((state) => {
      const chatState = state.chats[chatId] || createEmptyChatState();
      const existing = chatState.files[file.name];
      const newVersionId = generateId('studio-file');
      const newVersion = {
        id: newVersionId,
        content: '',
        createdAt: new Date(),
      };

      let updatedFile: StudioFile;
      if (existing) {
        updatedFile = {
          ...existing,
          language: file.language || existing.language,
          versions: [...existing.versions, newVersion],
          activeVersionId: newVersionId,
        };
      } else {
        updatedFile = {
          name: file.name,
          language: file.language,
          versions: [newVersion],
          activeVersionId: newVersionId,
          viewMode: 'code',
        };
      }

      const nextOrder = existing ? chatState.order : [...chatState.order, file.name];

      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            files: {
              ...chatState.files,
              [file.name]: updatedFile,
            },
            order: nextOrder,
            activeFileName: file.name,
            panelCollapsed: false,
          },
        },
      };
    });
  },

  appendToFile: (chatId, fileName, chunk) => {
    if (!chunk) return;
    set((state) => {
      const chatState = state.chats[chatId];
      if (!chatState) return state;
      const file = chatState.files[fileName];
      if (!file) return state;

      const versionIndex = file.versions.length - 1;
      if (versionIndex < 0) return state;

      const updatedVersions = [...file.versions];
      const targetVersion = updatedVersions[versionIndex];
      updatedVersions[versionIndex] = {
        ...targetVersion,
        content: targetVersion.content + chunk,
      };

      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            files: {
              ...chatState.files,
              [fileName]: {
                ...file,
                versions: updatedVersions,
              },
            },
          },
        },
      };
    });
  },

  finalizeFile: (_chatId, _fileName) => {
    // No-op for now; placeholder for future metadata updates.
  },

  setActiveFile: (chatId, fileName) => {
    set((state) => {
      const chatState = state.chats[chatId];
      if (!chatState || !chatState.files[fileName]) return state;
      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            activeFileName: fileName,
          },
        },
      };
    });
  },

  setActiveVersion: (chatId, fileName, versionId) => {
    set((state) => {
      const chatState = state.chats[chatId];
      if (!chatState) return state;
      const file = chatState.files[fileName];
      if (!file) return state;

      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            files: {
              ...chatState.files,
              [fileName]: {
                ...file,
                activeVersionId: versionId,
              },
            },
          },
        },
      };
    });
  },

  setViewMode: (chatId, fileName, viewMode) => {
    set((state) => {
      const chatState = state.chats[chatId];
      if (!chatState) return state;
      const file = chatState.files[fileName];
      if (!file) return state;
      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            files: {
              ...chatState.files,
              [fileName]: {
                ...file,
                viewMode,
              },
            },
          },
        },
      };
    });
  },

  updateFileContent: (chatId, fileName, versionId, content) => {
    set((state) => {
      const chatState = state.chats[chatId];
      if (!chatState) return state;
      const file = chatState.files[fileName];
      if (!file) return state;

      const updatedVersions = file.versions.map((version) =>
        version.id === versionId ? { ...version, content } : version
      );

      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            files: {
              ...chatState.files,
              [fileName]: {
                ...file,
                versions: updatedVersions,
                activeVersionId: versionId,
              },
            },
          },
        },
      };
    });
  },

  setPanelCollapsed: (chatId, collapsed) => {
    set((state) => {
      const chatState = state.chats[chatId] || createEmptyChatState();
      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: {
            ...chatState,
            panelCollapsed: collapsed,
          },
        },
      };
    });
  },

  clearChat: (chatId) => {
    set((state) => {
      if (!state.chats[chatId]) return state;
      const nextChats = { ...state.chats };
      delete nextChats[chatId];
      return {
        ...state,
        chats: nextChats,
      };
    });
  },

  clearAll: () => {
    set(() => ({
      chats: {},
    }));
  },
}));

export default useStudioStore;
