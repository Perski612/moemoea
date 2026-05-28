import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { IS_DEMO } from '@/lib/appwrite'
import { useEffect } from 'react'

export default function AppLayout() {
  const { session, isApproved } = useAuthStore()
  const syncFromAppwrite = useProfileStore((s) => s.syncFromAppwrite)

  useEffect(() => {
    if (session && isApproved && !IS_DEMO) {
      syncFromAppwrite(session.userId)
    }
  }, [session, isApproved, syncFromAppwrite])

  // Temporary dev bypass for testing phone sensors on a real device.
  if (IS_DEMO) return <Stack screenOptions={{ headerShown: false }} />

  if (!session) return <Redirect href="/(auth)/login" />
  if (!isApproved) return <Redirect href="/(auth)/pending" />

  return <Stack screenOptions={{ headerShown: false }} />
}
