import { View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface Props {
  children: React.ReactNode
}

export function GlassBackground({ children }: Props) {
  const { theme } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {children}
    </View>
  )
}
