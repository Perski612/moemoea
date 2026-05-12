import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuthStore } from '@/stores/useAuthStore'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

export default function PendingScreen() {
  const { checkSession, logout } = useAuthStore()

  useEffect(() => {
    const interval = setInterval(checkSession, 30_000)
    return () => clearInterval(interval)
  }, [checkSession])

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Text style={styles.brandMain}>MOE MOEA</Text>
          <Text style={styles.brandSub}>TRAILS</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.dot} />
          <Text style={styles.title}>Warte auf Freischaltung</Text>
          <Text style={styles.body}>
            Dein Account wurde erstellt und wartet auf die Genehmigung durch einen Admin.{'\n\n'}
            Die App überprüft automatisch alle 30 Sekunden.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Ausloggen</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  brand: { alignItems: 'center', marginBottom: 48 },
  brandMain: { fontFamily: Fonts.display, fontSize: 40, letterSpacing: 4, color: Colors.text },
  brandSub: { fontFamily: Fonts.display, fontSize: 16, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },
  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowRadius: 8, shadowOpacity: 1 },
  title: { fontFamily: Fonts.bodyBd, fontSize: 18, color: Colors.text, textAlign: 'center' },
  body: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  logoutBtn: { marginTop: Spacing.xl, alignSelf: 'center', padding: Spacing.sm },
  logoutText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
})
