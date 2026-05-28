import { View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { Radius } from '@/constants/theme'

interface Props {
  children: React.ReactNode
  style?: object
  padding?: number
}

export function GlassCard({ children, style, padding = 14 }: Props) {
  const { theme } = useTheme()
  return (
    <View style={[
      { borderRadius: Radius.lg, borderWidth: 1, backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
      style,
      { padding },
    ]}>
      {children}
    </View>
  )
}
