import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { account, databases, DB_ID, PROFILES_ID, ID, Permission, Role } from '@/lib/appwrite'
import { useAuthStore } from '@/stores/useAuthStore'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

const TEAMS = ['MOE MOEA Crew', 'Singletrack Sisters', 'Trail Devils', 'Dirt Crew', 'Solo']

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [team, setTeam] = useState(TEAMS[0])
  const [loading, setLoading] = useState(false)

  const checkSession = useAuthStore((s) => s.checkSession)

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('Fehler', 'Alle Felder sind erforderlich.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Fehler', 'Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setLoading(true)
    try {
      const user = await account.create(ID.unique(), email.trim(), password, username)
      await account.createEmailPasswordSession(email.trim(), password)

      const permissions = [
        Permission.read(Role.any()),
        Permission.write(Role.user(user.$id)),
      ]

      await databases.createDocument(DB_ID, PROFILES_ID, user.$id, {
        userId: user.$id,
        username,
        team,
        xp: 0,
        pendingXp: 0,
        level: 1,
        approved: false,
        isAdmin: false,
        tier: 'rookie',
      }, permissions)

      await checkSession()
    } catch (e: any) {
      Alert.alert('Registrierung fehlgeschlagen', e?.message ?? 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.brand}>
          <Text style={styles.brandMain}>MOE MOEA</Text>
          <Text style={styles.brandSub}>TRAILS</Text>
        </View>
        <Text style={styles.title}>Account erstellen</Text>

        <TextInput style={styles.input} placeholder="Username" placeholderTextColor={Colors.muted}
          value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.muted}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Passwort (min. 8 Zeichen)" placeholderTextColor={Colors.muted}
          value={password} onChangeText={setPassword} secureTextEntry />

        <Text style={styles.teamLabel}>Team</Text>
        <View style={styles.teamRow}>
          {TEAMS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.teamChip, team === t && styles.teamChipActive]}
              onPress={() => setTeam(t)}
            >
              <Text style={[styles.teamChipText, team === t && styles.teamChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Registrieren…' : 'Registrieren'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Bereits registriert? Einloggen</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  brand: { alignItems: 'center', marginBottom: 32 },
  brandMain: { fontFamily: Fonts.display, fontSize: 40, letterSpacing: 4, color: Colors.text },
  brandSub: { fontFamily: Fonts.display, fontSize: 16, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },
  title: { fontFamily: Fonts.bodyBd, fontSize: 18, color: Colors.text, marginBottom: Spacing.md },
  input: {
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  teamLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 2, color: Colors.muted, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  teamRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  teamChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  teamChipActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}18` },
  teamChipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  teamChipTextActive: { color: Colors.accent },
  btn: { backgroundColor: Colors.accent, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
  link: { marginTop: Spacing.lg, alignSelf: 'center' },
  linkText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
})
