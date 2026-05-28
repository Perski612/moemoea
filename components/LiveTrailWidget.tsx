import { useEffect, useRef, useState } from 'react'
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GlassCard } from '@/components/ui/GlassCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Fonts, Radius } from '@/constants/theme'
import type { Theme } from '@/hooks/useTheme'
import type { ActiveRider } from '@/types'

const MAX_VISIBLE = 6

type StackPos = { left: number; top: number; size: number; zIndex: number }

const SZ = 36  // uniform avatar size
const GAP_H = 20  // horizontal step between avatars
const GAP_V = 14  // vertical step between rows

// Bowling-pin / pyramid layout: all same size, staggered by position
const STACK_POSITIONS: StackPos[][] = [
  [],
  // 1: single
  [{ left: 0, top: 0, size: SZ, zIndex: 1 }],
  // 2: side by side
  [
    { left: 0,       top: 0, size: SZ, zIndex: 2 },
    { left: GAP_H,   top: 0, size: SZ, zIndex: 1 },
  ],
  // 3: 2 back + 1 front center
  [
    { left: 0,         top: 0,       size: SZ, zIndex: 1 },
    { left: GAP_H,     top: 0,       size: SZ, zIndex: 2 },
    { left: GAP_H / 2, top: GAP_V,   size: SZ, zIndex: 3 },
  ],
  // 4: 2x2
  [
    { left: 0,       top: 0,       size: SZ, zIndex: 1 },
    { left: GAP_H,   top: 0,       size: SZ, zIndex: 2 },
    { left: 0,       top: GAP_V,   size: SZ, zIndex: 3 },
    { left: GAP_H,   top: GAP_V,   size: SZ, zIndex: 4 },
  ],
  // 5: 3 back + 2 front
  [
    { left: 0,         top: 0,       size: SZ, zIndex: 1 },
    { left: GAP_H,     top: 0,       size: SZ, zIndex: 2 },
    { left: GAP_H * 2, top: 0,       size: SZ, zIndex: 3 },
    { left: GAP_H / 2, top: GAP_V,   size: SZ, zIndex: 4 },
    { left: GAP_H * 3 / 2, top: GAP_V, size: SZ, zIndex: 5 },
  ],
  // 6: 3+3
  [
    { left: 0,         top: 0,       size: SZ, zIndex: 1 },
    { left: GAP_H,     top: 0,       size: SZ, zIndex: 2 },
    { left: GAP_H * 2, top: 0,       size: SZ, zIndex: 3 },
    { left: 0,         top: GAP_V,   size: SZ, zIndex: 4 },
    { left: GAP_H,     top: GAP_V,   size: SZ, zIndex: 5 },
    { left: GAP_H * 2, top: GAP_V,   size: SZ, zIndex: 6 },
  ],
]
const STACK_SIZE = [
  { w: 0,              h: 0          },
  { w: SZ,             h: SZ         },
  { w: SZ + GAP_H,     h: SZ         },
  { w: SZ + GAP_H,     h: SZ + GAP_V },
  { w: SZ + GAP_H,     h: SZ + GAP_V },
  { w: SZ + GAP_H * 2, h: SZ + GAP_V },
  { w: SZ + GAP_H * 2, h: SZ + GAP_V },
]

const PHRASES = {
  low:  ['Jemand reißt grade Runs', 'Ein paar sind draußen am shredden', 'Trail wird grade warmgefahren'],
  mid:  ['Die Crew schickt Runs', 'Heute ist was los auf dem Trail', 'Gerade richtig Betrieb'],
  high: ['Trail brennt heute lichterloh 🔥', 'Vollgas-Session läuft gerade', 'Fettes Sessioning — komm raus!'],
  none: ['Trail schläft gerade — sei der Erste'],
} as const

