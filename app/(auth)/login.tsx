import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((s) => s.login)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Email und Passwort erforderlich.')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (e: any) {
      Alert.alert('Login fehlgeschlagen', e?.message ?? 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Text style={styles.brandMain}>MOE MOEA</Text>
          <Text style={styles.brandSub}>TRAILS</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor={Colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Einloggen…' : 'Einloggen'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register" style={styles.link}>
          <Text style={styles.linkText}>Noch kein Account? Registrieren</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  brand: { alignItems: 'center', marginBottom: 48 },
  brandMain: { fontFamily: Fonts.display, fontSize: 48, letterSpacing: 4, color: Colors.text },
  brandSub: { fontFamily: Fonts.display, fontSize: 18, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },
  input: {
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  btn: {
    backgroundColor: Colors.accent, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
  link: { marginTop: Spacing.lg, alignSelf: 'center' },
  linkText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
})
