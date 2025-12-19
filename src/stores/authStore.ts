import { create } from 'zustand';
import { AuthService, AuthUser } from '../services/authService';

type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'unauthenticated';

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  signOut: () => void;
}

let bootstrapPromise: Promise<void> | null = null;

const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'idle',
  user: null,
  error: null,

  bootstrap: async () => {
    const { status } = get();
    if (status === 'authenticated' || status === 'unauthenticated') return;
    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      set({ status: 'checking', error: null });
      try {
        const user = await AuthService.getCurrentUser();
        set({ status: 'authenticated', user, error: null });
      } catch (e: any) {
        // On any failure, mark as unauthenticated
        set({ status: 'unauthenticated', user: null, error: e?.message || 'Auth failed' });
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },

  signOut: () => {
    bootstrapPromise = null;
    set({ status: 'unauthenticated', user: null, error: null });
  },
}));

export default useAuthStore;
