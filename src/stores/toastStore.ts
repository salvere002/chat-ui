import { create } from 'zustand';
import { ToastStore } from '../types/store';

// Create the toast store with Zustand
const useToastStore = create<ToastStore>((set) => ({
  // State
  toasts: [],
  
  // Actions
  showToast: (message, type, duration = 3000) => {
    const id = `toast-${Date.now()}`;
    
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }));
    
    // Auto-remove toast after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(toast => toast.id !== id)
      }));
    }, duration + 500); // Add a little buffer time
    
    return id;
  },
  
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
}));

export default useToastStore; 