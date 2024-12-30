import { create } from 'zustand'
import { AuthTypes } from '@/types'

export const useAuthStore = create<AuthTypes.AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
