import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { Fonts } from '@/constants/theme'

const TP_COIN = require('@/assets/avatar-parts/TP/TP_coin.png')
const ACCENT = '#99EA57'

export interface TpBreakdown {
  total: number
  base: number
  sensor: number
  pb: number
  daily: number
}

interface Props {
  visible: boolean
  breakdown: TpBreakdown
  onDismiss: () => void
}

const CHIPS: { key: keyof Omit<TpBreakdown, 'total'>; label: string; color: string }[] = [
  { key: 'base',   label: 'RUN',    color: ACCENT },
  { key: 'sensor', label: 'SENSOR', color: '#60a5fa' },
  { key: 'pb',     label: 'PB',     color: '#fbbf24' },
  { key: 'daily',  label: 'DAILY',  color: '#a78bfa' },
]

export function TpRewardModal({ visible, breakdown, onDismiss }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const cardOpacity    = useRef(new Animated.Value(0)).current
  const cardTranslate  = useRef(new Animated.Value(30)).current
  const coinScale      = useRef(new Animated.Value(0)).current
  const coinBobY       = useRef(new Animated.Value(0)).current
  const glowPulse      = useRef(new Animated.Value(0.3)).current
  const chipsOpacity   = useRef(new Animated.Value(0)).current
  const buttonOpacity  = useRef(new Animated.Value(0)).current

  const [count, setCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bobRef      = useRef<Animated.CompositeAnimation | null>(null)
  const glowRef     = useRef<Animated.CompositeAnimation | null>(null)

  const stopAll = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    bobRef.current?.stop()
    glowRef.current?.stop()
  }

  const resetAnims = () => {
    overlayOpacity.setValue(0)
    cardOpacity.setValue(0)
    cardTranslate.setValue(30)
    coinScale.setValue(0)
    coinBobY.setValue(0)
    glowPulse.setValue(0.3)
    chipsOpacity.setValue(0)
    buttonOpacity.setValue(0)
    setCount(0)
  }

  useEffect(() => {
    if (!visible) { stopAll(); resetAnims(); return }

    const { total } = breakdown

    Animated.timing(overlayOpacity, { toValue: 0.88, duration: 280, useNativeDriver: true }).start()

    // Card slides up
    Animated.parallel([
      Animated.timing(cardOpacity,   { toValue: 1, duration: 260, delay: 60, useNativeDriver: true }),
      Animated.spring(cardTranslate, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start()

    // Coin pop in
    Animated.spring(coinScale, { toValue: 1, friction: 5, tension: 70, delay: 120, useNativeDriver: true }).start(() => {
      bobRef.current = Animated.loop(Animated.sequence([
        Animated.timing(coinBobY, { toValue: -7, duration: 800, useNativeDriver: true }),
        Animated.timing(coinBobY, { toValue: 0,  duration: 800, useNativeDriver: true }),
      ]))
      bobRef.current.start()

      glowRef.current = Animated.loop(Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.85, duration: 950, useNativeDriver: false }),
        Animated.timing(glowPulse, { toValue: 0.2,  duration: 950, useNativeDriver: false }),
      ]))
      glowRef.current.start()
    })

    // Count up
    let current = 0
    const step = Math.max(1, Math.ceil(total / 50))
    intervalRef.current = setInterval(() => {
      current += step
      if (current >= total) { setCount(total); clearInterval(intervalRef.current!); intervalRef.current = null; return }
      setCount(current)
    }, 16)

    Animated.timing(chipsOpacity,  { toValue: 1, duration: 280, delay: 450, useNativeDriver: true }).start()
    Animated.timing(buttonOpacity, { toValue: 1, duration: 280, delay: 600, useNativeDriver: true }).start()

    return stopAll
  }, [visible])

  const handleCollect = () => {
    stopAll()
    Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onDismiss()
      router.navigate('/(app)/(tabs)/dashboard')
    })
  }

  const activeChips = CHIPS.filter(c => breakdown[c.key] > 0)

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />

      <View style={s.center}>
        <Animated.View style={[s.card, {
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslate }],
        }]}>

          {/* Number left, Coin right */}
          <View style={s.mainRow}>
            <View style={s.textCol}>
              <Text style={s.countNum}>+{count.toLocaleString('de-DE')}</Text>
              <Text style={s.countUnit}>TRACK POINTS</Text>
            </View>

            <Animated.View style={{
              transform: [{ translateY: coinBobY }, { scale: coinScale }],
            }}>
              <Animated.View style={{
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 28,
                shadowOpacity: glowPulse,
              }}>
                <Image source={TP_COIN} style={s.coin} resizeMode="contain" />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Breakdown chips */}
          {activeChips.length > 0 && (
            <Animated.View style={[s.chipsRow, { opacity: chipsOpacity }]}>
              {activeChips.map(chip => (
                <View key={chip.key} style={[s.chip, {
                  backgroundColor: `${chip.color}14`,
                  borderColor: `${chip.color}40`,
                }]}>
                  <Text style={[s.chipLabel, { color: `${chip.color}bb` }]}>{chip.label}</Text>
                  <Text style={[s.chipVal, { color: chip.color }]}>+{breakdown[chip.key]}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Button */}
          <Animated.View style={[s.btnWrap, { opacity: buttonOpacity }]}>
            <TouchableOpacity style={s.btn} onPress={handleCollect} activeOpacity={0.8}>
              <Text style={s.btnText}>EINSAMMELN  →</Text>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  coin: {
    width: 120,
    height: 120,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#171b14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${ACCENT}22`,
    paddingHorizontal: 20,
    paddingVertical: 32,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 36,
    elevation: 24,
    gap: 14,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
  },
  countNum: {
    fontFamily: Fonts.display,
    fontSize: 56,
    color: ACCENT,
    lineHeight: 58,
    letterSpacing: -1,
    textShadowColor: `${ACCENT}55`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  countUnit: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: `${ACCENT}55`,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipLabel: {
    fontFamily: Fonts.bodyBd,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  chipVal: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  btnWrap: {
    width: '100%',
  },
  btn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 13,
    letterSpacing: 2.5,
    color: '#0d1209',
    textTransform: 'uppercase',
  },
})
