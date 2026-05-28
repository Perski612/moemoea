import { useEffect, useRef } from 'react'
import { Animated, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Fonts } from '@/constants/theme'
import type { EmblemDef } from '@/lib/emblems'

interface Props {
  visible: boolean
  newEmblem: EmblemDef | null
  oldEmblem: EmblemDef | null
  onDismiss: () => void
}

const N = 10
const ANGLES = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2)
const DISTS  = [52, 68, 58, 74, 62, 70, 54, 72, 60, 66]

export function RankUpModal({ visible, newEmblem, oldEmblem, onDismiss }: Props) {
  // All values — native driver only (no shadow/JS animations)
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const cardScale      = useRef(new Animated.Value(0.6)).current
  const cardOpacity    = useRef(new Animated.Value(0)).current
  const emblemScale    = useRef(new Animated.Value(0)).current
  const glowOpacity    = useRef(new Animated.Value(0)).current  // circle glow, native
  const ring1Rotate    = useRef(new Animated.Value(0)).current
  const ring2Rotate    = useRef(new Animated.Value(0)).current
  const textSlideY     = useRef(new Animated.Value(18)).current
  const textOpacity    = useRef(new Animated.Value(0)).current
  const rankSlideY     = useRef(new Animated.Value(22)).current
  const rankOpacity    = useRef(new Animated.Value(0)).current

  const particles = useRef(
    Array.from({ length: N }, () => ({
      tx:      new Animated.Value(0),
      ty:      new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0),
    }))
  ).current

  const glowLoopRef  = useRef<Animated.CompositeAnimation | null>(null)
  const ring1LoopRef = useRef<Animated.CompositeAnimation | null>(null)
  const ring2LoopRef = useRef<Animated.CompositeAnimation | null>(null)
  const timerRefs    = useRef<ReturnType<typeof setTimeout>[]>([])

  const stopAll = () => {
    glowLoopRef.current?.stop()
    ring1LoopRef.current?.stop()
    ring2LoopRef.current?.stop()
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []
  }

  const reset = () => {
    overlayOpacity.setValue(0)
    cardScale.setValue(0.6)
    cardOpacity.setValue(0)
    emblemScale.setValue(0)
    glowOpacity.setValue(0)
    ring1Rotate.setValue(0)
    ring2Rotate.setValue(0)
    textSlideY.setValue(18)
    textOpacity.setValue(0)
    rankSlideY.setValue(22)
    rankOpacity.setValue(0)
    particles.forEach(p => {
      p.tx.setValue(0); p.ty.setValue(0)
      p.opacity.setValue(0); p.scale.setValue(0)
    })
  }

  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms)
    timerRefs.current.push(t)
  }

  useEffect(() => {
    if (!visible) { stopAll(); reset(); return }

    // Overlay + card entrance
    Animated.timing(overlayOpacity, { toValue: 0.82, duration: 300, useNativeDriver: true }).start()
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start()

    // Emblem pop-in
    after(160, () => {
      Animated.spring(emblemScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start()
    })

    // Particles burst (native only)
    after(560, () => {
      const anims = particles.map((p, i) => {
        const angle = ANGLES[i]
        const dist  = DISTS[i]
        const tx = Math.sin(angle) * dist
        const ty = -Math.abs(Math.cos(angle)) * dist * 0.6 + Math.cos(angle) * dist * 0.4
        return Animated.parallel([
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(p.opacity, { toValue: 0, duration: 420, delay: 60, useNativeDriver: true }),
          ]),
          Animated.spring(p.scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
          Animated.timing(p.tx, { toValue: tx, duration: 520, useNativeDriver: true }),
          Animated.timing(p.ty, { toValue: ty, duration: 520, useNativeDriver: true }),
        ])
      })
      Animated.parallel(anims).start()
    })

    // Glow pulse loop (native: opacity of a colored circle)
    after(360, () => {
      glowLoopRef.current = Animated.loop(Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.45, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.1,  duration: 1000, useNativeDriver: true }),
      ]))
      glowLoopRef.current.start()

      ring1LoopRef.current = Animated.loop(
        Animated.timing(ring1Rotate, { toValue: 1, duration: 4000, useNativeDriver: true })
      )
      ring1LoopRef.current.start()

      ring2LoopRef.current = Animated.loop(
        Animated.timing(ring2Rotate, { toValue: -1, duration: 6500, useNativeDriver: true })
      )
      ring2LoopRef.current.start()
    })

    // Text reveals
    after(380, () => {
      Animated.parallel([
        Animated.spring(textSlideY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start()
    })
    after(520, () => {
      Animated.parallel([
        Animated.spring(rankSlideY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
        Animated.timing(rankOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start()
    })

    // Auto-dismiss
    after(5500, handleDismiss)

    return stopAll
  }, [visible])

  const handleDismiss = () => {
    stopAll()
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.88, duration: 260, useNativeDriver: true }),
    ]).start(() => onDismiss())
  }

  if (!newEmblem) return null

  const color = newEmblem.tierColor
  const ring1Deg = ring1Rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ring2Deg = ring2Rotate.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] })
  const particleColors = [color, '#fff', `${color}cc`, color, '#fff', `${color}aa`, color, '#fff', `${color}cc`, color]

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />

      <View style={s.center}>
        <Animated.View style={[s.card, {
          borderColor: `${color}33`,
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
        }]}>

          {/* Emblem area */}
          <View style={s.emblemWrap}>
            {/* Particles */}
            {particles.map((p, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[s.particle, {
                  backgroundColor: particleColors[i],
                  opacity: p.opacity,
                  transform: [{ translateX: p.tx }, { translateY: p.ty }, { scale: p.scale }],
                }]}
              />
            ))}

            {/* Glow circle behind emblem (opacity-based, native driver) */}
            <Animated.View style={[s.glowCircle, { backgroundColor: color, opacity: glowOpacity }]} />

            {/* Outer ring */}
            <Animated.View style={[s.ring, s.ring2, {
              borderColor: `${color}30`,
              transform: [{ rotate: ring2Deg }],
            }]} />

            {/* Inner ring */}
            <Animated.View style={[s.ring, s.ring1, {
              borderColor: `${color}50`,
              borderTopColor: `${color}dd`,
              transform: [{ rotate: ring1Deg }],
            }]} />

            {/* Emblem */}
            <Animated.View style={{ transform: [{ scale: emblemScale }] }}>
              <Image source={newEmblem.source} style={s.emblemImg} resizeMode="contain" />
            </Animated.View>
          </View>

          {/* "RANG FREIGESCHALTET" + old rank */}
          <Animated.View style={[s.textBlock, { opacity: textOpacity, transform: [{ translateY: textSlideY }] }]}>
            <Text style={[s.eyebrow, { color: `${color}88` }]}>RANG FREIGESCHALTET</Text>
            {oldEmblem && (
              <Text style={[s.oldRank, { color: 'rgba(255,255,255,0.25)' }]}>
                {oldEmblem.name}  →
              </Text>
            )}
          </Animated.View>

          {/* New rank name */}
          <Animated.View style={[s.textBlock, { opacity: rankOpacity, transform: [{ translateY: rankSlideY }], marginTop: 4 }]}>
            <Text style={[s.rankName, { color }]}>{newEmblem.name}</Text>
          </Animated.View>

          <TouchableOpacity onPress={handleDismiss} style={s.dismissBtn} activeOpacity={0.7}>
            <Text style={[s.dismissText, { color: `${color}55` }]}>TIPPEN UM WEITERZUMACHEN</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const RING_BASE = 148

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#0e1209',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 30,
  },
  emblemWrap: {
    width: RING_BASE + 40,
    height: RING_BASE + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: RING_BASE - 10,
    height: RING_BASE - 10,
    borderRadius: 999,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ring1: {
    width: RING_BASE,
    height: RING_BASE,
    borderStyle: 'dashed',
  },
  ring2: {
    width: RING_BASE + 28,
    height: RING_BASE + 28,
    borderStyle: 'dotted',
  },
  emblemImg: {
    width: 110,
    height: 110,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 20,
  },
  eyebrow: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 3.5,
    marginBottom: 4,
  },
  oldRank: {
    fontFamily: Fonts.bodyBd,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  rankName: {
    fontFamily: Fonts.display,
    fontSize: 38,
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 42,
  },
  dismissBtn: {
    marginTop: 28,
    paddingVertical: 6,
  },
  dismissText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2.5,
  },
})
