import 'react-native-url-polyfill/auto'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue'
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '@/stores/useAuthStore'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()

export default function RootLayout() {
  const checkSession = useAuthStore((s) => s.checkSession)

  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      checkSession().finally(() => SplashScreen.hideAsync())
    }
  }, [fontsLoaded, fontError, checkSession])

  if (!fontsLoaded && !fontError) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}
