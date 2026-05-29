import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, Ellipse, Path, Text as SvgText } from 'react-native-svg'
import { Fonts } from '@/constants/theme'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 32

// ── GPS → SVG coordinate mapping ──────────────────────────────────────────────
// Source: Neckartal GPX, 32 trackpoints (strecke.tsx)
// ViewBox: 340 × 130  |  PAD = 8
// x = 8 + (lon − 9.807626) / 0.004098 × 324
// y = 122 − (lat − 48.820618) / 0.002177 × 114
// Sector split at index 17; P17→P18 is inter-sector traversal (dashed)

const P1 =
  'M8.0,122.0 L13.3,119.6 L32.4,116.7 L29.5,114.2 L35.6,109.5 ' +
  'L38.7,101.3 L47.1,94.5 L59.2,86.1 L77.6,79.9 L105.3,74.4 ' +
  'L110.4,65.8 L103.2,61.8 L103.8,57.8 L119.7,54.4 L123.6,48.1 ' +
  'L113.7,36.1 L120.0,34.2 L136.7,32.7'

const LINK = 'M136.7,32.7 L212.1,33.6'

const P2 =
  'M212.1,33.6 L222.9,30.8 L223.4,25.6 L228.1,23.7 L243.4,25.5 ' +
  'L272.5,16.9 L265.3,11.2 L290.7,8.9 L302.9,11.9 L317.9,6.8 ' +
  'L324.4,7.2 L327.1,12.6 L330.2,11.4 L332.0,8.0'

// Terrain fill under P1 (adds slope/hillside feel)
const P1_FILL =
  'M8.0,122.0 L13.3,119.6 L32.4,116.7 L29.5,114.2 L35.6,109.5 ' +
  'L38.7,101.3 L47.1,94.5 L59.2,86.1 L77.6,79.9 L105.3,74.4 ' +
  'L110.4,65.8 L103.2,61.8 L103.8,57.8 L119.7,54.4 L123.6,48.1 ' +
  'L113.7,36.1 L120.0,34.2 L136.7,32.7 L136.7,130 L8.0,130 Z'

const C1 = '#a78bfa'  // P1 — purple (matches strecke.tsx)
const C2 = '#34d399'  // P2 — green  (matches strecke.tsx)

const CARD_H = Math.round(CARD_W * 130 / 340)

export function TrailMapWidget({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.85}>
      <Svg viewBox="0 0 340 130" width={CARD_W} height={CARD_H}>

        {/* Topographic concentric rings — terrain feel */}
        {[16, 34, 55, 79, 106].map(r => (
          <Ellipse
            key={r}
            cx={170} cy={78}
            rx={r} ry={r * 0.6}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth={0.8}
            fill="none"
          />
        ))}

        {/* P1 terrain fill */}
        <Path d={P1_FILL} fill={C1} fillOpacity={0.05} />

        {/* Glow halos */}
        <Path d={P1} stroke={C1} strokeWidth={8} strokeOpacity={0.09} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={P2} stroke={C2} strokeWidth={8} strokeOpacity={0.09} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Trail lines */}
        <Path d={P1} stroke={C1} strokeWidth={2} strokeOpacity={0.92} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={P2} stroke={C2} strokeWidth={2} strokeOpacity={0.92} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Inter-sector traversal (dashed) */}
        <Path d={LINK} stroke="rgba(255,255,255,0.16)" strokeWidth={1.2} strokeDasharray="5 5" fill="none" />

        {/* Start marker — P1 */}
        <Circle cx={8} cy={122} r={9} fill={C1} fillOpacity={0.13} />
        <Circle cx={8} cy={122} r={4.5} fill={C1} />

        {/* Sector-split marker */}
        <Circle cx={136.7} cy={32.7} r={3} fill="rgba(255,255,255,0.7)" />

        {/* Finish marker — P2 */}
        <Circle cx={332} cy={8} r={9} fill={C2} fillOpacity={0.13} />
        <Circle cx={332} cy={8} r={4.5} fill={C2} />

        {/* Sector labels */}
        <SvgText x={52} y={74} fill={C1} fontSize={8.5} opacity={0.6} fontWeight="bold" letterSpacing={1}>P1</SvgText>
        <SvgText x={247} y={34} fill={C2} fontSize={8.5} opacity={0.6} fontWeight="bold" letterSpacing={1}>P2</SvgText>

        {/* Trail name watermark */}
        <SvgText x={8} y={11} fill="rgba(255,255,255,0.18)" fontSize={7} letterSpacing={1.5}>NECKARTAL</SvgText>
      </Svg>

      <View style={s.footer}>
        <View style={s.legend}>
          <View style={[s.dot, { backgroundColor: C1 }]} />
          <Text style={s.legendText}>P1 · 680m</Text>
          <View style={[s.dot, { backgroundColor: C2, marginLeft: 10 }]} />
          <Text style={s.legendText}>P2 · 520m</Text>
        </View>
        <Text style={s.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    backgroundColor: '#06060e',
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
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
  arrow: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
})
