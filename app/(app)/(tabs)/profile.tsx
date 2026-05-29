import { Image, ImageSourcePropType, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { AppHeader } from '@/components/ui/AppHeader'
import { RemoteAvatar } from '@/components/RemoteAvatar'
import { LevelEmblem } from '@/components/LevelEmblem'
import { getEmblemForLevel } from '@/lib/emblems'
import { Label } from '@/components/ui/Label'
import { GlassCard } from '@/components/ui/GlassCard'
import { XpBar } from '@/components/XpBar'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSettingsStore, ACCENT_OPTIONS } from '@/stores/useSettingsStore'
import { useTheme } from '@/hooks/useTheme'
import { databases, DB_ID, RUNS_ID, CLIP_POSTS_ID, Query } from '@/lib/appwrite'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
import { SHOP_ITEMS } from '@/constants/shopItems'
import type { Run, ClipPost } from '@/types'

const BIKE_IMAGES: Record<'hardtail' | 'enduro' | 'downhill', ImageSourcePropType> = {
  hardtail: require('@/assets/Hardtail.png'),
  enduro:   require('@/assets/Enduro.png'),
  downhill: require('@/assets/Downhill.png'),
}

const ACHIEVEMENTS = [
  { id: 'first_air',   label: 'Erster Flug',  color: Colors.accent },
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

  return {
    distanceKm: runs.reduce((sum, run) => sum + run.distance, 0),
    runCount: runs.length,
    fires: clips.reduce((sum, clip) => sum + clip.fireCount, 0),
    bestRank: 0,
    hasAirtime: runs.some((run) => run.maxAirtime > 0),
  }
}

