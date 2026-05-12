import { View, Text, StyleSheet } from 'react-native'
import { Colors, Fonts } from '@/constants/theme'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PROFIL</Text>
      <Text style={styles.sub}>Kommt in Phase A/B</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: 4, color: Colors.text },
  sub: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, marginTop: 8 },
})
