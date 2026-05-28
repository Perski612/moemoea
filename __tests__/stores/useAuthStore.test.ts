import { renderHook, act } from '@testing-library/react-native'

jest.mock('@/lib/appwrite', () => ({
  account: {
    getSession: jest.fn(),
    createEmailPasswordSession: jest.fn(),
    deleteSession: jest.fn(),
  },
  databases: {
    getDocument: jest.fn(),
  },
  DB_ID: 'trails-db',
  PROFILES_ID: 'profiles',
}))

import { useAuthStore } from '@/stores/useAuthStore'
import { account, databases } from '@/lib/appwrite'

const mockAccount = account as jest.Mocked<typeof account>
const mockDatabases = databases as jest.Mocked<typeof databases>

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ session: null, isApproved: false, isAdmin: false })
})

describe('useAuthStore', () => {
  it('setzt isApproved auf false wenn kein Profile approved', async () => {
    mockAccount.getSession.mockResolvedValueOnce({ $id: 'session-1', userId: 'user-1' } as any)
    mockDatabases.getDocument.mockResolvedValueOnce({
      $id: 'user-1', userId: 'user-1', approved: false, isAdmin: false,
    } as any)

    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.checkSession() })

    expect(result.current.isApproved).toBe(false)
    expect(result.current.isAdmin).toBe(false)
  })

  it('setzt isApproved auf true wenn Profile approved', async () => {
    mockAccount.getSession.mockResolvedValueOnce({ $id: 'session-1', userId: 'user-1' } as any)
    mockDatabases.getDocument.mockResolvedValueOnce({
      $id: 'user-1', userId: 'user-1', approved: true, isAdmin: false,
    } as any)

    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.checkSession() })

    expect(result.current.isApproved).toBe(true)
  })

  it('setzt session auf null bei logout', async () => {
    mockAccount.deleteSession.mockResolvedValueOnce({} as any)
    useAuthStore.setState({ session: { $id: 'session-1' } as any, isApproved: true, isAdmin: false })

    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.logout() })

    expect(result.current.session).toBeNull()
    expect(result.current.isApproved).toBe(false)
  })

  it('checkSession setzt session auf null wenn getSession wirft', async () => {
    mockAccount.getSession.mockRejectedValueOnce(new Error('no session'))

    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.checkSession() })

    expect(result.current.session).toBeNull()
  })
})
