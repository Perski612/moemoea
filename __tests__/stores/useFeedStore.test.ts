import { renderHook, act } from '@testing-library/react-native'

jest.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: jest.fn(),
    listDocuments: jest.fn(),
    updateDocument: jest.fn(),
  },
  DB_ID: 'trails-db',
  CLIP_POSTS_ID: 'clip_posts',
  ID: { unique: () => 'mock-id' },
  Query: {
    equal: (k: string, v: unknown) => `equal(${k},${v})`,
    orderDesc: (k: string) => `orderDesc(${k})`,
    limit: (n: number) => `limit(${n})`,
  },
  Permission: { read: jest.fn(() => 'read'), write: jest.fn(() => 'write') },
  Role: { any: jest.fn(() => 'any'), user: jest.fn((id: string) => `user:${id}`) },
}))

import { useFeedStore } from '@/stores/useFeedStore'
import { databases } from '@/lib/appwrite'

const db = databases as jest.Mocked<typeof databases>

beforeEach(() => {
  jest.clearAllMocks()
  useFeedStore.setState({ posts: [] })
})

describe('useFeedStore.getClipPosts', () => {
  it('loads posts for a contest month', async () => {
    db.listDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [{ $id: 'p1', userId: 'u1', username: 'Max', tier: 'rookie', contestMonth: '2026-05', verified: true, fireCount: 10, firedBy: [], $createdAt: '' }],
    } as any)

    const { result } = renderHook(() => useFeedStore())
    await act(async () => { await result.current.getClipPosts('2026-05') })

    expect(result.current.posts).toHaveLength(1)
    expect(result.current.posts[0].username).toBe('Max')
  })
})

describe('useFeedStore.toggleFire', () => {
  it('adds userId to firedBy and increments fireCount', async () => {
    useFeedStore.setState({
      posts: [{ $id: 'p1', userId: 'u2', username: 'Sara', tier: 'rookie', runId: null, contestMonth: '2026-05', verified: true, fireCount: 5, firedBy: [], $createdAt: '' }],
    })
    db.updateDocument.mockResolvedValueOnce({ $id: 'p1', fireCount: 6, firedBy: ['u1'] } as any)

    const { result } = renderHook(() => useFeedStore())
    await act(async () => { await result.current.toggleFire('p1', 'u1') })

    expect(db.updateDocument).toHaveBeenCalledWith('trails-db', 'clip_posts', 'p1', {
      fireCount: 6,
      firedBy: ['u1'],
    })
  })

  it('removes userId from firedBy and decrements fireCount when already fired', async () => {
    useFeedStore.setState({
      posts: [{ $id: 'p1', userId: 'u2', username: 'Sara', tier: 'rookie', runId: null, contestMonth: '2026-05', verified: true, fireCount: 6, firedBy: ['u1'], $createdAt: '' }],
    })
    db.updateDocument.mockResolvedValueOnce({ $id: 'p1', fireCount: 5, firedBy: [] } as any)

    const { result } = renderHook(() => useFeedStore())
    await act(async () => { await result.current.toggleFire('p1', 'u1') })

    expect(db.updateDocument).toHaveBeenCalledWith('trails-db', 'clip_posts', 'p1', {
      fireCount: 5,
      firedBy: [],
    })
  })
})