export default function ProfileScreen() {
  const { logout, isAdmin, session } = useAuthStore()
  const { profile, bikeConfig } = useProfileStore()
  const { accentColor, units, colorScheme: schemeSetting, setAccentColor, setUnits, setColorScheme } = useSettingsStore()
  const { theme, accent, isDark } = useTheme()

  const { data: stats = { distanceKm: 0, runCount: 0, fires: 0, bestRank: 0, hasAirtime: false } } = useQuery({
    queryKey: ['profile-stats', session?.userId],
    queryFn: () => fetchProfileStats(session!.userId),
    enabled: Boolean(session?.userId),
    retry: false,
  })

  const level = profile?.level ?? 1
  const emblem = getEmblemForLevel(level)
  const glowOpacity = [0, 0.3, 0.55, 0.85][emblem.glowIntensity]
  const glowRadius  = [0, 4,   8,    14 ][emblem.glowIntensity]
  const achievementState = {
    first_air: stats.hasAirtime,
    five_runs: stats.runCount >= 5,
    top3: stats.bestRank > 0 && stats.bestRank <= 3,
    trail_care: false,
    goldhelmet: stats.runCount >= 20,
    contest_win: false,
  } as Record<string, boolean>

  const resolvedBikeType = ((): 'hardtail' | 'enduro' | 'downhill' => {
    const t = bikeConfig?.bikeType as string | undefined
    if (t === 'enduro' || t === 'downhill' || t === 'hardtail') return t
    if (t === 'fully') return 'enduro'
    return 'hardtail'
  })()

  const distDisplay = units === 'km'
    ? `${stats.distanceKm.toFixed(1)} km`
    : `${(stats.distanceKm * 0.621371).toFixed(1)} mi`


  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <View style={s.identity}>
          <View style={[s.avatarWrapper, {
            backgroundColor: theme.bgCard,
            borderColor: emblem.tierColor,
            shadowColor: emblem.tierColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowOpacity,
            shadowRadius: glowRadius,
            elevation: 10,
          }]}>
            <RemoteAvatar url={bikeConfig?.avatarUrl} size={50} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
              <Text style={[s.username, { color: theme.text }]}>{profile?.username ?? 'Unbekannt'}</Text>
              <Text style={[s.bikeTypeInline, { color: accent }]}>{resolvedBikeType.toUpperCase()}</Text>
            </View>
            <Text style={[s.team, { color: theme.muted }]}>{profile?.team ?? 'Kein Team'}</Text>
            <View style={[s.levelBadge, { borderColor: `${accent}44`, backgroundColor: `${accent}1a` }]}>
              <Text style={[s.levelText, { color: accent }]}>LVL {level}</Text>
            </View>
          </View>
          {/* Emblem — rechts, über TP-Leiste */}
          <View style={s.emblemBlock}>
            <LevelEmblem level={level} size={88} />
            <Text style={[s.emblemName, { color: theme.muted, marginTop: -(8 + Math.round(88 * ((emblem.sizeFactor ?? 1) - 1))) }]}>{emblem.name}</Text>
          </View>
        </View>

        {/* XP Bar */}
        <XpBar accent={accent} />

        {/* Quick Actions */}
        <View style={s.quickActions}>
          <TouchableOpacity
            style={[s.quickBtn, { borderColor: 'rgba(255,215,0,0.35)', backgroundColor: 'rgba(255,215,0,0.07)' }]}
            onPress={() => router.push('/(app)/shop')}
            activeOpacity={0.75}
          >
            <View style={s.coinIconSm}><Text style={s.coinIconSmText}>¢</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.quickBtnTitle, { color: '#FFD700' }]}>HÄNDLER</Text>
              <Text style={[s.quickBtnSub, { color: theme.muted }]}>{profile?.coins ?? 0} Münzen</Text>
            </View>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 16, color: '#FFD700' }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.quickBtn, { borderColor: `${accent}44`, backgroundColor: `${accent}0d` }]}
            onPress={() => router.push('/(app)/bike-editor')}
            activeOpacity={0.75}
          >
            <Text style={{ fontFamily: Fonts.mono, fontSize: 18, color: accent }}>✎</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.quickBtnTitle, { color: accent }]}>BIKE EDITOR</Text>
              <Text style={[s.quickBtnSub, { color: theme.muted }]}>Farbe & Parts</Text>
            </View>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 16, color: accent }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            [distDisplay, 'Distanz'],
            [String(stats.runCount), 'Runs'],
            [String(stats.fires), 'Fires'],
            [String(profile?.coins ?? 0), 'Münzen'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={[s.statVal, { color: l === 'Münzen' ? '#FFD700' : theme.text }]}>{v}</Text>
              <Text style={[s.statLbl, { color: theme.muted }]}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Bike-Setup Preview */}
        <Label color={accent}>Mein Bike-Setup</Label>
        <GlassCard style={{ marginBottom: 16, overflow: 'hidden' }} padding={0}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 0, paddingRight: 0 }}>
            <RemoteAvatar url={bikeConfig?.avatarUrl} size={72} />
            <View style={{ flex: 1, marginLeft: 4 }}>
              <Text style={{ fontFamily: Fonts.bodyBd, fontSize: 15, color: theme.text }}>
                {bikeConfig?.marke || '—'} {bikeConfig?.modell || ''}
              </Text>
              {/* Color dot + type line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: bikeConfig?.bikeColor ?? '#1a1a1a',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                }} />
                <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: theme.muted }}>
                  {resolvedBikeType.charAt(0).toUpperCase() + resolvedBikeType.slice(1)} · {bikeConfig?.material === 'carbon' ? 'Carbon' : 'Aluminium'}
                </Text>
              </View>
              {(bikeConfig?.federweg_v || bikeConfig?.federweg_h) ? (
                <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: theme.muted, marginTop: 1 }}>
                  ↕ {bikeConfig.federweg_v || '—'}mm / {bikeConfig.federweg_h || '—'}mm
                </Text>
              ) : null}
              {/* Equipped parts thumbnails */}
              {(() => {
                const forkItem  = SHOP_ITEMS.find(i => i.id === bikeConfig?.equippedFork)
                const shockItem = SHOP_ITEMS.find(i => i.id === bikeConfig?.equippedShock)
                if (!forkItem && !shockItem) return null
                return (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {forkItem && (
                      <View style={{ alignItems: 'center' }}>
                        <Image source={forkItem.img} style={{ width: 44, height: 30 }} resizeMode="contain" />
                        <Text style={{ fontFamily: Fonts.mono, fontSize: 8, color: theme.dim, letterSpacing: 0.5, marginTop: 1 }}>GABEL</Text>
                      </View>
                    )}
                    {shockItem && (
                      <View style={{ alignItems: 'center' }}>
                        <Image source={shockItem.img} style={{ width: 44, height: 30 }} resizeMode="contain" />
                        <Text style={{ fontFamily: Fonts.mono, fontSize: 8, color: theme.dim, letterSpacing: 0.5, marginTop: 1 }}>DÄMPFER</Text>
                      </View>
                    )}
                  </View>
                )
              })()}
            </View>
            <Image source={BIKE_IMAGES[resolvedBikeType]} style={{ width: 220, height: 145, marginRight: -24, marginLeft: -30, marginBottom: -30, marginTop: -10 }} resizeMode="contain" />
          </View>
        </GlassCard>

        {/* Werkzeuge */}
        <Label color={accent}>Werkzeuge</Label>
        <GlassCard style={{ marginBottom: 16 }} padding={0}>
          <TouchableOpacity
            style={s.toolRow}
            onPress={() => router.push('/(app)/(tabs)/sensor')}
            activeOpacity={0.75}
          >
            <Text style={[s.toolIcon, { color: accent }]}>◎</Text>
            <Text style={[s.toolLabel, { color: theme.text }]}>Sensor & Run aufzeichnen</Text>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 16, color: theme.dim }}>›</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: theme.cardBorder, marginHorizontal: 16 }} />
          <TouchableOpacity
            style={s.toolRow}
            onPress={() => router.push('/(app)/(tabs)/strecke')}
            activeOpacity={0.75}
          >
            <Text style={[s.toolIcon, { color: accent }]}>⬡</Text>
            <Text style={[s.toolLabel, { color: theme.text }]}>Strecke & Sektorzeiten</Text>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 16, color: theme.dim }}>›</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Settings */}
        <Label color={accent}>Settings</Label>
        <GlassCard style={{ marginBottom: 16 }}>
          <View style={{ gap: 18 }}>

            {/* Farbschema */}
            <View>
              <Text style={[s.settingLabel, { color: theme.muted }]}>Farbschema</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {([
                  { value: 'system', label: 'System' },
                  { value: 'dark',   label: 'Dunkel' },
                  { value: 'light',  label: 'Hell' },
                ] as const).map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setColorScheme(value)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.sm,
                      borderWidth: 1,
                      borderColor: schemeSetting === value ? accent : theme.border,
                      backgroundColor: schemeSetting === value ? `${accent}1a` : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: Fonts.mono, fontSize: 12, color: schemeSetting === value ? accent : theme.muted }}>
                      {label.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Akzentfarbe */}
            <View>
              <Text style={[s.settingLabel, { color: theme.muted }]}>Akzentfarbe</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                {ACCENT_OPTIONS.map(color => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setAccentColor(color)}
                    style={{
                      width: 30, height: 30, borderRadius: 15,
                      backgroundColor: color,
                      borderWidth: 2.5,
                      borderColor: color === accentColor ? theme.text : 'transparent',
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Einheiten */}
            <View>
              <Text style={[s.settingLabel, { color: theme.muted }]}>Einheiten</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(['km', 'mi'] as const).map(u => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnits(u)}
                    style={{
                      paddingHorizontal: 20, paddingVertical: 6, borderRadius: Radius.sm,
                      borderWidth: 1,
                      borderColor: units === u ? accent : theme.border,
                      backgroundColor: units === u ? `${accent}1a` : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: Fonts.mono, fontSize: 13, color: units === u ? accent : theme.muted }}>
                      {u.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        </GlassCard>

        {/* Achievements */}
        <Label color={accent}>Achievements</Label>
        <View style={s.achieveGrid}>
          {ACHIEVEMENTS.map(a => (
            <View key={a.id} style={[
              s.achieveCard,
              {
                borderColor: achievementState[a.id] ? `${a.color}44` : theme.border,
                backgroundColor: achievementState[a.id] ? `${a.color}09` : theme.cardBg,
                opacity: achievementState[a.id] ? 1 : 0.4,
              },
            ]}>
              <View style={[s.achieveDot, {
                backgroundColor: achievementState[a.id] ? `${a.color}1a` : 'transparent',
                borderColor: achievementState[a.id] ? `${a.color}44` : theme.border,
              }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: achievementState[a.id] ? a.color : theme.muted }} />
              </View>
              <Text style={[s.achieveLabel, { color: achievementState[a.id] ? theme.text : theme.muted }]}>{a.label}</Text>
            </View>
          ))}
        </View>

        {/* Admin */}
        {isAdmin && (
          <TouchableOpacity style={[s.adminBtn, { borderColor: theme.border }]} onPress={() => router.push('/(app)/admin')}>
            <Text style={[s.adminBtnText, { color: theme.muted }]}>Admin-Panel öffnen</Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={[s.logoutText, { color: theme.muted }]}>Ausloggen</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  emblemBlock: { alignItems: 'center', gap: 0 },
  emblemName: { fontFamily: Fonts.mono, fontSize: 8, letterSpacing: 1, textAlign: 'center', marginTop: -8 },
  avatarWrapper: {
    width: 62, height: 62, borderRadius: 14,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  username: { fontFamily: Fonts.bodyBd, fontSize: 22 },
  team: { fontFamily: Fonts.body, fontSize: 13, marginTop: 2 },
  bikeTypeInline: { fontFamily: Fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  levelBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 2,
  },
  levelText: { fontFamily: Fonts.mono, fontSize: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  statVal: { fontFamily: Fonts.mono, fontSize: 17, fontWeight: '700' },
  statLbl: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },

  settingLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },

  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  achieveCard: { width: '30%', borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  achieveDot: {
    width: 24, height: 24, borderRadius: 6, marginBottom: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  achieveLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, textAlign: 'center', lineHeight: 15 },

  quickActions: {
    flexDirection: 'column', gap: 8, marginBottom: Spacing.md,
  },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md,
  },
  quickBtnTitle: { fontFamily: Fonts.bodyBd, fontSize: 15, letterSpacing: 1 },
  quickBtnSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 1 },

  coinIconSm: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center',
  },
  coinIconSmText: { fontFamily: Fonts.monoBd, fontSize: 11, color: '#000', lineHeight: 22 },

  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  toolIcon: { fontFamily: Fonts.mono, fontSize: 16, width: 20, textAlign: 'center' },
  toolLabel: { fontFamily: Fonts.body, fontSize: 14, flex: 1 },

  adminBtn: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md },
  adminBtnText: { fontFamily: Fonts.bodyBd, fontSize: 15 },
  logoutBtn: { alignSelf: 'center', padding: Spacing.sm, marginBottom: Spacing.md },
  logoutText: { fontFamily: Fonts.body, fontSize: 15 },
})
