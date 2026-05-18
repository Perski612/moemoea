import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Animated, Image, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { AppHeader } from '@/components/ui/AppHeader'
import { Colors, Fonts } from '@/constants/theme'
import { useRunStore } from '@/stores/useRunStore'

type Rider = { name: string; time: string; delta: string; tier: string; fastest: boolean; isMe?: boolean }

const accent = Colors.accent
const PANEL_COMPACT = 0.47
const PANEL_EXPANDED = 0.88

// ── TRAIL DATA (image coords 1668×2157) ──────────────────────────────────────
// Sector split at the red tick marks in the photo ~(636, 700)

const P1_PATH =
  'M 752,47 L 725,130 L 710,200 L 706,275 ' +
  'L 718,338 L 703,385 L 718,440 L 703,490 ' +
  'L 716,540 L 702,585 L 663,655 L 636,700'

const P2_PATH =
  'M 636,700 L 600,790 L 560,880 L 530,960 ' +
  'L 500,1040 L 468,1120 L 435,1200 L 400,1280 ' +
  'L 365,1360 L 330,1440 L 298,1516 L 270,1585 ' +
  'L 248,1645 L 225,1700 L 205,1748 ' +
  'L 190,1778 L 215,1800 L 252,1808 L 278,1795 ' +
  'L 286,1768 L 270,1745 L 243,1738 L 215,1748 ' +
  'L 200,1770 L 200,1790 L 183,1793'

const SECTORS = [
  {
    id: 'P1',
    name: 'Part 1 — Oberer Trail',
    dist: '680m', descent: '62m',
    color: '#a78bfa',
    pathD: P1_PATH,
    labelX: 920, labelY: 250,
    jumpMarkers: [{ x: 712, y: 456, speed: '37 km/h', airtime: '1.4s', name: 'Kicker' }],
    riders: [
      { name: 'TrailKing_Max',   time: '42.8', delta: '—',    tier: 'veteran', fastest: true },
      { name: 'DirtQueen_Sara',  time: '43.5', delta: '+0.7', tier: 'rookie' },
      { name: 'GravelGuru',      time: '44.2', delta: '+1.4', tier: 'legend' },
      { name: 'MaxTrailblazer',  time: '44.9', delta: '+2.1', tier: 'rookie', isMe: true },
      { name: 'Ramp_Rider_Bene', time: '45.6', delta: '+2.8', tier: 'rookie' },
    ],
  },
  {
    id: 'P2',
    name: 'Part 2 — Unterer Trail',
    dist: '520m', descent: '48m',
    color: '#34d399',
    pathD: P2_PATH,
    labelX: 680, labelY: 1100,
    jumpMarkers: [{ x: 454, y: 1129, speed: '44 km/h', airtime: '1.9s', name: 'Sender' }],
    note: '↻ Loop-Sektion am Ende',
    riders: [
      { name: 'TrailKing_Max',   time: '31.4', delta: '—',    tier: 'veteran', fastest: true },
      { name: 'DirtQueen_Sara',  time: '31.9', delta: '+0.5', tier: 'rookie' },
      { name: 'MaxTrailblazer',  time: '32.6', delta: '+1.2', tier: 'rookie', isMe: true },
      { name: 'GravelGuru',      time: '33.1', delta: '+1.7', tier: 'legend' },
      { name: 'Ramp_Rider_Bene', time: '33.8', delta: '+2.4', tier: 'rookie' },
    ],
  },
]

