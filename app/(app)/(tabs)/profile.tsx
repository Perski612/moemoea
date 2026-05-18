import { Image, ImageSourcePropType, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { AppHeader } from '@/components/ui/AppHeader'
import { RemoteAvatar } from '@/components/RemoteAvatar'
import { BikeConfigurator } from '@/components/BikeConfigurator'
import { Label } from '@/components/ui/Label'
import { DEFAULT_AVATAR_URL } from '@/constants/avatarPresets'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { databases, DB_ID, RUNS_ID, CLIP_POSTS_ID, Query } from '@/lib/appwrite'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
import type { BikeConfig, Run, ClipPost } from '@/types'

const accent = Colors.accent

const BIKE_IMAGES: Record<'hardtail' | 'enduro' | 'downhill', ImageSourcePropType> = {
  hardtail: require('@/assets/Hardtail.png'),
  enduro:   require('@/assets/Enduro.png'),
  downhill: require('@/assets/Downhill.png'),
}

const DEFAULT_BIKE: Omit<BikeConfig, '$id' | 'userId'> = {
  bikeType: 'hardtail',
  suspension: 'air',
  material: 'alu',
  bikeColor: '#1a1a1a',
  jerseyJ: '#e8e4dc',
  jerseyD: '#9a9890',
  hairColor: '#1a1210',
  skinColor: '#d4a574',
  eyeColor: accent,
  shirtColor: '#e8e4dc',
  pantsColor: '#9a9890',
  hairStyle: 'short',
  avatarPresetId: 'messy_green',
  avatarUrl: DEFAULT_AVATAR_URL,
}

const ACHIEVEMENTS = [
  { id: 'first_air',   label: 'Erster Flug',  color: accent },
  { id: 'five_runs',   label: '5 Runs',        color: '#ffd700' },
  { id: 'top3',        label: 'Podium',        color: '#bf00ff' },
  { id: 'trail_care',  label: 'Trail-Pfleger', color: '#00e5ff' },
  { id: 'goldhelmet',  label: 'Goldhelm',      color: '#ffd700' },
  { id: 'contest_win', label: 'Contest-Star',  color: '#ff6b00' },
]

async function fetchProfileStats(userId: string) {
  const [runsRes, clipsRes] = await Promise.all([
    databases.listDocuments(DB_ID, RUNS_ID, [
      Query.equal('userId', userId),
      Query.limit(200),
    ]).catch(() => ({ documents: [] })),
    databases.listDocuments(DB_ID, CLIP_POSTS_ID, [
      Query.equal('userId', userId),
      Query.limit(100),
    ]).catch(() => ({ documents: [] })),
  ])

  const runs = runsRes.documents as unknown as Run[]
  const clips = clipsRes.documents as unknown as ClipPost[]
  const bestRank = 0

  return {
    distanceKm: runs.reduce((sum, run) => sum + run.distance, 0),
    runCount: runs.length,
    fires: clips.reduce((sum, clip) => sum + clip.fireCount, 0),
    bestRank,
    hasAirtime: runs.some((run) => run.maxAirtime > 0),
  }
}

export default function ProfileScreen() {
  const { logout, isAdmin, session } = useAuthStore()
  const { profile, bikeConfig, saveBikeConfig } = useProfileStore()

  const { data: stats = { distanceKm: 0, runCount: 0, fires: 0, bestRank: 0, hasAirtime: false } } = useQuery({
    queryKey: ['profile-stats', session?.userId],
    queryFn: () => fetchProfileStats(session!.userId),
    enabled: Boolean(session?.userId),
    retry: false,
  })

  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 1
  const xpMax = Math.ceil(Math.max(xp + 1, 400) / 400) * 400
  const tier = profile?.tier ?? 'rookie'
  const achievementState = {
    first_air: stats.hasAirtime,
    five_runs: stats.runCount >= 5,
    top3: stats.bestRank > 0 && stats.bestRank <= 3,
    trail_care: false,
    goldhelmet: stats.runCount >= 20,
    contest_win: false,
  } as Record<string, boolean>

  const handleSave = async (config: Omit<BikeConfig, '$id' | 'userId'>) => {
    await saveBikeConfig(config)
  }

  const resolvedBikeType = ((): 'hardtail' | 'enduro' | 'downhill' => {
    const t = bikeConfig?.bikeType as string | undefined
    if (t === 'enduro' || t === 'downhill' || t === 'hardtail') return t
    if (t === 'fully') return 'enduro'
    return 'hardtail'
  })()

  const bikeInitial: Omit<BikeConfig, '$id' | 'userId'> = bikeConfig
    ? {
      bikeType: resolvedBikeType,
      suspension: bikeConfig.suspension,
      material: bikeConfig.material,
      bikeColor: bikeConfig.bikeColor,
      jerseyJ: bikeConfig.jerseyJ,
      jerseyD: bikeConfig.jerseyD,
      hairColor: bikeConfig.hairColor,
      skinColor: bikeConfig.skinColor,
      eyeColor: bikeConfig.eyeColor,
      shirtColor: bikeConfig.shirtColor,
      pantsColor: bikeConfig.pantsColor,
      hairStyle: bikeConfig.hairStyle,
      avatarPresetId: bikeConfig.avatarPresetId,
      avatarUrl: bikeConfig.avatarUrl,
      marke: bikeConfig.marke ?? '',
      modell: bikeConfig.modell ?? '',
      federweg_v: bikeConfig.federweg_v ?? '',
      federweg_h: bikeConfig.federweg_h ?? '',
    }
    : DEFAULT_BIKE

  const cardStyle = { backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14 }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <View style={s.identity}>
          <View style={s.avatarWrapper}>
            <RemoteAvatar url={bikeConfig?.avatarUrl} size={50} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
              <Text style={s.username}>{profile?.username ?? 'Unbekannt'}</Text>
              <Text style={s.bikeTypeInline}>{resolvedBikeType.toUpperCase()}</Text>
            </View>
            <Text style={s.team}>{profile?.team ?? 'Kein Team'}</Text>
            <View style={s.levelBadge}>
              <Text style={s.levelText}>LVL {level}</Text>
            </View>
          </View>
          <View style={s.bikeImageWrapper}>
            <Image
              source={BIKE_IMAGES[resolvedBikeType]}
              style={s.bikeImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* TP Bar */}
        <View style={{ marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={s.tpLabel}>Track Points</Text>
            <Text style={[s.tpLabel, { color: accent }]}>{xp.toLocaleString('de-DE')} / {xpMax.toLocaleString('de-DE')} TP</Text>
          </View>
          <View style={s.tpTrack}>
            <View style={[s.tpFill, { width: `${Math.min((xp / xpMax) * 100, 100)}%` as any }]} />
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            [`${stats.distanceKm.toFixed(1)} km`, 'Distanz'],
            [String(stats.runCount), 'Runs'],
            [String(stats.fires), 'Fires'],
            [stats.bestRank > 0 ? `#${stats.bestRank}` : '-', 'Rang'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={s.statVal}>{v}</Text>
              <Text style={s.statLbl}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Bike Setup Preview */}
        <Label>Mein Bike-Setup</Label>
        <View style={[cardStyle, { marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ backgroundColor: Colors.bg, borderRadius: 9, padding: 8, borderWidth: 1, borderColor: `${accent}22` }}>
            <RemoteAvatar url={bikeConfig?.avatarUrl} size={80} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Fonts.bodyBd, fontSize: 15, color: Colors.text }}>
              {bikeConfig?.marke || '—'} {bikeConfig?.modell || ''}
            </Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 3 }}>
              {resolvedBikeType.charAt(0).toUpperCase() + resolvedBikeType.slice(1)} · {bikeConfig?.material === 'carbon' ? 'Carbon' : 'Aluminium'}
            </Text>
            {(bikeConfig?.federweg_v || bikeConfig?.federweg_h) ? (
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 }}>
                ↕ {bikeConfig.federweg_v || '—'}mm / {bikeConfig.federweg_h || '—'}mm
              </Text>
            ) : null}
          </View>
          <Image source={BIKE_IMAGES[resolvedBikeType]} style={{ width: 70, height: 46 }} resizeMode="contain" />
        </View>

        {/* Setup Konfigurator */}
        <Label>Fahrer & Bike Konfigurator</Label>
        <View style={[cardStyle, { marginBottom: 16 }]}>
          <BikeConfigurator
            initial={bikeInitial}
            accent={accent}
            onSave={handleSave}
          />
        </View>

        {/* Achievements */}
        <Label>Achievements</Label>
        <View style={s.achieveGrid}>
          {ACHIEVEMENTS.map(a => (
            <View key={a.id} style={[
              s.achieveCard,
              { borderColor: achievementState[a.id] ? `${a.color}44` : 'rgba(255,255,255,0.06)', backgroundColor: achievementState[a.id] ? `${a.color}09` : 'rgba(255,255,255,0.01)', opacity: achievementState[a.id] ? 1 : 0.38 }
            ]}>
              <View style={[s.achieveDot, { backgroundColor: achievementState[a.id] ? `${a.color}1a` : 'rgba(255,255,255,0.04)', borderColor: achievementState[a.id] ? `${a.color}44` : 'rgba(255,255,255,0.1)' }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: achievementState[a.id] ? a.color : '#333' }} />
              </View>
              <Text style={[s.achieveLabel, { color: achievementState[a.id] ? Colors.text : Colors.muted }]}>{a.label}</Text>
            </View>
          ))}
        </View>

        {/* Admin Button */}
        {isAdmin && (
          <TouchableOpacity style={s.adminBtn} onPress={() => router.push('/(app)/admin')}>
            <Text style={s.adminBtnText}>Admin-Panel öffnen</Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Ausloggen</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Spacing.md },
  bikeImageWrapper: {
    width: 150, height: 100,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${accent}33`, borderRadius: 12,
    backgroundColor: `${accent}0a`, overflow: 'hidden',
  },
  bikeImage: { width: 220, height: 145, marginTop: 30 },
  bikeTypeInline: { fontFamily: Fonts.mono, fontSize: 11, color: accent, letterSpacing: 1.5 },
  avatarWrapper: {
    width: 62, height: 62, borderRadius: 14, backgroundColor: Colors.bgCard,
    borderWidth: 2, borderColor: `${accent}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  username: { fontFamily: Fonts.bodyBd, fontSize: 22, color: Colors.text },
  team: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  levelBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    borderWidth: 1, borderColor: `${accent}44`, backgroundColor: `${accent}1a`,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2,
  },
  levelText: { fontFamily: Fonts.mono, fontSize: 12, color: accent },

  tpLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase' },
  tpTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99 },
  tpFill: { height: '100%', backgroundColor: accent, borderRadius: 99 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  statVal: { fontFamily: Fonts.mono, fontSize: 17, color: Colors.text, fontWeight: '700' },
  statLbl: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase' },

  fieldLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase', marginBottom: 5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 7, padding: 7, paddingHorizontal: 10, color: Colors.text,
    fontFamily: Fonts.body, fontSize: 13,
  },

  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  achieveCard: {
    width: '30%', borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center',
  },
  achieveDot: {
    width: 24, height: 24, borderRadius: 6, marginBottom: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  achieveLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, textAlign: 'center', lineHeight: 15 },

  adminBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md,
  },
  adminBtnText: { fontFamily: Fonts.bodyBd, fontSize: 15, color: Colors.muted },
  logoutBtn: { alignSelf: 'center', padding: Spacing.sm, marginBottom: Spacing.md },
  logoutText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.muted },
})
