import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, ScrollView, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg'
import { AppHeader } from '@/components/ui/AppHeader'
import { GlassBackground } from '@/components/ui/GlassBackground'
import { GlassCard } from '@/components/ui/GlassCard'
import { Fonts } from '@/constants/theme'
import { xpProgressInLevel } from '@/lib/xp'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRunStore } from '@/stores/useRunStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useTheme, Theme } from '@/hooks/useTheme'
import type { Tier } from '@/types'
import { LiveTrailWidget } from '@/components/LiveTrailWidget'
import { TrailMapWidget } from '@/components/TrailMapWidget'
import { XpBar } from '@/components/XpBar'
import { RankUpModal } from '@/components/RankUpModal'
import { LevelUpToast } from '@/components/LevelUpToast'
import type { ActiveRider } from '@/types'
import type { EmblemDef } from '@/lib/emblems'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 32

type DaySession = {
  label: string; date: string; runs: number
  bestRun: string; bestAirtime: string
  airtimeData: number[]; runTimeData: number[]
}

type WeeklyRankRow = {
  rank: number; name: string; time: string; delta: string; tier: Tier; isMe?: boolean
}

type PersonalBests = {
  gesamt: { time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number }
  p1:     { time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number }
  p2:     { time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number }
}

function fmtTime(secs: number | null): string {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = (secs % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

const SESSIONS_PREVIEW = 4

function TierDot({ tier }: { tier: string }) {
  const c = { rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' }[tier] ?? '#aaa'
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
}

function StatCard({ label, value, unit, glowing, accent, theme }: {
  label: string; value: string; unit: string; glowing?: boolean; accent: string; theme: Theme
}) {
  return (
    <View style={[s.statCard, {
      backgroundColor: theme.cardBg,
      borderColor: glowing ? `${accent}44` : theme.cardBorder,
    }, glowing && { backgroundColor: `${accent}08` }]}>
      <Text style={[s.statLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[s.statValue, { color: glowing ? accent : theme.text }]}>{value}</Text>
      <Text style={[s.statUnit, { color: theme.muted }]}>{unit}</Text>
    </View>
  )
}

function MiniChart({ data, color, h = 56 }: { data: number[]; color: string; h?: number }) {
  const n = data.length
  if (n < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = CARD_W - 56

  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * w
    const y = h - ((v - min) / range) * (h - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePath = 'M ' + pts.join(' L ')
  const fillPath = linePath + ` L ${w},${h} L 0,${h} Z`

  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={`g${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={fillPath} fill={`url(#g${color})`} />
      <Path d={linePath} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function WeeklyGoals({ stats, accent, theme }: {
  stats: { distance: number; airtime: number; topSpeed: number }; accent: string; theme: Theme
}) {
  const goals = [
    { label: 'Distanz',   cur: +(stats.distance / 1000).toFixed(1), goal: 50,  suffix: 'km',   color: accent },
    { label: 'Airtime',   cur: +stats.airtime.toFixed(1),            goal: 30,  suffix: 's',    color: '#a78bfa' },
    { label: 'Top-Speed', cur: Math.round(stats.topSpeed),           goal: 80,  suffix: 'km/h', color: '#fbbf24' },
  ]
  return (
    <View style={s.goalsRow}>
      {goals.map(({ label, cur, goal, suffix, color }) => {
        const pct = Math.min(cur / goal, 1)
        const done = pct >= 1
        return (
          <View key={label} style={[s.goalCard, {
            backgroundColor: done ? `${color}09` : theme.cardBg,
            borderColor: done ? `${color}33` : theme.cardBorder,
          }]}>
            <Text style={[s.goalLabel, { color: done ? color : theme.muted }]}>{label}</Text>
            <Text style={[s.goalValue, { color: done ? color : theme.text }]}>{cur}</Text>
            <Text style={[s.goalSub, { color: done ? `${color}bb` : theme.muted }]}>
              {suffix} · <Text style={{ color: theme.dim }}>/{goal}</Text>
            </Text>
            <View style={[s.goalBarTrack, { backgroundColor: theme.cardBorder }]}>
              <View style={[s.goalBarFill, {
                width: `${pct * 100}%` as any,
                backgroundColor: color,
                shadowColor: done ? color : 'transparent',
                shadowRadius: done ? 4 : 0,
              }]} />
            </View>
            <Text style={[s.goalPct, { color: done ? color : `${color}99` }]}>
              {done ? '✓ DONE' : `${Math.round(pct * 100)}%`}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function SlideBests({
  eyebrow, time, airtime, speed, gforce, rank, rankOf, accent, theme,
}: {
  eyebrow: string
  time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number
  accent: string; theme: Theme
}) {
  return (
    <View style={s.slide}>
      <Text style={[s.slideEyebrow, { color: accent }]}>{eyebrow}</Text>
      <View style={[s.bestTimeBox, { borderColor: `${accent}30`, backgroundColor: `${accent}08` }]}>
        <View>
          <Text style={[s.bestTimeLabel, { color: theme.muted }]}>BESTZEIT</Text>
          <Text style={[s.bestTimeValue, { color: accent }]}>{time}<Text style={[s.bestTimeUnit, { color: theme.muted }]}> min</Text></Text>
        </View>
        <View style={[s.rankBadge, { backgroundColor: `${accent}18` }]}>
          <Text style={[s.rankBadgeNum, { color: accent }]}>{rank}</Text>
          <Text style={[s.rankBadgeSub, { color: theme.muted }]}>von {rankOf}</Text>
        </View>
      </View>
      <View style={s.statsRow3}>
        <StatCard label="AIRTIME" value={airtime} unit="s" glowing accent={accent} theme={theme} />
        <StatCard label="TOP-SPEED" value={speed} unit="km/h" accent={accent} theme={theme} />
        <StatCard label="G-KRAFT" value={gforce} unit="g" accent={accent} theme={theme} />
      </View>
    </View>
  )
}

function SlideWeeklyRanking({ ranking, accent, theme }: { ranking: WeeklyRankRow[]; accent: string; theme: Theme }) {
  return (
    <View style={s.slide}>
      <Text style={[s.slideEyebrow, { color: accent }]}>WOCHENRANKING — GESAMTZEIT</Text>
      {ranking.map((r) => (
        <View key={r.rank} style={[s.rankRow, {
          backgroundColor: r.isMe ? `${accent}0d` : theme.cardBg,
          borderColor: r.isMe ? `${accent}28` : theme.cardBorder,
        }]}>
          <Text style={[s.rankNum, { color: theme.dim }]}>#{r.rank}</Text>
          <TierDot tier={r.tier} />
          <Text style={[s.rankName, { color: theme.text }, r.isMe && { fontFamily: Fonts.bodyBd }]} numberOfLines={1}>
            {r.name}{r.isMe ? ' ' : ''}
            {r.isMe && <Text style={{ color: accent, fontSize: 9 }}>ICH</Text>}
          </Text>
          <Text style={[s.rankTime, { color: r.rank === 1 ? '#9333ea' : theme.text }]}>{r.time}</Text>
          <Text style={[s.rankDelta, { color: r.delta === '—' ? '#9333ea' : '#dc2626' }]}>{r.delta}</Text>
        </View>
      ))}
    </View>
  )
}

const SLIDES = ['Meine Bests', 'Part 1', 'Part 2', 'Wochenranking']

function Carousel({ bests, weeklyRanking, accent, theme }: {
  bests: PersonalBests; weeklyRanking: WeeklyRankRow[]; accent: string; theme: Theme
}) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const userInteracted = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (!userInteracted.current) {
        setCurrentSlide(cs => {
          const next = (cs + 1) % SLIDES.length
          scrollRef.current?.scrollTo({ x: next * CARD_W, animated: true })
          return next
        })
      }
      userInteracted.current = false
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  const handleScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W)
    setCurrentSlide(idx)
    userInteracted.current = true
  }

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * CARD_W, animated: true })
    setCurrentSlide(i)
    userInteracted.current = true
  }

  const b = bests
  const slides = [
    <SlideBests key="bests" eyebrow="GESAMT"
      time={b.gesamt.time} airtime={b.gesamt.airtime} speed={b.gesamt.speed} gforce={b.gesamt.gforce}
      rank={b.gesamt.rank} rankOf={b.gesamt.rankOf} accent={accent} theme={theme} />,
    <SlideBests key="p1" eyebrow="PART 1 · 680m"
      time={b.p1.time} airtime={b.p1.airtime} speed={b.p1.speed} gforce={b.p1.gforce}
      rank={b.p1.rank} rankOf={b.p1.rankOf} accent={accent} theme={theme} />,
    <SlideBests key="p2" eyebrow="PART 2 · 520m"
      time={b.p2.time} airtime={b.p2.airtime} speed={b.p2.speed} gforce={b.p2.gforce}
      rank={b.p2.rank} rankOf={b.p2.rankOf} accent={accent} theme={theme} />,
    <SlideWeeklyRanking key="ranking" ranking={weeklyRanking} accent={accent} theme={theme} />,
  ]

  return (
    <GlassCard style={s.carouselCard} padding={0}>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={{ width: CARD_W }}
      >
        {slides.map((slideEl, i) => (
          <View key={i} style={{ width: CARD_W }}>{slideEl}</View>
        ))}
      </ScrollView>
      <View style={s.dotsRow}>
        <Text style={[s.dotsLabel, { color: theme.dim }]}>{SLIDES[currentSlide]}</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[s.dot, i === currentSlide && { width: 18, backgroundColor: accent }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </GlassCard>
  )
}

function DayRow({ day, expanded, onToggle, accent, theme }: {
  day: DaySession; expanded: boolean; onToggle: () => void; accent: string; theme: Theme
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={onToggle}
        style={[s.dayRow, {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }, expanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.dayLabel, { color: theme.text }]}>{day.label}</Text>
          <Text style={[s.dayRuns, { color: theme.dim }]}>{day.runs} Runs</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.dayTime, { color: accent }]}>{day.bestRun}</Text>
          <Text style={[s.dayAir, { color: theme.muted }]}>✦ {day.bestAirtime}</Text>
        </View>
        <Text style={[s.dayChevron, { color: theme.dim }, expanded && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
      </TouchableOpacity>
      {expanded && (
        <GlassCard style={s.dayExpanded} padding={12}>
          <Text style={[s.chartLabel, { color: theme.dim }]}>Airtime pro Run (s)</Text>
          <MiniChart data={day.airtimeData} color={accent} />
          <Text style={[s.chartLabel, { color: theme.dim, marginTop: 12 }]}>Rundenzeiten (s) — niedriger = besser</Text>
          <MiniChart data={day.runTimeData} color="#60a5fa" />
        </GlassCard>
      )}
    </View>
  )
}

export default function DashboardScreen() {
  const { session } = useAuthStore()
  const { profile, bikeConfig } = useProfileStore()
  const { getSessionsWithRuns, getPersonalBests, getWeeklyStats, getWeeklyRanking, getActiveRiders } = useRunStore()
  const { theme, accent } = useTheme()

  const [daySessions, setDaySessions] = useState<DaySession[]>([])
  const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRankRow[]>([])
  const [bests, setBests] = useState<PersonalBests>({
    gesamt: { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
    p1:     { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
    p2:     { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
  })
  const [weeklyGoals, setWeeklyGoals] = useState({ distance: 0, airtime: 0, topSpeed: 0 })
  const [activeRiders, setActiveRiders] = useState<ActiveRider[]>([])
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [rankUpData, setRankUpData] = useState<{ newEmblem: EmblemDef; oldEmblem: EmblemDef } | null>(null)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const userId = session?.userId
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 850, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  const loadDashboard = useCallback(() => {
    if (!userId) return

    getSessionsWithRuns(userId).then((data) => {
      setDaySessions(data.map(({ session: s, runs }) => ({
        label: new Date(s.date).toLocaleDateString('de', { day: '2-digit', month: '2-digit' }),
        date: s.date,
        runs: runs.length,
        bestRun: fmtTime(runs.length ? Math.min(...runs.map(r => r.totalTime)) : null),
        bestAirtime: runs.length ? `${Math.max(...runs.map(r => r.maxAirtime)).toFixed(1)}s` : '—',
        airtimeData: runs.map(r => r.maxAirtime),
        runTimeData: runs.map(r => r.totalTime),
      })))
    })

    getPersonalBests(userId).then((pb) => {
      setBests({
        gesamt: { time: fmtTime(pb.totalTime), airtime: pb.maxAirtime?.toFixed(1) ?? '—', speed: pb.maxSpeed?.toFixed(0) ?? '—', gforce: pb.maxGForce?.toFixed(1) ?? '—', rank: '#—', rankOf: 0 },
        p1:     { time: fmtTime(pb.p1Time), airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
        p2:     { time: fmtTime(pb.p2Time), airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
      })
    })

    getWeeklyStats(userId).then(setWeeklyGoals)

    getWeeklyRanking(userId).then((ranking) => {
      setWeeklyRanking(ranking.map(r => ({
        rank: r.rank, name: r.username, tier: r.tier,
        time: fmtTime(r.totalTime), delta: r.delta, isMe: r.isMe,
      })))
    })
    getActiveRiders().then(setActiveRiders)
  }, [getPersonalBests, getSessionsWithRuns, getWeeklyRanking, getWeeklyStats, getActiveRiders, userId])

  useFocusEffect(useCallback(() => {
    setIsFocused(true)
    loadDashboard()
    return () => setIsFocused(false)
  }, [loadDashboard]))

  const visibleSessions = showAllSessions ? daySessions : daySessions.slice(0, SESSIONS_PREVIEW)
  const hasMore = daySessions.length > SESSIONS_PREVIEW
  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 1
  const xpProgress = xpProgressInLevel(xp)
  const username = profile?.username ?? '—'
  const resolvedBikeType = ((): 'hardtail' | 'enduro' | 'downhill' => {
    const t = bikeConfig?.bikeType as string | undefined
    if (t === 'enduro' || t === 'downhill' || t === 'hardtail') return t
    if (t === 'fully') return 'enduro'
    return 'hardtail'
  })()

  return (
    <GlassBackground>
      <AppHeader />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity + XP */}
        <View style={{ paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
              <Text style={[s.username, { color: theme.text }]}>{username}</Text>
              <Text style={[s.bikeTypeInline, { color: accent }]}>{resolvedBikeType.toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={[s.teamText, { color: theme.muted }]}>{profile?.team ?? 'Kein Team'}</Text>
              <View style={[s.levelBadge, { borderColor: `${accent}44`, backgroundColor: `${accent}1a` }]}>
                <Text style={[s.levelText, { color: accent }]}>LVL {level}</Text>
              </View>
            </View>
          </View>
          <XpBar
            accent={accent}
            isFocused={isFocused}
            onLevelUp={(newLevel) => { setLevelUpLevel(newLevel); setTimeout(() => setLevelUpLevel(null), 3000) }}
            onRankUp={(newEmblem, oldEmblem) => setRankUpData({ newEmblem, oldEmblem })}
          />
        </View>

        {/* REC — Primäre Aktion */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/(tabs)/sensor')}
          style={[s.recCard, { borderColor: accent, backgroundColor: `${accent}12` }]}
          activeOpacity={0.8}
        >
          <View style={s.recPulseWrap}>
            <Animated.View style={[s.recPulseRing, { backgroundColor: accent, opacity: pulseAnim }]} />
            <View style={[s.recDotLarge, { backgroundColor: accent }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.recCardLabel, { color: accent }]}>REC</Text>
            <Text style={[s.recCardSub, { color: theme.muted }]}>Run aufzeichnen</Text>
          </View>
          <Text style={{ fontFamily: Fonts.mono, fontSize: 16, color: accent }}>›</Text>
        </TouchableOpacity>

        {/* Trail Map Widget */}
        <TrailMapWidget onPress={() => router.push('/(app)/(tabs)/strecke')} />

        {/* Wochenziele */}
        <Text style={[s.sectionLabel, { color: accent }]}>Wochenziele</Text>
        <WeeklyGoals stats={weeklyGoals} accent={accent} theme={theme} />

        {/* Live-Trail-Widget */}
        <View style={{ marginTop: 16 }}>
          <LiveTrailWidget
            riders={activeRiders}
            accent={accent}
            theme={theme}
          />
        </View>

        {/* Bestleistungen Carousel */}
        <Text style={[s.sectionLabel, { color: accent, marginTop: 24 }]}>Bestleistungen</Text>
        <Carousel bests={bests} weeklyRanking={weeklyRanking} accent={accent} theme={theme} />

        {/* Letzte Sessions */}
        <Text style={[s.sectionLabel, { color: accent, marginTop: 24 }]}>Letzte Sessions</Text>
        {visibleSessions.map((day, i) => (
          <DayRow
            key={i} day={day}
            expanded={expandedDay === i}
            onToggle={() => setExpandedDay(expandedDay === i ? null : i)}
            accent={accent} theme={theme}
          />
        ))}

        {hasMore && (
          <TouchableOpacity
            onPress={() => setShowAllSessions(v => !v)}
            style={[s.showMoreBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
          >
            <Text style={[s.showMoreText, { color: theme.muted }]}>
              {showAllSessions ? 'Weniger anzeigen ▲' : `Alle ${daySessions.length} Sessions anzeigen ▼`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <LevelUpToast newLevel={levelUpLevel} accent={accent} />
      <RankUpModal
        visible={rankUpData != null}
        newEmblem={rankUpData?.newEmblem ?? null}
        oldEmblem={rankUpData?.oldEmblem ?? null}
        onDismiss={() => setRankUpData(null)}
      />
    </GlassBackground>
  )
}

const s = StyleSheet.create({
  sectionLabel: {
    fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 2.5,
    textTransform: 'uppercase', opacity: 0.9, marginBottom: 10,
  },
  username: { fontFamily: Fonts.bodyBd, fontSize: 20, fontWeight: '700' },
  bikeTypeInline: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  teamText: { fontFamily: Fonts.body, fontSize: 13, marginTop: 2 },
  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12,
  },
  recPulseWrap: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  recPulseRing: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13,
  },
  recDotLarge: { width: 13, height: 13, borderRadius: 7 },
  recCardLabel: { fontFamily: Fonts.mono, fontSize: 20, fontWeight: '700', letterSpacing: 3, lineHeight: 24 },
  recCardSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 1 },
  levelBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  levelText: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700' },
  levelName: { fontFamily: Fonts.bodyBd, fontSize: 16 },
  goalsRow: { flexDirection: 'row', gap: 8, marginBottom: 0 },
  goalCard: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingTop: 12, paddingHorizontal: 11, overflow: 'hidden',
  },
  goalLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 },
  goalValue: { fontFamily: Fonts.mono, fontSize: 22, fontWeight: '700', lineHeight: 24 },
  goalSub: { fontFamily: Fonts.body, fontSize: 11, marginBottom: 8 },
  goalBarTrack: { marginHorizontal: 2, height: 7, borderRadius: 99, overflow: 'hidden', marginBottom: 0 },
  goalBarFill: { height: '100%', borderRadius: 99 },
  goalPct: { fontFamily: Fonts.mono, fontSize: 11, fontWeight: '700', textAlign: 'right', paddingVertical: 4, letterSpacing: 0.5 },

  carouselCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 0 },
  slide: { padding: 16, paddingBottom: 12 },
  slideEyebrow: { fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 },

  statsRow3: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  statLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontFamily: Fonts.mono, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  statUnit: { fontFamily: Fonts.body, fontSize: 12 },

  bestTimeBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  bestTimeLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  bestTimeValue: { fontFamily: Fonts.mono, fontSize: 30, fontWeight: '700', lineHeight: 34 },
  bestTimeUnit: { fontFamily: Fonts.mono, fontSize: 13 },
  rankBadge: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  rankBadgeNum: { fontFamily: Fonts.mono, fontSize: 22, fontWeight: '700' },
  rankBadgeSub: { fontFamily: Fonts.body, fontSize: 11 },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    padding: 7, paddingHorizontal: 10, borderRadius: 9, marginBottom: 4,
    borderWidth: 1,
  },
  rankNum: { fontFamily: Fonts.mono, fontSize: 11, width: 18 },
  rankName: { flex: 1, fontFamily: Fonts.body, fontSize: 13 },
  rankTime: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700' },
  rankDelta: { fontFamily: Fonts.mono, fontSize: 11, width: 38, textAlign: 'right' },

  dotsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  dotsLabel: { fontFamily: Fonts.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  dot: { width: 5, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)' },

  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 11, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12,
  },
  dayLabel: { fontFamily: Fonts.bodyBd, fontSize: 15 },
  dayRuns: { fontFamily: Fonts.body, fontSize: 12, marginTop: 1 },
  dayTime: { fontFamily: Fonts.mono, fontSize: 15, fontWeight: '700' },
  dayAir: { fontFamily: Fonts.body, fontSize: 12, marginTop: 1 },
  dayChevron: { fontFamily: Fonts.body, fontSize: 14, marginLeft: 2 },
  dayExpanded: {
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 14,
  },
  chartLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },

  showMoreBtn: {
    alignItems: 'center', paddingVertical: 12, marginTop: 2,
    borderWidth: 1, borderRadius: 12,
  },
  showMoreText: { fontFamily: Fonts.bodyBd, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },

})