const TIER_COLOR: Record<string, string> = { rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' }

// ── SECTOR DETAIL PANEL ───────────────────────────────────────────────────────

type SectorWithRiders = Omit<typeof SECTORS[0], 'riders'> & { riders: Rider[] }

function SectorPanel({
  sector,
  onClose,
  dragHandlers,
}: {
  sector: SectorWithRiders
  onClose: () => void
  dragHandlers: any
}) {
  return (
    <View style={p.panel}>
      {/* Handle */}
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }} {...dragHandlers}>
        <View style={p.handle} />
        <Text style={p.dragHint}>ziehen zum Vergrößern</Text>
      </View>

      {/* Sector header */}
      <View style={p.sectorHead}>
        <View style={[p.sectorBadge, { backgroundColor: `${sector.color}18`, borderColor: sector.color }]}>
          <Text style={[p.sectorBadgeText, { color: sector.color }]}>{sector.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.sectorName}>{sector.name}</Text>
          <Text style={p.sectorMeta}>{sector.dist} · ↓{sector.descent}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={p.closeBtn}>
          <Text style={{ color: Colors.muted, fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
        {/* Jump markers */}
        {sector.jumpMarkers.map((jmp, i) => (
          <View key={i} style={p.jumpChip}>
            <Text style={p.jumpArrow}>▲</Text>
            <View>
              <Text style={p.jumpName}>{jmp.name}</Text>
              <Text style={p.jumpStats}>{jmp.speed} · ✦ {jmp.airtime}</Text>
            </View>
          </View>
        ))}

        {/* Note */}
        {'note' in sector && sector.note && (
          <View style={p.note}>
            <Text style={p.noteText}>{sector.note}</Text>
          </View>
        )}

        {/* Timing header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={p.timingHead}>Sektor-Zeiten</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: Fonts.bodyBd, fontSize: 8, color: '#9333ea' }}>● BEST</Text>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 8, color: '#dc2626' }}>+DELTA</Text>
          </View>
        </View>

        {/* Rider rows */}
        {sector.riders.map((rider, i) => (
          <View key={i} style={[p.riderRow,
            rider.isMe ? { backgroundColor: `${accent}0d`, borderColor: `${accent}28` }
            : (rider.fastest ? { backgroundColor: 'rgba(147,51,234,0.08)', borderColor: 'rgba(147,51,234,0.2)' }
            : { backgroundColor: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' })
          ]}>
            <Text style={p.riderRank}>#{i + 1}</Text>
            <View style={[p.tierDot, { backgroundColor: rider.fastest ? '#9333ea' : (TIER_COLOR[rider.tier] ?? '#aaa') }]} />
            <Text style={[p.riderName, rider.isMe && { fontFamily: Fonts.bodyBd }]} numberOfLines={1}>
              {rider.name}
              {rider.isMe ? '  ' : ''}
            </Text>
            {rider.isMe && <Text style={{ fontFamily: Fonts.bodyBd, fontSize: 7, color: accent, marginRight: 4 }}>ICH</Text>}
            <Text style={[p.riderTime, { color: rider.fastest ? '#9333ea' : Colors.text }]}>{rider.time}s</Text>
            <Text style={[p.riderDelta, { color: rider.delta === '—' ? '#9333ea' : '#dc2626' }]}>{rider.delta}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// ── SCREEN ───────────────────────────────────────────────────────────────────

export default function StreckeScreen() {
  const [sel, setSel] = useState<string | null>(null)
  const { getLeaderboard } = useRunStore()
  const [p1Riders, setP1Riders] = useState<Rider[]>([])
  const [p2Riders, setP2Riders] = useState<Rider[]>([])
  const panelHeight = useRef(new Animated.Value(PANEL_COMPACT)).current
  const dragStartHeight = useRef(PANEL_COMPACT)

  const loadLeaderboards = useCallback(() => {
    getLeaderboard('time', 'p1', 5).then(entries => {
      const leader = entries[0]?.value ?? 0
      setP1Riders(entries.map((e, i) => ({
        name:    e.username,
        time:    e.value.toFixed(1),
        delta:   i === 0 ? '—' : `+${(e.value - leader).toFixed(1)}`,
        tier:    e.tier,
        fastest: i === 0,
      })))
    })
    getLeaderboard('time', 'p2', 5).then(entries => {
      const leader = entries[0]?.value ?? 0
      setP2Riders(entries.map((e, i) => ({
        name:    e.username,
        time:    e.value.toFixed(1),
        delta:   i === 0 ? '—' : `+${(e.value - leader).toFixed(1)}`,
        tier:    e.tier,
        fastest: i === 0,
      })))
    })
  }, [getLeaderboard])

  useFocusEffect(loadLeaderboards)

  useEffect(() => {
    Animated.spring(panelHeight, {
      toValue: sel ? PANEL_COMPACT : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start()
  }, [panelHeight, sel])

  const panelPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      panelHeight.stopAnimation((value) => {
        dragStartHeight.current = value
      })
    },
    onPanResponderMove: (_, gesture) => {
      const delta = -gesture.dy / 520
      const next = Math.min(Math.max(dragStartHeight.current + delta, PANEL_COMPACT), PANEL_EXPANDED)
      panelHeight.setValue(next)
    },
    onPanResponderRelease: (_, gesture) => {
      panelHeight.stopAnimation((value) => {
        const shouldExpand = gesture.vy < -0.35 || value > (PANEL_COMPACT + PANEL_EXPANDED) / 2
        const shouldCollapse = gesture.vy > 0.35 || value < (PANEL_COMPACT + PANEL_EXPANDED) / 2
        const target = shouldExpand && !shouldCollapse ? PANEL_EXPANDED : shouldCollapse ? PANEL_COMPACT : value
        Animated.spring(panelHeight, {
          toValue: target,
          useNativeDriver: false,
          friction: 8,
          tension: 90,
        }).start()
      })
    },
  }), [panelHeight])

  const sectorsWithRiders: SectorWithRiders[] = SECTORS.map(s => ({
    ...s,
    riders: s.id === 'P1' ? p1Riders : p2Riders,
  }))

  const sectorData = sectorsWithRiders.find(s => s.id === sel)
  const totalDist = SECTORS.reduce((sum, s) => sum + parseInt(s.dist), 0)

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader />
      <View style={{ flex: 1, flexDirection: 'column' }}>

        {/* Trail header */}
        <View style={s.trailHeader}>
          <Text style={s.eyebrow}>Streckenanalyse</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.trailTitle}>MOE MOEA Trails</Text>
              <Text style={s.trailSub}>Neckartal · {totalDist}m · 2 Parts</Text>
            </View>
            <View style={s.bestBox}>
              <Text style={s.bestLabel}>STRECKE BEST</Text>
              <Text style={[s.bestTime, { color: accent }]}>01:14.2</Text>
            </View>
          </View>
        </View>

        {/* Map */}
        <View style={{ flex: 1, margin: 10, marginTop: 0, borderRadius: 18, backgroundColor: '#f5f4f0', overflow: 'hidden' }}>
          <Image
            source={require('@/assets/trail.png')}
            style={{ flex: 1, width: '100%' }}
            resizeMode="contain"
          />

          {/* Sector detail panel */}
          {sectorData && (
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: panelHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }}
            >
              <SectorPanel
                sector={sectorData}
                dragHandlers={panelPanResponder.panHandlers}
                onClose={() => setSel(null)}
              />
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  trailHeader: { padding: 10, paddingHorizontal: 16, paddingBottom: 8 },
  eyebrow: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 2.5, color: accent, textTransform: 'uppercase', marginBottom: 5, opacity: 0.9 },
  trailTitle: { fontFamily: Fonts.bodyBd, fontSize: 20, color: Colors.text, lineHeight: 24 },
  trailSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  bestBox: {
    backgroundColor: '#0e0c09', borderRadius: 8, padding: 5, paddingHorizontal: 11,
    alignItems: 'flex-end', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  bestLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.dim, letterSpacing: 1 },
  bestTime: { fontFamily: Fonts.mono, fontSize: 15, fontWeight: '700', marginTop: 1 },
})

const p = StyleSheet.create({
  panel: {
    flex: 1, backgroundColor: Colors.bg,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#000', shadowRadius: 20, shadowOpacity: 0.7, shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  handle: { width: 36, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)' },
  dragHint: { fontFamily: Fonts.body, fontSize: 9, color: Colors.dim, marginTop: 5 },
  sectorHead: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    padding: 4, paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  sectorBadge: {
    width: 36, height: 36, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  sectorBadgeText: { fontFamily: Fonts.mono, fontSize: 12, fontWeight: '700' },
  sectorName: { fontFamily: Fonts.bodyBd, fontSize: 15, color: Colors.text, lineHeight: 18 },
  sectorMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  closeBtn: {
    width: 28, height: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 7, alignItems: 'center', justifyContent: 'center',
  },

  jumpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(251,191,36,0.08)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
    borderRadius: 22, padding: 5, paddingHorizontal: 12, marginBottom: 10, alignSelf: 'flex-start',
  },
  jumpArrow: { color: '#fbbf24', fontSize: 13 },
  jumpName: { fontFamily: Fonts.bodyBd, fontSize: 11, color: '#fbbf24', letterSpacing: 0.5 },
  jumpStats: { fontFamily: Fonts.mono, fontSize: 13, color: 'rgba(251,191,36,0.75)', marginTop: 1 },

  note: {
    marginBottom: 10, padding: 7, paddingHorizontal: 11,
    backgroundColor: 'rgba(52,211,153,0.06)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)',
    borderRadius: 9,
  },
  noteText: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(52,211,153,0.8)' },

  timingHead: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 2, color: Colors.dim, textTransform: 'uppercase', fontWeight: '700' },

  riderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    padding: 7, paddingHorizontal: 9, borderRadius: 10, marginBottom: 4,
    borderWidth: 1,
  },
  riderRank: { fontFamily: Fonts.mono, width: 17, fontSize: 11, color: Colors.dim, textAlign: 'center' },
  tierDot: { width: 7, height: 7, borderRadius: 3.5 },
  riderName: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  riderTime: { fontFamily: Fonts.mono, fontSize: 15, fontWeight: '700' },
  riderDelta: { fontFamily: Fonts.mono, fontSize: 12, width: 42, textAlign: 'right' },
})
