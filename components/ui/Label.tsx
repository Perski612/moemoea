import { Text, StyleSheet } from 'react-native'
import { Colors, Fonts } from '@/constants/theme'

interface LabelProps {
  children: string
  color?: string
}

export function Label({ children, color = Colors.accent }: LabelProps) {
  return (
    <Text style={[styles.label, { color }]}>{children}</Text>
  )
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodyBd,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
})
