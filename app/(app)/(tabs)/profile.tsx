import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { AppHeader } from '@/components/ui/AppHeader'
import { PixelAvatar } from '@/components/PixelAvatar'
import { BikeConfigurator } from '@/components/BikeConfigurator'
import { Label } from '@/components/ui/Label'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
import type { BikeConfig } from '@/types'

const DEFAULT_BIKE: Omit<BikeConfig, '$id' | 'userId'> = {
  bikeType: 'hardtail',
  suspension: 'air',
  material: 'alu',
  bikeColor: '#1a1a1a',
  jerseyJ: '#e8e4dc',
  jerseyD: '#9a9890',
}

export default function ProfileScreen() {
  const { logout, isAdmin } = useAuthStore()
  const { profile, bikeConfig, saveBikeConfig } = useProfileStore()

  const xp    = profile?.xp    ?? 0
  const xpMax = 4000
  const level = profile?.level ?? 1

  const handleSave = async (config: Omit<BikeConfig, '$id' | 'userId'>) => {
    await saveBikeConfig(config)
  }

  const bikeInitial = bikeConfig
    ? { bikeType: bikeConfig.bikeType, suspension: bikeConfig.suspension, material: bikeConfig.material, bikeColor: bikeConfig.bikeColor, jerseyJ: bikeConfig.jerseyJ, jerseyD: bikeConfig.jerseyD }
    : DEFAULT_BIKE

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatarWrapper}>
            <PixelAvatar
              tier="rookie" px={4} accentColor={Colors.accent}
              bikeColor={bikeConfig?.bikeColor} jerseyJ={bikeConfig?.jerseyJ}
              jerseyD={bikeConfig?.jerseyD} bikeType={bikeConfig?.bikeType ?? 'hardtail'}
              suspType={bikeConfig?.suspension ?? 'air'}
            />
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.username}>{profile?.username ?? '—'}</Text>
            <Text style={styles.team}>{profile?.team ?? '—'}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {level}</Text>
            </View>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>ERFAHRUNG</Text>
            <Text style={styles.xpValue}>{xp.toLocaleString('de')} / {xpMax.toLocaleString('de')} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${(xp / xpMax) * 100}%` }]} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[['—', 'Distanz'], ['—', 'Runs'], ['—', 'Fires'], ['—', 'Rang']].map(([v, l]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statVal}>{v}</Text>
              <Text style={styles.statLbl}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Avatar Konfigurator */}
        <View style={styles.section}>
          <Label>Avatar Konfigurator</Label>
          <BikeConfigurator
            initial={bikeInitial}
            accent={Colors.accent}
            onSave={handleSave}
          />
        </View>

        {/* Admin Button */}
        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/(app)/admin')}>
              <Text style={styles.adminBtnText}>Admin-Panel öffnen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Ausloggen</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatarWrapper: {
    width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.bgCard,
    borderWidth: 2, borderColor: `${Colors.accent}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  identityInfo: { flex: 1 },
  username: { fontFamily: Fonts.bodyBd, fontSize: 20, color: Colors.text },
  team: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  levelBadge: {
    alignSelf: 'flex-start', marginTop: 6, borderWidth: 1, borderColor: `${Colors.accent}44`,
    backgroundColor: `${Colors.accent}1a`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2,
  },
  levelText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.accent },
  xpSection: { marginBottom: Spacing.md },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase' },
  xpValue: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.accent },
  xpTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99 },
  xpFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 99 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  stat: { alignItems: 'center' },
  statVal: { fontFamily: Fonts.monoBd, fontSize: 15, color: Colors.text },
  statLbl: { fontFamily: Fonts.bodyBd, fontSize: 8, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase' },
  section: { marginBottom: Spacing.lg },
  adminBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  adminBtnText: { fontFamily: Fonts.bodyBd, fontSize: 13, color: Colors.muted },
  logoutBtn: { alignSelf: 'center', padding: Spacing.sm, marginBottom: Spacing.lg },
  logoutText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
})
