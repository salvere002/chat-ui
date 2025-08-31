import { create } from 'zustand';

interface InputStore {
  inputValue: string;
  setInputValue: (value: string) => void;
  resetInput: () => void;
}

const useInputStore = create<InputStore>((set) => ({
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),
  resetInput: () => set({ inputValue: '' })
}));

export default useInputStore;