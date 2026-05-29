import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { Fonts } from '@/constants/theme'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 32
const CARD_H = Math.round(CARD_W * 130 / 340)

// Pre-computed SVG path — Neckartal GPX, 32 trackpoints
// ViewBox 340×130 | PAD 8
// x = 8 + (lon−9.807626)/0.004098 × 324
// y = 122 − (lat−48.820618)/0.002177 × 114
const TRAIL =
  'M8,122 L13,120 L32,117 L30,114 L36,110 L39,101 L47,95 L59,86 ' +
  'L78,80 L105,74 L110,66 L103,62 L104,58 L120,54 L124,48 L114,36 ' +
  'L120,34 L137,33 L212,34 L223,31 L223,26 L228,24 L243,26 L273,17 ' +
  'L265,11 L291,9 L303,12 L318,7 L324,7 L327,13 L330,11 L332,8'

export function TrailMapWidget({ accent, onPress }: { accent: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.82}>
      <Svg viewBox="0 0 340 130" width={CARD_W} height={CARD_H}>
        <Path
          d={TRAIL}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={8}   cy={122} r={4} fill={accent} />
        <Circle cx={332} cy={8}   r={4} fill={accent} />
      </Svg>

      <View style={s.footer}>
        <Text style={s.label}>NECKARTAL · 1.2 km</Text>
        <Text style={s.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    backgroundColor: '#111318',
    overflow: 'hidden',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.3)',
  },
  arrow: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
})
