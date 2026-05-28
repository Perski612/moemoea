import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'

export default function AuthLayout() {
  const { session, isApproved } = useAuthStore()

  if (session && isApproved) {
    return <Redirect href="/(app)/(tabs)/dashboard" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
