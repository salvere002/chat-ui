import { create } from 'zustand';
import { ResponseModeStore } from '../types/store';
import { ResponseMode } from '../types/chat';

// Create the response mode store with Zustand
const useResponseModeStore = create<ResponseModeStore>((set) => ({
  // State
  selectedResponseMode: 'stream' as ResponseMode,
  
  // Actions
  setSelectedResponseMode: (responseMode: ResponseMode) => {
    set({ selectedResponseMode: responseMode });
  }
}));

export default useResponseModeStore; 