import { renderHook, act } from '@testing-library/react-native'

jest.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: jest.fn(),
    listDocuments: jest.fn(),
  },
  DB_ID: 'trails-db',
  SESSIONS_ID: 'sessions',
  RUNS_ID: 'runs',
  ID: { unique: () => 'mock-id' },
  Query: {
    equal: (k: string, v: unknown) => `equal(${k},${v})`,
    orderDesc: (k: string) => `orderDesc(${k})`,
    orderAsc: (k: string) => `orderAsc(${k})`,
    limit: (n: number) => `limit(${n})`,
    greaterThanEqual: (k: string, v: unknown) => `gte(${k},${v})`,
    lessThanEqual: (k: string, v: unknown) => `lte(${k},${v})`,
    isNotNull: (k: string) => `notNull(${k})`,
  },
  Permission: { read: jest.fn(() => 'read'), write: jest.fn(() => 'write') },
  Role: { user: jest.fn((id: string) => `user:${id}`), any: jest.fn(() => 'any') },
}))

import { useRunStore } from '@/stores/useRunStore'
import { databases } from '@/lib/appwrite'

const db = databases as jest.Mocked<typeof databases>

beforeEach(() => {
  jest.clearAllMocks()
  useRunStore.setState({ sessions: [], runs: [] })
})

describe('useRunStore.createSession', () => {
  it('creates a session document and returns it', async () => {
    const mockSession = { $id: 's1', userId: 'u1', date: '2026-05-18', trailId: 'moe-moea', $createdAt: '' }
    db.createDocument.mockResolvedValueOnce(mockSession as any)

    const { result } = renderHook(() => useRunStore())
    let session: any
    await act(async () => { session = await result.current.createSession('u1', '2026-05-18') })

    expect(db.createDocument).toHaveBeenCalledWith('trails-db', 'sessions', 'mock-id', {
      userId: 'u1', date: '2026-05-18', trailId: 'moe-moea',
    }, expect.any(Array))
    expect(session.$id).toBe('s1')
  })
})

describe('useRunStore.createRun', () => {
  it('creates a run document and returns it', async () => {
    const mockRun = { $id: 'r1', userId: 'u1', totalTime: 82.5, $createdAt: '' }
    db.createDocument.mockResolvedValueOnce(mockRun as any)

    const { result } = renderHook(() => useRunStore())
    let run: any
    await act(async () => {
      run = await result.current.createRun({
        sessionId: 's1', userId: 'u1', username: 'Max', tier: 'rookie',
        startedAt: '2026-05-18T10:00:00.000Z',
        totalTime: 82.5, p1Time: 44.9, p2Time: 32.6,
        maxAirtime: 2.34, maxSpeed: 67, maxGForce: 4.2,
        distance: 1200, dataSource: 'phone',
      })
    })

    expect(db.createDocument).toHaveBeenCalledTimes(1)
    expect(run.$id).toBe('r1')
  })
})

describe('useRunStore.getWeeklyStats', () => {
  it('sums distance and airtime, takes max speed for the week', async () => {
    db.listDocuments.mockResolvedValueOnce({
      total: 3,
      documents: [
        { distance: 1200, maxAirtime: 2.1, maxSpeed: 60 },
        { distance: 1200, maxAirtime: 3.4, maxSpeed: 67 },
        { distance: 1200, maxAirtime: 1.8, maxSpeed: 55 },
      ],
    } as any)

    const { result } = renderHook(() => useRunStore())
    let stats: any
    await act(async () => { stats = await result.current.getWeeklyStats('u1') })

    expect(stats.distance).toBeCloseTo(3600)
    expect(stats.airtime).toBeCloseTo(7.3)
    expect(stats.topSpeed).toBe(67)
  })
})
