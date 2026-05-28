import { create } from 'zustand'
import { databases, callAction, DB_ID, CLIP_POSTS_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
import type { ClipPost, Tier } from '@/types'

interface FeedState {
  posts: ClipPost[]
  getClipPosts: (contestMonth: string) => Promise<void>
  createClipPost: (data: {
    userId: string; username: string; tier: Tier
    runId: string | null; contestMonth: string; verified: boolean
  }) => Promise<ClipPost>
  toggleFire: (postId: string, userId: string) => Promise<void>
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],

  getClipPosts: async (contestMonth) => {
    const res = await databases.listDocuments(DB_ID, CLIP_POSTS_ID, [
      Query.equal('contestMonth', contestMonth),
      Query.orderDesc('fireCount'),
      Query.limit(50),
    ])
    set({ posts: res.documents as unknown as ClipPost[] })
  },

  createClipPost: async (data) => {
    const doc = await databases.createDocument(
      DB_ID, CLIP_POSTS_ID, ID.unique(),
      { ...data, fireCount: 0, firedBy: [] },
      [Permission.read(Role.any()), Permission.write(Role.user(data.userId))]
    )
    const post = doc as unknown as ClipPost
    set(s => ({ posts: [post, ...s.posts] }))
    return post
  },

  toggleFire: async (postId, userId) => {
    const post = get().posts.find(p => p.$id === postId)
    if (!post) return

    // Optimistic update; server is the source of truth for count + firedBy.
    const alreadyFired = post.firedBy.includes(userId)
    const optimisticFiredBy = alreadyFired ? post.firedBy.filter(id => id !== userId) : [...post.firedBy, userId]
    set(s => ({
      posts: s.posts.map(p => p.$id === postId
        ? { ...p, fireCount: alreadyFired ? p.fireCount - 1 : p.fireCount + 1, firedBy: optimisticFiredBy }
        : p),
    }))

    try {
      const res = await callAction<{ fireCount: number; firedBy: string[] }>('toggleFire', { postId })
      set(s => ({
        posts: s.posts.map(p => p.$id === postId
          ? { ...p, fireCount: res.fireCount, firedBy: res.firedBy }
          : p),
      }))
    } catch (e) {
      // Roll back on failure.
      set(s => ({
        posts: s.posts.map(p => p.$id === postId
          ? { ...p, fireCount: post.fireCount, firedBy: post.firedBy }
          : p),
      }))
      throw e
    }
  },
}))
