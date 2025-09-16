import { create } from 'zustand';
import { AuthService, AuthUser } from '../services/authService';
import useUserStore from './userStore';

type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'unauthenticated';

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  signOut: () => void;
}

const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'idle',
  user: null,
  error: null,

  bootstrap: async () => {
    // Avoid duplicate checks
    if (get().status === 'checking' || get().status === 'authenticated') return;
    set({ status: 'checking', error: null });
    try {
      const user = await AuthService.getCurrentUser();
      // Set global userId to be used by request interceptors
      useUserStore.getState().setUserId(user.userId);
      set({ status: 'authenticated', user, error: null });
    } catch (e: any) {
      // On any failure, mark as unauthenticated and clear userId
      useUserStore.getState().clearUserId();
      set({ status: 'unauthenticated', user: null, error: e?.message || 'Auth failed' });
    }
  },

  signOut: () => {
    useUserStore.getState().clearUserId();
    set({ status: 'unauthenticated', user: null, error: null });
  },
}));

export default useAuthStore;

