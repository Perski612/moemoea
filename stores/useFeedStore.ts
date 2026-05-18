import { create } from 'zustand'
import { databases, DB_ID, CLIP_POSTS_ID, ID, Permission, Role, Query } from '@/lib/appwrite'
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

    const alreadyFired = post.firedBy.includes(userId)
    const newFiredBy  = alreadyFired ? post.firedBy.filter(id => id !== userId) : [...post.firedBy, userId]
    const newCount    = alreadyFired ? post.fireCount - 1 : post.fireCount + 1

    await databases.updateDocument(DB_ID, CLIP_POSTS_ID, postId, {
      fireCount: newCount,
      firedBy:   newFiredBy,
    })

    set(s => ({
      posts: s.posts.map(p => p.$id === postId ? { ...p, fireCount: newCount, firedBy: newFiredBy } : p),
    }))
  },
}))
