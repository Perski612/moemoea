import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useEffect } from 'react'

export default function AppLayout() {
  const { session, isApproved } = useAuthStore()
  const syncFromAppwrite = useProfileStore((s) => s.syncFromAppwrite)

  useEffect(() => {
    if (session && isApproved) {
      syncFromAppwrite(session.userId)
    }
  }, [session, isApproved, syncFromAppwrite])

  if (!session) return <Redirect href="/(auth)/login" />
  if (!isApproved) return <Redirect href="/(auth)/pending" />

  return <Stack screenOptions={{ headerShown: false }} />
}
