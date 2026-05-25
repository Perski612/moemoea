import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { useProfileStore } from '@/stores/useProfileStore'
import { xpProgressInLevel } from '@/lib/xp'
import { getEmblemForLevel } from '@/lib/emblems'
import type { EmblemDef } from '@/lib/emblems'
import { useTheme } from '@/hooks/useTheme'
import { Fonts } from '@/constants/theme'

interface Props {
  accent: string
  isFocused?: boolean
  onLevelUp?: (newLevel: number) => void
  onRankUp?: (newEmblem: EmblemDef, oldEmblem: EmblemDef) => void
}

const N_PARTICLES = 9

// Fan angles: spread upward (-100° to +100°)
const PARTICLE_ANGLES = Array.from({ length: N_PARTICLES }, (_, i) =>
  (-100 + (i / (N_PARTICLES - 1)) * 200) * (Math.PI / 180)
)
const PARTICLE_DISTS = [38, 52, 44, 60, 48, 56, 40, 58, 46]

export function XpBar({ accent, isFocused = false, onLevelUp, onRankUp }: Props) {
  const { profile, claimPendingXp } = useProfileStore()
  const { theme, isDark } = useTheme()

  const xp        = profile?.xp ?? 0
  const level     = profile?.level ?? 1
  const pendingXp = profile?.pendingXp ?? 0
  const progress  = xpProgressInLevel(xp)
  const fillAnim      = useRef(new Animated.Value(progress.fraction)).current
  const flashAnim     = useRef(new Animated.Value(0)).current
  const glowAnim      = useRef(new Animated.Value(0)).current
  const plusTranslate = useRef(new Animated.Value(0)).current
  const plusOpacity   = useRef(new Animated.Value(0)).current
  const plusScale     = useRef(new Animated.Value(0.8)).current
  const plusLeft      = useRef(new Animated.Value(0)).current

  // Level-up: particles
  const particles = useRef(
    Array.from({ length: N_PARTICLES }, () => ({
      tx:      new Animated.Value(0),
      ty:      new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0),
    }))
  ).current

  // Level-up: pill badge
  const pillScale   = useRef(new Animated.Value(0)).current
  const pillOpacity = useRef(new Animated.Value(0)).current
  const [pillLevel, setPillLevel]   = useState(0)
  const [showPill, setShowPill]     = useState(false)

  const [claimedAmount, setClaimedAmount] = useState(0)
  const [barWidth, setBarWidth]           = useState(0)
  const claimStarted = useRef(false)

  // Sync bar to current xp when no claim is in progress
  useEffect(() => {
    if (pendingXp > 0 || claimStarted.current) return
    fillAnim.setValue(progress.fraction)
  }, [xp, pendingXp])

  const handleBarLayout = (e: LayoutChangeEvent) =>
    setBarWidth(e.nativeEvent.layout.width)

  const burstLevelUp = useCallback((newLevel: number) => {
    // Reset particles
    particles.forEach(p => {
      p.tx.setValue(0); p.ty.setValue(0)
      p.opacity.setValue(0); p.scale.setValue(0)
    })

    // Fire particles in a fan upward
    const particleAnims = particles.map((p, i) => {
      const angle = PARTICLE_ANGLES[i]
      const dist  = PARTICLE_DISTS[i]
      const tx = Math.sin(angle) * dist
      const ty = -Math.abs(Math.cos(angle)) * dist - 8
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(p.opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 380, delay: 80, useNativeDriver: true }),
        ]),
        Animated.spring(p.scale,   { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
        Animated.timing(p.tx,      { toValue: tx, duration: 480, useNativeDriver: true }),
        Animated.timing(p.ty,      { toValue: ty, duration: 480, useNativeDriver: true }),
      ])
    })
    Animated.parallel(particleAnims).start()

    // Big glow burst
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 80,  useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.6, duration: 200, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0,   duration: 500, useNativeDriver: false }),
    ]).start()

    // LVL pill pop
    setPillLevel(newLevel)
    setShowPill(true)
    pillScale.setValue(0.4)
    pillOpacity.setValue(0)
    Animated.sequence([
      Animated.parallel([
        Animated.spring(pillScale,   { toValue: 1,   friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(pillOpacity, { toValue: 1,   duration: 180, useNativeDriver: true }),
      ]),
      Animated.delay(750),
      Animated.timing(pillOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setShowPill(false))

    onLevelUp?.(newLevel)
  }, [particles, glowAnim, pillScale, pillOpacity, onLevelUp])

  const runClaim = useCallback(async () => {
    if (claimStarted.current || pendingXp <= 0) return
    claimStarted.current = true

    const result = await claimPendingXp()
    if (!result) return

    const { claimed, levelUps } = result
    setClaimedAmount(claimed)

    const newProgress = xpProgressInLevel(xp + claimed)
    const fillEdgeX   = progress.fraction * barWidth
    plusLeft.setValue(Math.max(0, fillEdgeX - 28))

    // Glow on bar during fill
    if (levelUps === 0) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 150, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 700, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0,   duration: 400, useNativeDriver: false }),
      ]).start()
    }

    // +N TP floats up from fill edge
    plusTranslate.setValue(0)
    plusOpacity.setValue(0)
    plusScale.setValue(0.85)
    Animated.sequence([
      Animated.parallel([
        Animated.spring(plusScale,     { toValue: 1.05, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(plusOpacity,   { toValue: 1,    duration: 160, useNativeDriver: true }),
        Animated.timing(plusTranslate, { toValue: -28,  duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(plusOpacity,   { toValue: 0,   duration: 450, useNativeDriver: true }),
        Animated.timing(plusTranslate, { toValue: -46, duration: 450, useNativeDriver: true }),
      ]),
    ]).start()

    if (levelUps > 0) {
      // Check rank-up before animation
      const oldEmblem = getEmblemForLevel(level)
      const newEmblem = getEmblemForLevel(level + levelUps)
      const isRankUp  = newEmblem.tier !== oldEmblem.tier

      // 1. Fill to 100%
      Animated.timing(fillAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start(() => {
        // 2. Triple flash
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1,   duration: 80,  useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0.2, duration: 100, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0.9, duration: 80,  useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0,   duration: 220, useNativeDriver: true }),
        ]).start()

        // 3. Burst particles + pill (fires during flash)
        setTimeout(() => burstLevelUp(level + levelUps), 60)

        // 4. Reset + fill to new level
        setTimeout(() => {
          fillAnim.setValue(0)
          Animated.timing(fillAnim, {
            toValue: newProgress.fraction,
            duration: 700,
            useNativeDriver: false,
          }).start()
        }, 280)

        // 5. Rank-up modal after bar animation settles
        if (isRankUp) {
          setTimeout(() => onRankUp?.(newEmblem, oldEmblem), 1200)
        }
      })
    } else {
      Animated.timing(fillAnim, { toValue: newProgress.fraction, duration: 900, useNativeDriver: false }).start()
    }
  }, [pendingXp, xp, level, barWidth, progress.fraction, claimPendingXp,
      fillAnim, flashAnim, glowAnim, plusTranslate, plusOpacity, plusScale, plusLeft, burstLevelUp])

  useEffect(() => {
    if (pendingXp <= 0) { claimStarted.current = false; return }
    if (!isFocused || claimStarted.current || barWidth === 0) return
    const t = setTimeout(runClaim, 150)
    return () => clearTimeout(t)
  }, [pendingXp, isFocused, barWidth, runClaim])

  const trackBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const barGlow = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 24] })
  const barGlowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] })

  // Particle base x: spread around bar center
  const particleBaseX = barWidth * 0.5

  return (
    <View style={s.wrapper}>
      <View style={s.row}>
        <Text style={[s.label, { color: theme.muted }]}>Track Points</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.label, { color: accent }]}>
            {progress.current.toLocaleString('de-DE')} / {progress.needed.toLocaleString('de-DE')} TP
          </Text>
        </View>
      </View>

      <View style={s.barOuter}>
        {/* Particles — rendered behind pill, above bar */}
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[s.particle, {
              backgroundColor: i % 3 === 0 ? accent : i % 3 === 1 ? '#fff' : `${accent}cc`,
              left: particleBaseX + (((i % 3) - 1) * 14),
              opacity: p.opacity,
              transform: [{ translateX: p.tx }, { translateY: p.ty }, { scale: p.scale }],
            }]}
          />
        ))}

        {/* LVL pill */}
        {showPill && (
          <Animated.View
            pointerEvents="none"
            style={[s.pill, {
              left: barWidth / 2 - 36,
              backgroundColor: accent,
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            }]}
          >
            <Text style={[s.pillText, { color: '#000' }]}>LVL {pillLevel}</Text>
          </Animated.View>
        )}

        {/* Bar */}
        <Animated.View style={[s.trackWrap, {
          shadowColor: accent,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: barGlow,
          shadowOpacity: barGlowOpacity,
        }]}>
          <View style={[s.track, { backgroundColor: trackBg }]} onLayout={handleBarLayout}>
            <Animated.View style={[s.fill, {
              width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: accent,
            }]} />
            <Animated.View style={[s.fill, {
              position: 'absolute', width: '100%',
              backgroundColor: '#fff',
              opacity: flashAnim,
            }]} />
          </View>
        </Animated.View>

        {/* +N TP float */}
        {claimedAmount > 0 && (
          <Animated.Text style={[s.plusText, {
            color: accent,
            opacity: plusOpacity,
            transform: [{ translateX: plusLeft }, { translateY: plusTranslate }, { scale: plusScale }],
          }]}>
            +{claimedAmount.toLocaleString('de-DE')} TP
          </Animated.Text>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrapper:  { marginBottom: 16 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  label:    { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  barOuter:  { position: 'relative' },
  trackWrap: { borderRadius: 99 },
  track:     { height: 10, borderRadius: 99, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 99 },
  particle: {
    position: 'absolute',
    width: 5, height: 5,
    borderRadius: 99,
    bottom: 5,
  },
  pill: {
    position: 'absolute',
    bottom: 18,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 5,
    zIndex: 10,
  },
  pillText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  plusText: {
    fontFamily: Fonts.bodyBd, fontSize: 15, letterSpacing: 0.5,
    position: 'absolute', bottom: 14, left: 0,
  },
})
