import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Image } from 'react-native'
import Svg, {
  Defs, Pattern,
  Rect, Circle, Path, Line, Text as SvgText, G, Polygon
} from 'react-native-svg'
import { AppHeader } from '@/components/ui/AppHeader'
import { Colors, Fonts } from '@/constants/theme'
import { useRunStore } from '@/stores/useRunStore'

type Rider = { name: string; time: string; delta: string; tier: string; fastest: boolean; isMe?: boolean }

const accent = Colors.accent
const { height: SCREEN_H } = Dimensions.get('window')

// ── TRAIL DATA ────────────────────────────────────────────────────────────────

const P1_PATH =
  'M 241,8 ' +
  'C 238,42 234,75 232,105 ' +
  'C 230,119 229,127 229,134 ' +
  'C 232,138 236,142 237,144 ' +
  'C 238,146 228,155 220,159 ' +
  'C 212,163 210,167 212,171 ' +
  'C 214,175 222,178 224,183 ' +
  'C 226,187 219,191 213,195 ' +
  'C 207,199 203,203 204,208 ' +
  'C 205,213 213,217 215,221 ' +
  'C 217,225 208,229 202,232 ' +
  'C 196,234 195,235 195,236'

const P2_PATH =
  'M 195,236 ' +
  'C 200,241 202,244 202,245 ' +
  'C 202,246 193,257 191,260 ' +
  'C 189,263 197,273 200,276 ' +
  'C 203,279 191,290 174,295 ' +
  'C 161,302 154,304 154,306 ' +
  'C 142,312 131,322 128,333 ' +
  'C 112,348 97,353 97,356 ' +
  'C 85,365 74,371 71,371 ' +
  'C 67,373 61,382 59,390 ' +
  'C 58,396 67,403 81,407 ' +
  'C 89,409 94,405 95,400 ' +
  'C 96,395 89,389 79,387 ' +
  'C 69,385 59,387 51,390 ' +
  'C 43,393 32,405 19,411'

const FULL_PATH = P1_PATH + ' ' + P2_PATH

