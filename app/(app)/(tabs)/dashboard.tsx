import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { useFocusEffect } from 'expo-router'
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg'
import { AppHeader } from '@/components/ui/AppHeader'
import { Colors, Fonts } from '@/constants/theme'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRunStore } from '@/stores/useRunStore'
import { useProfileStore } from '@/stores/useProfileStore'
import type { Tier } from '@/types'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 32

const accent = Colors.accent

// ── TYPES ────────────────────────────────────────────────────────────────────

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

// ── HELPERS ──────────────────────────────────────────────────────────────────

const SESSIONS_PREVIEW = 4

function TierDot({ tier }: { tier: string }) {
  const c = { rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' }[tier] ?? '#aaa'
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
}

function StatCard({ label, value, unit, glowing }: { label: string; value: string; unit: string; glowing?: boolean }) {
  return (
    <View style={[s.statCard, glowing && { borderColor: `${accent}44`, backgroundColor: `${accent}08` }]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, glowing && { color: accent }]}>{value}</Text>
      <Text style={s.statUnit}>{unit}</Text>
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

// ── WEEKLY GOALS ─────────────────────────────────────────────────────────────

function WeeklyGoals({ stats }: { stats: { distance: number; airtime: number; topSpeed: number } }) {
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
          <View key={label} style={[s.goalCard, done && { borderColor: `${color}33`, backgroundColor: `${color}09` }]}>
            <Text style={[s.goalLabel, { color: done ? color : Colors.muted }]}>{label}</Text>
            <Text style={[s.goalValue, { color: done ? color : Colors.text }]}>{cur}</Text>
            <Text style={[s.goalSub, { color: done ? `${color}bb` : Colors.muted }]}>
              {suffix} · <Text style={{ color: Colors.dim }}>/{goal}</Text>
            </Text>
            <View style={s.goalBarTrack}>
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

// ── CAROUSEL SLIDES ───────────────────────────────────────────────────────────

function SlideBests({
  eyebrow, title, sub, time, airtime, speed, gforce, rank, rankOf,
}: {
  eyebrow: string; title: string; sub: string
  time: string; airtime: string; speed: string; gforce: string; rank: string; rankOf: number
}) {
  return (
    <View style={s.slide}>
      <Text style={s.slideEyebrow}>{eyebrow}</Text>
      <Text style={s.slideTitle}>{title}</Text>
      <Text style={s.slideSub}>{sub}</Text>
      {/* Highlight: best time */}
      <View style={s.bestTimeBox}>
        <View>
          <Text style={s.bestTimeLabel}>BESTE GESAMTZEIT</Text>
          <Text style={s.bestTimeValue}>{time}<Text style={s.bestTimeUnit}> min</Text></Text>
        </View>
        <View style={s.rankBadge}>
          <Text style={s.rankBadgeNum}>{rank}</Text>
          <Text style={s.rankBadgeSub}>von {rankOf}</Text>
        </View>
      </View>
      <View style={s.statsRow3}>
        <StatCard label="AIRTIME" value={airtime} unit="s" glowing />
        <StatCard label="TOP-SPEED" value={speed} unit="km/h" />
        <StatCard label="G-KRAFT" value={gforce} unit="g" />
      </View>
    </View>
  )
}

function SlideWeeklyRanking({ ranking }: { ranking: WeeklyRankRow[] }) {
  return (
    <View style={s.slide}>
      <Text style={s.slideEyebrow}>WOCHENRANKING — GESAMTZEIT</Text>
      {ranking.map((r) => (
        <View key={r.rank} style={[s.rankRow, r.isMe && { backgroundColor: `${accent}0d`, borderColor: `${accent}28` }]}>
          <Text style={s.rankNum}>#{r.rank}</Text>
          <TierDot tier={r.tier} />
          <Text style={[s.rankName, r.isMe && { fontFamily: Fonts.bodyBd }]} numberOfLines={1}>
            {r.name}{r.isMe ? ' ' : ''}
            {r.isMe && <Text style={{ color: accent, fontSize: 9 }}>ICH</Text>}
          </Text>
          <Text style={[s.rankTime, r.rank === 1 && { color: '#9333ea' }]}>{r.time}</Text>
          <Text style={[s.rankDelta, { color: r.delta === '—' ? '#9333ea' : '#dc2626' }]}>{r.delta}</Text>
        </View>
      ))}
    </View>
  )
}

const SLIDES = ['Meine Bests', 'Part 1', 'Part 2', 'Wochenranking']

// ── CAROUSEL ─────────────────────────────────────────────────────────────────

function Carousel({ bests, weeklyRanking }: { bests: PersonalBests; weeklyRanking: WeeklyRankRow[] }) {
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
    <SlideBests key="bests"
      eyebrow="★ MEINE BESTLEISTUNGEN"
      title="MOE MOEA Trails — Gesamt"
      sub="Neckartal · Beste je gemessene Werte"
      time={b.gesamt.time} airtime={b.gesamt.airtime}
      speed={b.gesamt.speed} gforce={b.gesamt.gforce}
      rank={b.gesamt.rank} rankOf={b.gesamt.rankOf}
    />,
    <SlideBests key="p1"
      eyebrow="P1 — OBERER TRAIL · 680m · ↓62m"
      title="Part 1 Bestzeiten"
      sub="Bester Run insgesamt"
      time={b.p1.time} airtime={b.p1.airtime}
      speed={b.p1.speed} gforce={b.p1.gforce}
      rank={b.p1.rank} rankOf={b.p1.rankOf}
    />,
    <SlideBests key="p2"
      eyebrow="P2 — UNTERER TRAIL · 520m · Loop"
      title="Part 2 Bestzeiten"
      sub="Bester Run insgesamt"
      time={b.p2.time} airtime={b.p2.airtime}
      speed={b.p2.speed} gforce={b.p2.gforce}
      rank={b.p2.rank} rankOf={b.p2.rankOf}
    />,
    <SlideWeeklyRanking key="ranking" ranking={weeklyRanking} />,
  ]

  return (
    <View style={s.carouselCard}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={{ width: CARD_W }}
      >
        {slides.map((slideEl, i) => (
          <View key={i} style={{ width: CARD_W }}>
            {slideEl}
          </View>
        ))}
      </ScrollView>
      <View style={s.dotsRow}>
        <Text style={s.dotsLabel}>{SLIDES[currentSlide]}</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[s.dot, i === currentSlide && { width: 18, backgroundColor: accent }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )
}

// ── DAY SESSION ROW ───────────────────────────────────────────────────────────

function DayRow({ day, expanded, onToggle }: {
  day: DaySession; expanded: boolean; onToggle: () => void
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={onToggle}
        style={[s.dayRow, expanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.dayLabel}>{day.label}</Text>
          <Text style={s.dayRuns}>{day.runs} Runs</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.dayTime, { color: accent }]}>{day.bestRun}</Text>
          <Text style={s.dayAir}>✦ {day.bestAirtime}</Text>
        </View>
        <Text style={[s.dayChevron, expanded && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={s.dayExpanded}>
          <Text style={s.chartLabel}>Airtime pro Run (s)</Text>
          <MiniChart data={day.airtimeData} color={accent} />
          <Text style={[s.chartLabel, { marginTop: 12 }]}>Rundenzeiten (s) — niedriger = besser</Text>
          <MiniChart data={day.runTimeData} color="#60a5fa" />
        </View>
      )}
    </View>
  )
}

// ── SCREEN ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { session } = useAuthStore()
  const profile = useProfileStore(s => s.profile)
  const { getSessionsWithRuns, getPersonalBests, getWeeklyStats, getWeeklyRanking } = useRunStore()

  const [daySessions, setDaySessions] = useState<DaySession[]>([])
  const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRankRow[]>([])
  const [bests, setBests] = useState<PersonalBests>({
    gesamt: { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
    p1:     { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
    p2:     { time: '—', airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
  })
  const [weeklyGoals, setWeeklyGoals] = useState({ distance: 0, airtime: 0, topSpeed: 0 })
  const [tp, setTp] = useState(0)
  const tpMax = 4000

  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)

  const userId = session?.userId

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
        p1:     { time: fmtTime(pb.p1Time),    airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
        p2:     { time: fmtTime(pb.p2Time),    airtime: '—', speed: '—', gforce: '—', rank: '#—', rankOf: 0 },
      })
      setTp(Math.round((pb.maxAirtime ?? 0) * 100 + (pb.maxSpeed ?? 0) * 10))
    })

    getWeeklyStats(userId).then(setWeeklyGoals)

    getWeeklyRanking(userId).then((ranking) => {
      setWeeklyRanking(ranking.map(r => ({
        rank: r.rank, name: r.username, tier: r.tier,
        time: fmtTime(r.totalTime), delta: r.delta, isMe: r.isMe,
      })))
    })
  }, [getPersonalBests, getSessionsWithRuns, getWeeklyRanking, getWeeklyStats, userId])

  useFocusEffect(loadDashboard)

  const visibleSessions = showAllSessions ? daySessions : daySessions.slice(0, SESSIONS_PREVIEW)
  const hasMore = daySessions.length > SESSIONS_PREVIEW
  const level = Math.max(1, Math.floor(tp / 400) + 1)
  const username = profile?.username ?? '—'

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TP / Level bar */}
        <View style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={s.levelBadge}>
                <Text style={s.levelText}>LVL {level}</Text>
              </View>
              <Text style={s.levelName}>{username}</Text>
            </View>
            <Text style={s.tpText}>
              {tp.toLocaleString('de')}<Text style={{ color: accent }}>/{tpMax.toLocaleString('de')} TP</Text>
            </Text>
          </View>
          <View style={s.tpTrack}>
            <View style={[s.tpFill, { width: `${Math.min((tp / tpMax) * 100, 100)}%` as any }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={s.tpHint}>{tpMax - tp} TP bis LVL {level + 1}</Text>
            <Text style={s.tpHint}>Nächstes: Trail-Devil Badge</Text>
          </View>
        </View>

        {/* Weekly Goals */}
        <Text style={s.sectionLabel}>Wochenziele</Text>
        <WeeklyGoals stats={weeklyGoals} />

        {/* Carousel */}
        <Carousel bests={bests} weeklyRanking={weeklyRanking} />

        {/* Sessions */}
        <Text style={[s.sectionLabel, { marginTop: 4 }]}>Letzte Sessions</Text>
        {visibleSessions.map((day, i) => (
          <DayRow
            key={i}
            day={day}
            expanded={expandedDay === i}
            onToggle={() => setExpandedDay(expandedDay === i ? null : i)}
          />
        ))}

        {hasMore && (
          <TouchableOpacity
            onPress={() => setShowAllSessions(v => !v)}
            style={s.showMoreBtn}
          >
            <Text style={s.showMoreText}>
              {showAllSessions ? 'Weniger anzeigen ▲' : `Alle ${daySessions.length} Sessions anzeigen ▼`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BD = 'rgba(255,255,255,0.11)'

const s = StyleSheet.create({
  sectionLabel: {
    fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 2.5,
    color: accent, textTransform: 'uppercase', opacity: 0.9, marginBottom: 10,
  },

  // TP bar
  levelBadge: {
    backgroundColor: `${accent}1a`, borderWidth: 1, borderColor: `${accent}44`,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  levelText: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700', color: accent },
  levelName: { fontFamily: Fonts.bodyBd, fontSize: 16, color: Colors.text },
  tpText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.muted },
  tpTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' },
  tpFill: {
    height: '100%', backgroundColor: accent, borderRadius: 99,
    shadowColor: accent, shadowRadius: 6, shadowOpacity: 0.4,
  },
  tpHint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.dim },

  // Weekly goals
  goalsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  goalCard: {
    flex: 1, backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BD, borderRadius: 12,
    paddingTop: 12, paddingHorizontal: 11, overflow: 'hidden',
  },
  goalLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 },
  goalValue: { fontFamily: Fonts.mono, fontSize: 22, fontWeight: '700', color: Colors.text, lineHeight: 24 },
  goalSub: { fontFamily: Fonts.body, fontSize: 11, marginBottom: 8 },
  goalBarTrack: { marginHorizontal: 2, height: 7, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: 0 },
  goalBarFill: { height: '100%', borderRadius: 99 },
  goalPct: { fontFamily: Fonts.mono, fontSize: 11, fontWeight: '700', textAlign: 'right', paddingVertical: 4, letterSpacing: 0.5 },

  // Carousel
  carouselCard: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BD,
    borderRadius: 16, overflow: 'hidden', marginBottom: 14,
  },
  slide: { padding: 16, paddingBottom: 12 },
  slideEyebrow: { fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 2.5, color: accent, textTransform: 'uppercase', marginBottom: 4 },
  slideTitle: { fontFamily: Fonts.bodyBd, fontSize: 18, color: Colors.text },
  slideTitle14: { fontFamily: Fonts.bodyBd, fontSize: 15, color: Colors.text },
  slideSub: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.muted, marginTop: 2, marginBottom: 12 },

  statsRow2: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statsRow3: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: CARD_BD, borderRadius: 10,
    padding: 8, alignItems: 'center',
  },
  statLabel: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1, color: Colors.muted, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontFamily: Fonts.mono, fontSize: 20, fontWeight: '700', color: Colors.text, lineHeight: 24 },
  statUnit: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  // Personal bests slide
  bestTimeBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: `${accent}30`, borderRadius: 12,
    backgroundColor: `${accent}08`, padding: 12, marginBottom: 10,
  },
  bestTimeLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, color: Colors.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  bestTimeValue: { fontFamily: Fonts.mono, fontSize: 30, fontWeight: '700', color: accent, lineHeight: 34 },
  bestTimeUnit: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.muted },
  rankBadge: { alignItems: 'center', backgroundColor: `${accent}18`, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  rankBadgeNum: { fontFamily: Fonts.mono, fontSize: 22, fontWeight: '700', color: accent },
  rankBadgeSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  partBadge: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  partBadgeText: { fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700' },
  timeBox: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  timeBoxLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, color: Colors.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  timeBoxValue: { fontFamily: Fonts.mono, fontSize: 28, fontWeight: '700', color: Colors.text, lineHeight: 32 },
  timeBoxUnit: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.muted },
  timeDelta: { fontFamily: Fonts.mono, fontSize: 14, fontWeight: '700', color: '#dc2626' },
  timeVs: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  timeRecord: { fontFamily: Fonts.body, fontSize: 11, color: Colors.dim },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    padding: 7, paddingHorizontal: 10, borderRadius: 9, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: CARD_BD,
  },
  rankNum: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.dim, width: 18 },
  rankName: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  rankTime: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700', color: Colors.text },
  rankDelta: { fontFamily: Fonts.mono, fontSize: 11, width: 38, textAlign: 'right' },

  dotsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  dotsLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.dim, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  dot: { width: 5, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)' },

  // Day sessions
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 11, paddingHorizontal: 14,
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BD, borderRadius: 12,
  },
  dayLabel: { fontFamily: Fonts.bodyBd, fontSize: 15, color: Colors.text },
  dayRuns: { fontFamily: Fonts.body, fontSize: 12, color: Colors.dim, marginTop: 1 },
  dayTime: { fontFamily: Fonts.mono, fontSize: 15, fontWeight: '700' },
  dayAir: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },
  dayChevron: { fontFamily: Fonts.body, fontSize: 14, color: Colors.dim, marginLeft: 2 },
  dayExpanded: {
    backgroundColor: CARD_BG, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: CARD_BD, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    padding: 14,
  },
  chartLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5, color: Colors.dim, textTransform: 'uppercase', marginBottom: 6 },

  // Show more
  showMoreBtn: {
    alignItems: 'center', paddingVertical: 12, marginTop: 2,
    borderWidth: 1, borderColor: CARD_BD, borderRadius: 12,
    backgroundColor: CARD_BG,
  },
  showMoreText: {
    fontFamily: Fonts.bodyBd, fontSize: 13, letterSpacing: 1,
    color: Colors.muted, textTransform: 'uppercase',
  },
})
