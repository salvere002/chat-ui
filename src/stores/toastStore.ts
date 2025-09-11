import { create } from 'zustand';
import { toast } from 'sonner';
import type { ToastStore } from '../types/store';

// Wrap sonner in a small Zustand API-compatible store
const useToastStore = create<ToastStore>(() => ({
  showToast: (message, type, duration = 3000) => {
    let id: string | number;
    switch (type) {
      case 'success':
        id = toast.success(message, { duration });
        break;
      case 'error':
        id = toast.error(message, { duration });
        break;
      case 'warning':
        id = toast.warning(message, { duration });
        break;
      case 'info':
      default:
        id = toast(message, { duration });
        break;
    }
    return String(id);
  },
  hideToast: (id: string) => {
    toast.dismiss(id);
  },
}));

export default useToastStore;