const SECTORS = [
  {
    id: 'P1',
    name: 'Part 1 — Oberer Trail',
    dist: '680m', descent: '62m',
    color: '#a78bfa',
    pathD: P1_PATH,
    labelX: 218, labelY: 131,
    jumpMarkers: [{ x: 225, y: 160, speed: '37 km/h', airtime: '1.4s', name: 'Kicker' }],
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
    labelX: 113, labelY: 318,
    jumpMarkers: [{ x: 74, y: 372, speed: '44 km/h', airtime: '1.9s', name: 'Sender' }],
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

function SectorPanel({ sector, onClose }: { sector: SectorWithRiders; onClose: () => void }) {
  return (
    <View style={p.panel}>
      {/* Handle */}
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <View style={p.handle} />
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

  useEffect(() => {
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
  }, [])

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

        {/* Map + Panel */}
        <View style={{ flex: 1, margin: 10, marginTop: 0, borderRadius: 18, backgroundColor: '#0f0d0a', overflow: 'hidden', position: 'relative' }}>
          <Svg
            viewBox="0 0 250 430"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            onPress={() => setSel(null)}
          >
            <Defs>
              <Pattern id="tgrid" width={22} height={22} patternUnits="userSpaceOnUse">
                <Path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth={0.5} />
              </Pattern>
            </Defs>

            {/* Grid background */}
            <Rect width={250} height={430} fill="url(#tgrid)" />

            {/* Dim trail shadow */}
            <Path d={FULL_PATH} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />

            {/* Sector paths */}
            {sectorsWithRiders.map(sector => {
              const isSel = sel === sector.id
              const isDimmed = sel && !isSel
              return (
                <G key={sector.id} onPress={(e) => { e.stopPropagation?.(); setSel(isSel ? null : sector.id) }}>
                  {/* Hit area */}
                  <Path d={sector.pathD} fill="none" stroke="transparent" strokeWidth={32} strokeLinecap="round" />
                  {/* Colored path */}
                  <Path
                    d={sector.pathD} fill="none"
                    stroke={sector.color}
                    strokeWidth={isSel ? 7.5 : 4.5}
                    strokeLinecap="round" strokeLinejoin="round"
                    opacity={isDimmed ? 0.14 : 0.9}
                  />
                  {/* Sector badge */}
                  <Circle cx={sector.labelX} cy={sector.labelY} r={14}
                    fill={isSel ? sector.color : '#0f0d0a'}
                    stroke={sector.color} strokeWidth={isSel ? 0 : 2}
                    opacity={isDimmed ? 0.1 : 1}
                  />
                  <SvgText
                    x={sector.labelX} y={sector.labelY + 4}
                    textAnchor="middle" fontSize={9} fontWeight="700"
                    fill={isSel ? '#000' : sector.color}
                    fontFamily={Fonts.mono}
                    opacity={isDimmed ? 0.1 : 1}
                  >{sector.id}</SvgText>
                </G>
              )
            })}

            {/* Part split markers */}
            <G opacity={sel ? 0.2 : 0.9}>
              <Line x1={189} y1={229} x2={200} y2={242} stroke="#cc2222" strokeWidth={3} strokeLinecap="round" />
              <Line x1={193} y1={231} x2={204} y2={244} stroke="#cc2222" strokeWidth={3} strokeLinecap="round" />
            </G>

            {/* Jump markers */}
            {sectorsWithRiders.map(sector =>
              sector.jumpMarkers.map((jmp, ji) => {
                const isDimmed = sel && sel !== sector.id
                return (
                  <G key={`${sector.id}-j${ji}`} opacity={isDimmed ? 0.06 : 0.92}>
                    <Polygon
                      points={`${jmp.x},${jmp.y - 7} ${jmp.x - 6},${jmp.y + 5} ${jmp.x + 6},${jmp.y + 5}`}
                      fill="#fbbf24"
                    />
                    <SvgText x={jmp.x + 10} y={jmp.y + 1} fontSize={7} fill="#fbbf24" fontFamily={Fonts.mono} fontWeight="700">
                      {jmp.speed}
                    </SvgText>
                    <SvgText x={jmp.x + 10} y={jmp.y + 10} fontSize={6} fill="rgba(251,191,36,0.5)" fontFamily={Fonts.mono}>
                      ✦ {jmp.airtime}
                    </SvgText>
                  </G>
                )
              })
            )}

            {/* Start */}
            <Circle cx={241} cy={8} r={9} fill="#0f0d0a" stroke={accent} strokeWidth={2.2} />
            <SvgText x={241} y={12.5} textAnchor="middle" fontSize={8} fill={accent} fontFamily={Fonts.mono} fontWeight="700">S</SvgText>

            {/* Finish */}
            <Rect x={9} y={404} width={20} height={16} rx={3} fill="#0f0d0a" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
            {[[0,0],[1,1],[0,2],[2,0],[2,2],[1,3]].map(([ci, ri], i) => (
              <Rect key={i} x={9 + ci * 5} y={404 + ri * 4} width={5} height={4} fill="rgba(255,255,255,0.5)" />
            ))}

            {/* My best time */}
            <Rect x={6} y={6} width={94} height={30} rx={7} fill="rgba(0,0,0,0.6)" />
            <SvgText x={12} y={16} fontSize={6.5} fill="rgba(255,255,255,0.3)" fontFamily={Fonts.mono} letterSpacing={1.5}>MEINE BEST</SvgText>
            <SvgText x={12} y={29} fontSize={13} fill={accent} fontFamily={Fonts.mono} fontWeight="700">01:22.5</SvgText>

            {/* Tap hint */}
            {!sel && (
              <SvgText x={125} y={422} textAnchor="middle" fontSize={8.5} fill="rgba(255,255,255,0.16)" fontFamily={Fonts.body}>
                Part antippen für Zeiten &amp; GPS-Speed
              </SvgText>
            )}
          </Svg>

          {/* Sector detail panel */}
          {sectorData && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '47%' }}>
              <SectorPanel sector={sectorData} onClose={() => setSel(null)} />
            </View>
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
