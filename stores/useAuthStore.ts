import { create } from 'zustand'
import type { Models } from 'appwrite'
import { account, databases, DB_ID, PROFILES_ID, IS_DEMO } from '@/lib/appwrite'

interface AuthState {
  session: Models.Session | null
  isApproved: boolean
  isAdmin: boolean
  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isApproved: false,
  isAdmin: false,

  checkSession: async () => {
    if (IS_DEMO) return
    try {
      const session = await account.getSession('current')
      const profile = await databases.getDocument(DB_ID, PROFILES_ID, session.userId)
      set({
        session,
        isApproved: profile.approved as boolean,
        isAdmin: profile.isAdmin as boolean,
      })
    } catch {
      set({ session: null, isApproved: false, isAdmin: false })
    }
  },

  login: async (email: string, password: string) => {
    // Always clear any stale session first to avoid "session already exists" → rate limit loop
    try { await account.deleteSession('current') } catch { /* no active session, fine */ }
    const session = await account.createEmailPasswordSession(email, password)
    const profile = await databases.getDocument(DB_ID, PROFILES_ID, session.userId)
    set({
      session,
      isApproved: profile.approved as boolean,
      isAdmin: profile.isAdmin as boolean,
    })
  },

  logout: async () => {
    try {
      await account.deleteSession('current')
    } finally {
      set({ session: null, isApproved: false, isAdmin: false })
    }
  },
}))
