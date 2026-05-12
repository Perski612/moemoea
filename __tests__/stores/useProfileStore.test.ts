import { renderHook, act } from '@testing-library/react-native'

jest.mock('@/lib/appwrite', () => ({
  databases: {
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
  },
  DB_ID: 'trails-db',
  PROFILES_ID: 'profiles',
  BIKE_CONFIGS_ID: 'bike_configs',
  Permission: { read: jest.fn(() => 'read'), write: jest.fn(() => 'write') },
  Role: { user: jest.fn((id: string) => `user:${id}`), team: jest.fn((t: string) => `team:${t}`) },
}))

import { useProfileStore } from '@/stores/useProfileStore'
import { databases } from '@/lib/appwrite'

const mockDatabases = databases as jest.Mocked<typeof databases>

beforeEach(() => {
  jest.clearAllMocks()
  useProfileStore.setState({ profile: null, bikeConfig: null })
})

describe('useProfileStore', () => {
  it('syncFromAppwrite befüllt profile und bikeConfig', async () => {
    const mockProfile = { $id: 'u1', userId: 'u1', username: 'MaxTrailblazer', team: 'MOE MOEA Crew', xp: 0, level: 1, approved: true, isAdmin: false }
    const mockBike = { $id: 'u1', userId: 'u1', bikeType: 'hardtail', suspension: 'air', material: 'alu', bikeColor: '#1a1a1a', jerseyJ: '#e8e4dc', jerseyD: '#9a9890' }
    mockDatabases.getDocument
      .mockResolvedValueOnce(mockProfile as any)
      .mockResolvedValueOnce(mockBike as any)

    const { result } = renderHook(() => useProfileStore())
    await act(async () => { await result.current.syncFromAppwrite('u1') })

    expect(result.current.profile?.username).toBe('MaxTrailblazer')
    expect(result.current.bikeConfig?.bikeType).toBe('hardtail')
  })

  it('saveBikeConfig erstellt neues Dokument wenn keines existiert', async () => {
    mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'u1' } as any)
    useProfileStore.setState({ profile: { $id: 'u1', userId: 'u1' } as any, bikeConfig: null })

    const newConfig = { bikeType: 'fully', suspension: 'coil', material: 'carbon', bikeColor: '#1a3a99', jerseyJ: '#cc2200', jerseyD: '#881500' } as any

    const { result } = renderHook(() => useProfileStore())
    await act(async () => { await result.current.saveBikeConfig(newConfig) })

    expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1)
  })

  it('saveBikeConfig aktualisiert wenn Dokument existiert (409)', async () => {
    const conflict = Object.assign(new Error('conflict'), { code: 409 })
    mockDatabases.createDocument.mockRejectedValueOnce(conflict)
    mockDatabases.updateDocument.mockResolvedValueOnce({ $id: 'u1' } as any)
    useProfileStore.setState({ profile: { $id: 'u1', userId: 'u1' } as any, bikeConfig: null })

    const newConfig = { bikeType: 'fully', suspension: 'air', material: 'alu', bikeColor: '#555', jerseyJ: '#e8e4dc', jerseyD: '#9a9890' } as any

    const { result } = renderHook(() => useProfileStore())
    await act(async () => { await result.current.saveBikeConfig(newConfig) })

    expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1)
  })
})