function pickPhrase(count: number): string {
  const key = count === 0 ? 'none' : count <= 3 ? 'low' : count <= 6 ? 'mid' : 'high'
  const pool = PHRASES[key] as readonly string[]
  return pool[Math.floor(Math.random() * pool.length)]
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = (secs % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

function fmtAgo(isoTimestamp: string): string {
  const mins = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 60_000)
  if (mins < 1) return 'gerade eben'
  return `vor ${mins} Min`
}

function TierDot({ tier }: { tier: string }) {
  const color = ({ rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' } as Record<string, string>)[tier] ?? '#aaa'
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
}

type Props = {
  riders: ActiveRider[]
  accent: string
  theme: Theme
}

export function LiveTrailWidget({ riders, accent, theme }: Props) {
  const [expanded, setExpanded] = useState(false)
  const pulse = useRef(new Animated.Value(1)).current
  const isActive = riders.length > 0
  const bucket = riders.length === 0 ? 'none' : riders.length <= 3 ? 'low' : riders.length <= 6 ? 'mid' : 'high'
  const phraseRef = useRef(pickPhrase(riders.length))
  const lastBucket = useRef(bucket)
  if (lastBucket.current !== bucket) {
    lastBucket.current = bucket
    phraseRef.current = pickPhrase(riders.length)
  }
  const phrase = phraseRef.current

  useEffect(() => {
    if (!isActive) { pulse.setValue(1); return }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.9, duration: 1300, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [isActive, pulse])

  const visible = riders.slice(0, MAX_VISIBLE)
  const overflow = riders.length - MAX_VISIBLE

  return (
    <View>
      <GlassCard padding={0} style={[s.card, !isActive && { opacity: 0.65 }]}>
        <TouchableOpacity
          onPress={() => isActive && setExpanded(v => !v)}
          activeOpacity={isActive ? 0.7 : 1}
          style={s.header}
        >
          {/* Pulse dot */}
          <View style={s.dotWrap}>
            {isActive ? (
              <Animated.View style={[s.dot, { backgroundColor: '#22c55e', opacity: pulse }]} />
            ) : (
              <View style={[s.dot, { backgroundColor: theme.cardBorder }]} />
            )}
          </View>

          {/* Phrase text */}
          <Text style={[s.phrase, { color: isActive ? theme.text : theme.dim }]} numberOfLines={1}>
            {phrase}
          </Text>

          {/* Stacked avatars — bowling-pin layout */}
          {isActive && (
            <View style={{ width: STACK_SIZE[visible.length].w, height: STACK_SIZE[visible.length].h }}>
              {visible.map((rider, i) => {
                const p = STACK_POSITIONS[visible.length][i]
                return (
                  <View key={rider.userId} style={{ position: 'absolute', left: p.left, top: p.top, zIndex: p.zIndex }}>
                    <UserAvatar userId={rider.userId} size={p.size} />
                  </View>
                )
              })}
              {/* accent must be a 6-digit hex — provided by useTheme which always returns hex */}
              {overflow > 0 && (
                <View style={[s.overflow, { backgroundColor: `${accent}22`, borderColor: `${accent}55`, position: 'absolute', right: -8, bottom: 0, zIndex: 5 }]}>
                  <Text style={[s.overflowTxt, { color: accent }]}>+{overflow}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Expanded rider list */}
        {isActive && expanded && (
          <View style={[s.body, { borderTopColor: theme.cardBorder }]}>
            {riders.map((rider) => (
              <View key={rider.userId} style={s.riderRow}>
                <UserAvatar userId={rider.userId} size={52} />
                <View style={s.riderInfo}>
                  <View style={s.riderNameRow}>
                    <Text style={[s.riderName, { color: theme.text }]}>{rider.username}</Text>
                    <TierDot tier={rider.tier} />
                  </View>
                  <Text style={[s.riderSub, { color: theme.muted }]}>
                    {fmtTime(rider.lastRun.totalTime)} · ✦ {rider.lastRun.maxAirtime.toFixed(1)}s · {fmtAgo(rider.lastRun.startedAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      {/* Glow border sits outside overflow:hidden so shadow isn't clipped */}
      {isActive && (
        <Animated.View
          pointerEvents="none"
          style={[s.glowBorder, { opacity: pulse }]}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  card: { overflow: 'hidden' },
  glowBorder: {
    position: 'absolute',
    top: -1, left: -1, right: -1, bottom: -1,
    borderRadius: Radius.lg + 1,
    borderWidth: 1,
    borderColor: '#22c55e',
    ...Platform.select({
      ios: { shadowColor: '#22c55e', shadowRadius: 5, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 } },
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 16,
  },
  dotWrap: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  phrase: { flex: 1, fontFamily: Fonts.body, fontSize: 15 },
  overflow: {
    marginLeft: -8, width: 24, height: 24,
    borderRadius: Radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  overflowTxt: { fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700' },
  body: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16, gap: 12 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riderInfo: { flex: 1 },
  riderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  riderName: { fontFamily: Fonts.bodyBd, fontSize: 14 },
  riderSub: { fontFamily: Fonts.mono, fontSize: 12, marginTop: 2 },
})
