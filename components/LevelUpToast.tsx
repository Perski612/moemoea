import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { Fonts } from '@/constants/theme'
import { getEmblemForLevel } from '@/lib/emblems'

interface Props {
  newLevel: number | null   // null = hidden
  accent: string
}

export function LevelUpToast({ newLevel, accent }: Props) {
  const slideY  = useRef(new Animated.Value(-80)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale   = useRef(new Animated.Value(0.9)).current
  const shimmer = useRef(new Animated.Value(0)).current
  const shimmerLoop = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (newLevel == null) {
      shimmerLoop.current?.stop()
      slideY.setValue(-80)
      opacity.setValue(0)
      scale.setValue(0.9)
      return
    }

    // Slide in + fade in
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0,   friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,   duration: 220, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1,   friction: 6, tension: 90, useNativeDriver: true }),
    ]).start()

    // Shimmer loop while visible
    shimmerLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
      Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
    ]))
    shimmerLoop.current.start()

    // Auto-dismiss after 2.4s
    const t = setTimeout(() => {
      shimmerLoop.current?.stop()
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0,   duration: 350, useNativeDriver: true }),
        Animated.timing(slideY,  { toValue: -60, duration: 350, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 0.92, duration: 350, useNativeDriver: true }),
      ]).start()
    }, 2400)

    return () => {
      clearTimeout(t)
      shimmerLoop.current?.stop()
    }
  }, [newLevel])

  if (newLevel == null) return null

  const emblem = getEmblemForLevel(newLevel)

  const glowOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] })
  const glowRadius  = shimmer.interpolate({ inputRange: [0, 1], outputRange: [12, 28] })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.container,
        {
          opacity,
          transform: [{ translateY: slideY }, { scale }],
        },
      ]}
    >
      <Animated.View style={[s.card, {
        borderColor: `${accent}55`,
        shadowColor: accent,
        shadowOpacity: glowOpacity,
        shadowRadius: glowRadius,
      }]}>
        <View style={s.left}>
          <Text style={[s.lvlUpLabel, { color: `${accent}99` }]}>LEVEL UP</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[s.lvlNum, { color: accent }]}>{newLevel}</Text>
            <Text style={[s.emblemName, { color: `${accent}bb` }]}>{emblem.name.toUpperCase()}</Text>
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
          <Text style={[s.badgeText, { color: accent }]}>LVL</Text>
          <Text style={[s.badgeNum, { color: accent }]}>{newLevel}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f120d',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  left: { flex: 1 },
  lvlUpLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 2,
  },
  lvlNum: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
  },
  emblemName: {
    fontFamily: Fonts.bodyBd,
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700',
  },
  badgeNum: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
})
