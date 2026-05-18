import { useEffect, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AppHeader } from '@/components/ui/AppHeader'
import { UserAvatar } from '@/components/UserAvatar'
import { Colors, Fonts } from '@/constants/theme'
import { useRunStore } from '@/stores/useRunStore'
import type { Tier } from '@/types'

const accent = Colors.accent

type Entry = { rank: number; userId: string; user: string; tier: string; value: string; unit: string; bike: string; team: string; isMe?: boolean }

const MEDALS = ['#ffd700', '#c0c0c0', '#cd7f32']
const PODIUM_H = [76, 56, 44]
const PODIUM_ORDER = [1, 0, 2]

const SECTION_LABELS: Record<string, string> = { gesamt: 'Gesamt', p1: 'Part 1', p2: 'Part 2' }
const METRIC_LABELS: Record<string, string>  = { airtime: 'AIRTIME', gforce: 'G-KRAFT', speed: 'SPEED', style: 'STYLE' }

export default function LeaderboardScreen() {
  const { getLeaderboard } = useRunStore()
  const [section, setSection] = useState<'gesamt' | 'p1' | 'p2'>('gesamt')
  const [metric,  setMetric]  = useState<'airtime' | 'gforce' | 'speed' | 'style'>('airtime')
  const [data, setData]       = useState<Entry[]>([])

  useEffect(() => {
    const storeMetric = metric === 'style' ? 'time' : metric as 'airtime' | 'gforce' | 'speed'
    const UNITS: Record<string, string> = { airtime: 's', gforce: 'g', speed: 'km/h', style: 'pts' }
    getLeaderboard(storeMetric, section, 10).then((entries) => {
      setData(entries.map(e => ({
        rank:  e.rank,
        userId: e.userId,
        user:  e.username,
        tier:  e.tier as Tier,
        value: e.value.toFixed(metric === 'speed' ? 0 : 2),
        unit:  UNITS[metric] ?? '',
        bike:  '',
        team:  '',
      })))
    })
  }, [section, metric])

  const top3 = data.slice(0, 3)
  const rest  = data.slice(3)

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Page header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Rangliste</Text>
          <Text style={s.title}>MOE MOEA Trails</Text>
          <Text style={s.sub}>Neckartal · Mai 2026</Text>
        </View>

        {/* Section tabs: Gesamt / Part 1 / Part 2 */}
        <View style={s.sectionRow}>
          {Object.entries(SECTION_LABELS).map(([id, lbl]) => (
            <TouchableOpacity
              key={id}
              style={[s.sectionBtn, section === id && { backgroundColor: accent }]}
              onPress={() => setSection(id as 'gesamt' | 'p1' | 'p2')}
            >
              <Text style={[s.sectionText, { color: section === id ? '#000' : Colors.muted }]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric tabs: Airtime / G-Kraft / Speed / Style */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {Object.entries(METRIC_LABELS).map(([id, lbl]) => (
            <TouchableOpacity
              key={id}
              style={[s.tabBtn, metric === id && { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}
              onPress={() => setMetric(id as 'airtime' | 'gforce' | 'speed' | 'style')}
            >
              <Text style={[s.tabText, { color: metric === id ? accent : Colors.muted }]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Podium */}
        {top3.length > 0 && (
          <View style={s.podium}>
            {PODIUM_ORDER.map((pos, idx) => {
              const e = top3[pos]
              if (!e) return null
              const isGold = pos === 0
              return (
                <View key={pos} style={s.podiumCol}>
                  <UserAvatar userId={e.userId} size={isGold ? 50 : 42} />
                  <Text style={s.podiumName} numberOfLines={1}>{e.user}</Text>
                  <Text style={[s.podiumVal, { color: isGold ? accent : Colors.text, fontSize: isGold ? 15 : 12 }]}>
                    {e.value}<Text style={s.podiumUnit}> {e.unit}</Text>
                  </Text>
                  <View style={[s.podiumBlock, { height: PODIUM_H[idx], backgroundColor: `${MEDALS[pos]}1a`, borderColor: `${MEDALS[pos]}55` }]}>
                    <Text style={[s.podiumRank, { color: MEDALS[pos] }]}>{pos + 1}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Rest of list */}
        <View style={{ paddingHorizontal: 16 }}>
          {rest.map(e => (
            <View key={e.rank} style={[s.row, e.isMe && { backgroundColor: `${accent}0f`, borderColor: `${accent}33` }]}>
              <Text style={s.rowRank}>#{e.rank}</Text>
              <UserAvatar userId={e.userId} size={34} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.rowName, e.isMe && { fontFamily: Fonts.bodyBd }]}>{e.user}</Text>
                  {e.isMe && <Text style={[s.iTag, { color: accent }]}>ICH</Text>}
                </View>
                <Text style={s.rowBike}>{e.bike}</Text>
              </View>
              <Text style={[s.rowVal, { color: e.isMe ? accent : Colors.text }]}>
                {e.value}<Text style={s.rowUnit}> {e.unit}</Text>
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  )
}

const CARD_BD = 'rgba(255,255,255,0.10)'

const s = StyleSheet.create({
  header: { padding: 16, paddingBottom: 10 },
  eyebrow: { fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 2, color: accent, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontFamily: Fonts.bodyBd, fontSize: 22, color: Colors.text },
  sub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },

  // Section toggle (Gesamt / Part 1 / Part 2)
  sectionRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: CARD_BD, padding: 3, gap: 3,
  },
  sectionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9,
  },
  sectionText: { fontFamily: Fonts.bodyBd, fontSize: 13, letterSpacing: 0.5 },

  // Metric tabs
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  tabBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  tabText: { fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 1 },

  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8, paddingHorizontal: 20, paddingBottom: 22 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 5 },
  podiumName: { fontFamily: Fonts.bodyBd, fontSize: 11, color: Colors.text, textAlign: 'center' },
  podiumVal: { fontFamily: Fonts.mono, fontWeight: '700' },
  podiumUnit: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted },
  podiumBlock: {
    width: '100%', borderWidth: 1, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  podiumRank: { fontFamily: Fonts.mono, fontSize: 20, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 9, paddingHorizontal: 12, marginBottom: 6,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: CARD_BD,
  },
  rowRank: { fontFamily: Fonts.mono, fontSize: 14, color: Colors.dim, width: 20, textAlign: 'center', fontWeight: '700' },
  rowName: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  iTag: { fontFamily: Fonts.bodyBd, fontSize: 10, letterSpacing: 1.5 },
  rowBike: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  rowVal: { fontFamily: Fonts.mono, fontSize: 16, fontWeight: '700' },
  rowUnit: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted },
})
