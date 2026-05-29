import { create } from 'zustand'
import { databases, callAction, DB_ID, CLIP_POSTS_ID, Query } from '@/lib/appwrite'
import type { ClipPost } from '@/types'

const CLOUD_NAME    = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME    ?? ''
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

export function parseReactions(raw?: string): Record<string, string[]> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

interface FeedState {
  posts: ClipPost[]
  getClipPosts: (contestMonth: string) => Promise<void>
  uploadClipPost: (videoUri: string, mimeType?: string) => Promise<void>
  toggleFire: (postId: string, userId: string) => Promise<void>
  reactToClip: (postId: string, emoji: string, userId: string) => Promise<void>
  deleteClipPost: (postId: string) => Promise<void>
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

  uploadClipPost: async (videoUri: string, mimeType?: string) => {
    const type = mimeType ?? (videoUri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4')

    const body = new FormData()
    body.append('file', { uri: videoUri, type, name: 'clip.mp4' } as any)
    body.append('upload_preset', UPLOAD_PRESET)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: 'POST', body },
    )
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { msg = (await res.json())?.error?.message ?? msg } catch {}
      throw new Error(`Upload fehlgeschlagen: ${msg}`)
    }
    const data = await res.json()
    const videoUrl: string = data.secure_url

    await callAction('createClipPost', { videoUrl })
    await get().getClipPosts(new Date().toISOString().slice(0, 7))
  },

  reactToClip: async (postId, emoji, userId) => {
    set(s => ({
      posts: s.posts.map(p => {
        if (p.$id !== postId) return p
        const r = parseReactions(p.reactions)
        const users = r[emoji] ?? []
        if (users.includes(userId)) {
          const next = users.filter(id => id !== userId)
          if (next.length) r[emoji] = next; else delete r[emoji]
        } else {
          r[emoji] = [...users, userId]
        }
        return { ...p, reactions: JSON.stringify(r) }
      }),
    }))
    try {
      const result = await callAction<{ reactions: Record<string, string[]> }>('reactToClip', { postId, emoji })
      set(s => ({
        posts: s.posts.map(p => p.$id === postId
          ? { ...p, reactions: JSON.stringify(result.reactions) }
          : p),
      }))
    } catch {
      await get().getClipPosts(new Date().toISOString().slice(0, 7))
    }
  },

  deleteClipPost: async (postId) => {
    await callAction('deleteClipPost', { postId })
    set(s => ({ posts: s.posts.filter(p => p.$id !== postId) }))
  },

  toggleFire: async (postId, userId) => {
    const post = get().posts.find(p => p.$id === postId)
    if (!post) return

    const alreadyFired = post.firedBy.includes(userId)
    const optimisticFiredBy = alreadyFired
      ? post.firedBy.filter(id => id !== userId)
      : [...post.firedBy, userId]
    set(s => ({
      posts: s.posts.map(p => p.$id === postId
        ? { ...p, fireCount: alreadyFired ? p.fireCount - 1 : p.fireCount + 1, firedBy: optimisticFiredBy }
        : p),
    }))

    try {
      const result = await callAction<{ fireCount: number; firedBy: string[] }>('toggleFire', { postId })
      set(s => ({
        posts: s.posts.map(p => p.$id === postId
          ? { ...p, fireCount: result.fireCount, firedBy: result.firedBy }
          : p),
      }))
    } catch {
      set(s => ({
        posts: s.posts.map(p => p.$id === postId
          ? { ...p, fireCount: post.fireCount, firedBy: post.firedBy }
          : p),
      }))
    }
  },
}))
