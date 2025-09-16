import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  userId: string | null;
  setUserId: (id: string | null) => void;
  clearUserId: () => void;
}

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),
      clearUserId: () => set({ userId: null }),
    }),
    {
      name: 'user-store',
      partialize: (state) => ({ userId: state.userId }),
    }
  )
);

export default useUserStore;

