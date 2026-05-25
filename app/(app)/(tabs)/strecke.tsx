import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Alert, Animated, Dimensions, Modal, PanResponder, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import MapView, { Circle as MapCircle, Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { AppHeader } from '@/components/ui/AppHeader'
import { GlassBackground } from '@/components/ui/GlassBackground'
import { Colors, Fonts } from '@/constants/theme'
import { useRunStore } from '@/stores/useRunStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { buildDefaultTrailRules, useTrailRulesStore } from '@/stores/useTrailRulesStore'
import { useTrailFeaturesStore } from '@/stores/useTrailFeaturesStore'
import { useTheme } from '@/hooks/useTheme'
import type { TrailRule, TrailFeature, FeatureType } from '@/types'

type Rider = { name: string; time: string; delta: string; tier: string; fastest: boolean; isMe?: boolean }
const PANEL_COMPACT = 0.47
const PANEL_EXPANDED = 0.88

// ── GPX TRAIL DATA — "Nur Trail.gpx", 32 trackpoints, komoot export ───────────
// Sector split: index 17 (elevation plateau + largest east jump)

const C1 = '#a78bfa'   // P1 — purple
const C2 = '#34d399'   // P2 — green

const GPS_COORDS = [
  { latitude: 48.820618, longitude: 9.807626 },
  { latitude: 48.820663, longitude: 9.807693 },
  { latitude: 48.820719, longitude: 9.807935 },
  { latitude: 48.820767, longitude: 9.807898 },
  { latitude: 48.820857, longitude: 9.807975 },
  { latitude: 48.821013, longitude: 9.808015 },
  { latitude: 48.821143, longitude: 9.808120 },
  { latitude: 48.821303, longitude: 9.808273 },
  { latitude: 48.821422, longitude: 9.808507 },
  { latitude: 48.821526, longitude: 9.808858 },
  { latitude: 48.821690, longitude: 9.808922 },
  { latitude: 48.821767, longitude: 9.808830 },
  { latitude: 48.821844, longitude: 9.808838 },
  { latitude: 48.821908, longitude: 9.809039 },
  { latitude: 48.822028, longitude: 9.809088 },
  { latitude: 48.822256, longitude: 9.808963 },
  { latitude: 48.822293, longitude: 9.809043 },
  { latitude: 48.822322, longitude: 9.809254 }, // index 17 — P1 end / P2 start
  { latitude: 48.822305, longitude: 9.810208 },
  { latitude: 48.822359, longitude: 9.810345 },
  { latitude: 48.822457, longitude: 9.810351 },
  { latitude: 48.822493, longitude: 9.810411 },
  { latitude: 48.822460, longitude: 9.810604 },
  { latitude: 48.822623, longitude: 9.810972 },
  { latitude: 48.822732, longitude: 9.810882 },
  { latitude: 48.822777, longitude: 9.811203 },
  { latitude: 48.822719, longitude: 9.811358 },
  { latitude: 48.822817, longitude: 9.811549 },
  { latitude: 48.822809, longitude: 9.811631 },
  { latitude: 48.822705, longitude: 9.811665 },
  { latitude: 48.822729, longitude: 9.811704 },
  { latitude: 48.822795, longitude: 9.811724 },
]

const SPLIT_IDX = 17
const P1_COORDS = GPS_COORDS.slice(0, SPLIT_IDX + 1)
const P2_COORDS = GPS_COORDS.slice(SPLIT_IDX)

const TRAIL_REGION = {
  latitude: 48.8217,
  longitude: 9.8097,
  latitudeDelta: 0.0042,
  longitudeDelta: 0.0055,
}

// ── FEATURE CONFIG ────────────────────────────────────────────────────────────

export const FEATURE_CONFIG: Record<FeatureType, { icon: string; label: string; color: string; desc: string }> = {
  jump:        { icon: '▲', label: 'JUMP',       color: '#fbbf24', desc: 'Kicker / Ramp' },
  sender:      { icon: '⚡', label: 'SENDER',     color: '#ef4444', desc: 'Road Gap / Big Send' },
  drop:        { icon: '▼', label: 'DROP',        color: '#a78bfa', desc: 'Drop Feature' },
  corner:      { icon: '↺', label: 'CORNER',      color: '#f97316', desc: 'Enge Kurve / Switchback' },
  berm:        { icon: '⌒', label: 'BERM',        color: '#06b6d4', desc: 'Bankkurve' },
  rock_garden: { icon: '◆', label: 'ROCKS',       color: '#d97706', desc: 'Steinfeld' },
}

// ── FEATURE MARKER ────────────────────────────────────────────────────────────

function FeatureMarker({
  feature, isAdmin, onDelete,
}: { feature: TrailFeature; isAdmin: boolean; onDelete: () => void }) {
  const cfg = FEATURE_CONFIG[feature.type]
  return (
    <Marker
      coordinate={{ latitude: feature.latitude, longitude: feature.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={isAdmin ? () =>
        Alert.alert(feature.name || cfg.label, cfg.desc, [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Löschen', style: 'destructive', onPress: onDelete },
        ]) : undefined
      }
    >
      <View style={fm.wrap}>
        <View style={[fm.badge, { backgroundColor: `${cfg.color}22`, borderColor: cfg.color }]}>
          <Text style={[fm.icon, { color: cfg.color }]}>{cfg.icon}</Text>
        </View>
        <View style={[fm.pill, { backgroundColor: cfg.color }]}>
          <Text style={fm.pillText}>{feature.name || cfg.label}</Text>
        </View>
        <View style={[fm.stem, { backgroundColor: cfg.color }]} />
      </View>
    </Marker>
  )
}

// ── PLACE FEATURE SHEET ───────────────────────────────────────────────────────

function PlaceFeatureSheet({
  visible, onClose, onConfirm,
}: {
  visible: boolean
  onClose: () => void
  onConfirm: (type: FeatureType, name: string) => void
}) {
  const [selectedType, setSelectedType] = useState<FeatureType>('jump')
  const [name, setName] = useState('')

  const handleConfirm = () => {
    onConfirm(selectedType, name.trim())
    setName('')
    setSelectedType('jump')
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pf.overlay}>
        <View style={pf.sheet}>
          <View style={pf.handle} />
          <Text style={pf.title}>Feature platzieren</Text>

          {/* Type grid */}
          <View style={pf.typeGrid}>
            {(Object.entries(FEATURE_CONFIG) as [FeatureType, typeof FEATURE_CONFIG[FeatureType]][]).map(([type, cfg]) => (
              <TouchableOpacity
                key={type}
                style={[pf.typeBtn, selectedType === type && { borderColor: cfg.color, backgroundColor: `${cfg.color}18` }]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[pf.typeIcon, { color: selectedType === type ? cfg.color : Colors.muted }]}>{cfg.icon}</Text>
                <Text style={[pf.typeLabel, { color: selectedType === type ? cfg.color : Colors.muted }]}>{cfg.label}</Text>
                <Text style={pf.typeDesc} numberOfLines={1}>{cfg.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name input */}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={FEATURE_CONFIG[selectedType].label}
            placeholderTextColor={Colors.dim}
            style={[pf.input, { borderColor: `${FEATURE_CONFIG[selectedType].color}55` }]}
          />

          <View style={pf.actions}>
            <TouchableOpacity style={pf.cancelBtn} onPress={onClose}>
              <Text style={pf.cancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pf.confirmBtn, { backgroundColor: FEATURE_CONFIG[selectedType].color }]}
              onPress={handleConfirm}
            >
              <Text style={pf.confirmText}>Setzen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── TRAIL MAP ─────────────────────────────────────────────────────────────────

function TrailMap({
  sel, onSelect, features, isAdmin, placeMode, onMapPress, onDeleteFeature,
}: {
  sel: string | null
  onSelect: (id: string) => void
  features: TrailFeature[]
  isAdmin: boolean
  placeMode: boolean
  onMapPress: (coord: { latitude: number; longitude: number }) => void
  onDeleteFeature: (id: string) => void
}) {
  const start = GPS_COORDS[0]
  const split = GPS_COORDS[SPLIT_IDX]
  const end   = GPS_COORDS[GPS_COORDS.length - 1]

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={TRAIL_REGION}
      mapType="satellite"
      showsUserLocation
      onPress={placeMode ? e => onMapPress(e.nativeEvent.coordinate) : undefined}
    >
      <Polyline coordinates={P1_COORDS} strokeColor={sel === 'P2' ? `${C1}55` : C1} strokeWidth={sel === 'P1' ? 5 : 3.5} tappable onPress={() => onSelect('P1')} />
      <Polyline coordinates={P2_COORDS} strokeColor={sel === 'P1' ? `${C2}55` : C2} strokeWidth={sel === 'P2' ? 5 : 3.5} tappable onPress={() => onSelect('P2')} />
      <Marker coordinate={start} title="START" pinColor="green" />
      <Marker coordinate={split} title="P1 / P2" pinColor="orange" />
      <Marker coordinate={end} title="FINISH" pinColor="red" />
      {features.map(f => (
        <FeatureMarker key={f.$id} feature={f} isAdmin={isAdmin} onDelete={() => onDeleteFeature(f.$id)} />
      ))}
    </MapView>
  )
}

const SECTORS = [
  {
    id: 'P1',
    name: 'Part 1 — Oberer Trail',
    dist: '680m', descent: '62m',
    color: '#a78bfa',
    jumpMarkers: [{ speed: '37 km/h', airtime: '1.4s', name: 'Kicker' }],
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
    jumpMarkers: [{ speed: '44 km/h', airtime: '1.9s', name: 'Sender' }],
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
  const { accent } = useTheme()
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

// ── ADMIN TRAIL RULES MODAL ───────────────────────────────────────────────────

type RuleForm = {
  startLat: string; startLon: string
  finishLat: string; finishLon: string
  startRadiusM: string; finishRadiusM: string
  minStartSpeedMs: string; directionToleranceDeg: string
}

function toRuleLike(rule: TrailRule | ReturnType<typeof buildDefaultTrailRules>[number]) {
  return rule
}

function AdminTrailRulesModal({ visible, onClose, userId }: { visible: boolean; onClose: () => void; userId: string }) {
  const { accent } = useTheme()
  const { rules, fetchRules, upsertRule } = useTrailRulesStore()
  const [lineId, setLineId] = useState<'p1' | 'p2'>('p1')
  const [saving, setSaving] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [form, setForm] = useState<RuleForm>({
    startLat: '48.820618', startLon: '9.807626',
    finishLat: '48.822322', finishLon: '9.809254',
    startRadiusM: '35', finishRadiusM: '35',
    minStartSpeedMs: '2.5', directionToleranceDeg: '75',
  })

  const defaults = useMemo(() => buildDefaultTrailRules(userId), [userId])
  const selected = toRuleLike(rules.find(r => r.lineId === lineId) ?? defaults.find(r => r.lineId === lineId)!)
  const testSamples = useMemo(() => {
    try { return JSON.parse(selected.testSamples || '[]') as { latitude: number; longitude: number; at: string }[] }
    catch { return [] }
  }, [selected.testSamples])

  useEffect(() => { if (visible) fetchRules().catch(() => undefined) }, [visible])

  useEffect(() => {
    setForm({
      startLat: String(selected.startLat), startLon: String(selected.startLon),
      finishLat: String(selected.finishLat), finishLon: String(selected.finishLon),
      startRadiusM: String(selected.startRadiusM), finishRadiusM: String(selected.finishRadiusM),
      minStartSpeedMs: String(selected.minStartSpeedMs), directionToleranceDeg: String(selected.directionToleranceDeg),
    })
  }, [selected.lineId, selected.startLat, selected.startLon, selected.finishLat, selected.finishLon,
      selected.startRadiusM, selected.finishRadiusM, selected.minStartSpeedMs, selected.directionToleranceDeg])

  const save = async (extraSamples = testSamples) => {
    setSaving(true)
    try {
      await upsertRule({
        lineId: selected.lineId, name: selected.name, enabled: selected.enabled,
        startLat: Number(form.startLat), startLon: Number(form.startLon),
        finishLat: Number(form.finishLat), finishLon: Number(form.finishLon),
        startRadiusM: Number(form.startRadiusM), finishRadiusM: Number(form.finishRadiusM),
        minStartSpeedMs: Number(form.minStartSpeedMs), directionToleranceDeg: Number(form.directionToleranceDeg),
        testSamples: JSON.stringify(extraSamples.slice(-40)), updatedBy: userId,
      })
    } catch (error: any) {
      Alert.alert('Speichern fehlgeschlagen', error?.message ?? 'Trail-Regel konnte nicht gespeichert werden.')
    } finally { setSaving(false) }
  }

  const captureSample = async () => {
    const perm = await Location.requestForegroundPermissionsAsync()
    if (perm.status !== 'granted') { Alert.alert('Standort fehlt', 'Für Test-Samples braucht die App Standortzugriff.'); return }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
    await save([...testSamples, { latitude: loc.coords.latitude, longitude: loc.coords.longitude, at: new Date().toISOString() }])
  }

  const center = { latitude: Number(form.startLat) || selected.startLat, longitude: Number(form.startLon) || selected.startLon, latitudeDelta: 0.004, longitudeDelta: 0.004 }
  const lineCoords = [
    { latitude: Number(form.startLat) || selected.startLat, longitude: Number(form.startLon) || selected.startLon },
    { latitude: Number(form.finishLat) || selected.finishLat, longitude: Number(form.finishLon) || selected.finishLon },
  ]
  const sectorColor = lineId === 'p1' ? C1 : C2

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={am.screen}>
        {/* Header */}
        <View style={am.header}>
          <TouchableOpacity onPress={onClose} style={am.closeBtn}>
            <Text style={am.closeText}>×</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={am.title}>Trail Regeln</Text>
            <Text style={[am.subtitle, { color: accent }]}>ADMIN TUNING</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={am.content}>
          {/* Sektor-Switch — same style as main screen selector */}
          <View style={am.segmentRow}>
            {(['p1', 'p2'] as const).map(id => {
              const col = id === 'p1' ? C1 : C2
              const active = lineId === id
              return (
                <TouchableOpacity key={id} style={[am.segment, active && { borderColor: col, backgroundColor: `${col}18` }]} onPress={() => setLineId(id)}>
                  <View style={[am.segmentDot, { backgroundColor: col, opacity: active ? 1 : 0.35 }]} />
                  <Text style={[am.segmentText, active && { color: col }]}>{id.toUpperCase()}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Map toggle */}
          <View style={am.rowBetween}>
            <Text style={am.label}>Karte anzeigen</Text>
            <Switch value={showMap} onValueChange={setShowMap} trackColor={{ true: `${sectorColor}88`, false: '#333' }} thumbColor={showMap ? sectorColor : '#666'} />
          </View>

          {showMap && (
            <View style={am.mapWrap}>
              <MapView style={am.map} initialRegion={center} mapType="hybrid">
                <Polyline coordinates={lineCoords} strokeColor={sectorColor} strokeWidth={4} />
                <Marker coordinate={lineCoords[0]} title={`${selected.name} Start`} pinColor="green" draggable
                  onDragEnd={e => { const { latitude, longitude } = e.nativeEvent.coordinate; setForm(c => ({ ...c, startLat: String(latitude), startLon: String(longitude) })) }} />
                <Marker coordinate={lineCoords[1]} title={`${selected.name} Ziel`} pinColor="red" draggable
                  onDragEnd={e => { const { latitude, longitude } = e.nativeEvent.coordinate; setForm(c => ({ ...c, finishLat: String(latitude), finishLon: String(longitude) })) }} />
                <MapCircle center={lineCoords[0]} radius={Number(form.startRadiusM) || 35} strokeColor={sectorColor} fillColor={`${sectorColor}22`} />
                <MapCircle center={lineCoords[1]} radius={Number(form.finishRadiusM) || 35} strokeColor="#ff5252" fillColor="rgba(255,82,82,0.15)" />
                {testSamples.map((pt, i) => <Marker key={`${pt.at}-${i}`} coordinate={pt} title={`Sample ${i + 1}`} pinColor="orange" />)}
              </MapView>
            </View>
          )}

          {/* Inputs */}
          {([
            ['Start Radius', 'startRadiusM', 'm'],
            ['Ziel Radius', 'finishRadiusM', 'm'],
            ['Min Speed', 'minStartSpeedMs', 'm/s'],
            ['Richtung Toleranz', 'directionToleranceDeg', 'deg'],
          ] as [string, keyof RuleForm, string][]).map(([label, key, unit]) => (
            <View key={key} style={am.inputRow}>
              <Text style={am.label}>{label}</Text>
              <View style={am.inputWrap}>
                <TextInput value={form[key]} onChangeText={v => setForm(c => ({ ...c, [key]: v.replace(',', '.') }))} keyboardType="decimal-pad" style={[am.input, { borderColor: `${sectorColor}44`, color: Colors.text }]} />
                <Text style={am.unit}>{unit}</Text>
              </View>
            </View>
          ))}

          {/* Koordinaten-Anzeige */}
          <View style={[am.coordBox, { borderColor: `${sectorColor}22` }]}>
            <Text style={am.coordLabel}>KOORDINATEN</Text>
            <Text style={am.coordText}>Start  {Number(form.startLat).toFixed(6)}, {Number(form.startLon).toFixed(6)}</Text>
            <Text style={am.coordText}>Ziel    {Number(form.finishLat).toFixed(6)}, {Number(form.finishLon).toFixed(6)}</Text>
            <Text style={[am.coordText, { color: sectorColor, marginTop: 4 }]}>Test-Samples: {testSamples.length}</Text>
          </View>

          {/* Sample */}
          <TouchableOpacity style={[am.sampleBtn, { borderColor: sectorColor }]} onPress={captureSample} disabled={saving}>
            <Text style={[am.sampleText, { color: sectorColor }]}>+ Aktuelle Position als Test-Sample</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity style={[am.saveBtn, { backgroundColor: sectorColor }, saving && { opacity: 0.5 }]} onPress={() => save()} disabled={saving}>
            <Text style={am.saveText}>{saving ? 'Speichert...' : 'Regel speichern'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── SCREEN ───────────────────────────────────────────────────────────────────

export default function StreckeScreen() {
  const [sel, setSel] = useState<string | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [placeMode, setPlaceMode] = useState(false)
  const [pendingCoord, setPendingCoord] = useState<{ latitude: number; longitude: number } | null>(null)
  const { getLeaderboard } = useRunStore()
  const { session, isAdmin } = useAuthStore()
  const { features, fetchFeatures, addFeature, deleteFeature } = useTrailFeaturesStore()
  const { accent } = useTheme()
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

  useFocusEffect(useCallback(() => {
    loadLeaderboards()
    fetchFeatures().catch(() => undefined)
  }, [loadLeaderboards, fetchFeatures]))

  const handleMapPress = (coord: { latitude: number; longitude: number }) => {
    setPendingCoord(coord)
    setPlaceMode(false)
  }

  const handlePlaceConfirm = async (type: FeatureType, name: string) => {
    if (!pendingCoord || !session?.userId) return
    const coord = pendingCoord
    setPendingCoord(null)
    try {
      await addFeature({ type, name, latitude: coord.latitude, longitude: coord.longitude, lineId: null, createdBy: session.userId })
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Feature konnte nicht gespeichert werden.')
    }
  }

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
    <GlassBackground>
      <AppHeader />
      {session?.userId && (
        <AdminTrailRulesModal visible={adminOpen} onClose={() => setAdminOpen(false)} userId={session.userId} />
      )}
      <PlaceFeatureSheet
        visible={pendingCoord !== null}
        onClose={() => setPendingCoord(null)}
        onConfirm={handlePlaceConfirm}
      />
      <View style={{ flex: 1, flexDirection: 'column' }}>

        {/* Trail header */}
        <View style={s.trailHeader}>
          <Text style={[s.eyebrow, { color: accent }]}>Streckenanalyse</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.trailTitle}>MOE MOEA Trails</Text>
              <Text style={s.trailSub}>Neckartal · {totalDist}m · 2 Parts</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <View style={s.bestBox}>
                <Text style={s.bestLabel}>STRECKE BEST</Text>
                <Text style={[s.bestTime, { color: accent }]}>01:14.2</Text>
              </View>
              {isAdmin && (
                <>
                  <TouchableOpacity
                    style={[s.adminIconBtn, placeMode && { borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.12)' }]}
                    onPress={() => setPlaceMode(v => !v)}
                  >
                    <Text style={[s.adminIconText, placeMode && { color: '#fbbf24' }]}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.adminIconBtn} onPress={() => setAdminOpen(true)}>
                    <Text style={s.adminIconText}>⚙</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Trail Map */}
        <View style={s.mapContainer}>
          <TrailMap
            sel={sel}
            onSelect={(id) => setSel(id)}
            features={features}
            isAdmin={isAdmin}
            placeMode={placeMode}
            onMapPress={handleMapPress}
            onDeleteFeature={deleteFeature}
          />

          {/* Place mode banner */}
          {placeMode && (
            <View style={s.placeBanner} pointerEvents="none">
              <Text style={s.placeBannerText}>+ Auf Karte tippen um Feature zu setzen</Text>
            </View>
          )}

          {/* Sector tap hints when nothing selected and not placing */}
          {!sel && !placeMode && (
            <View style={s.tapHint} pointerEvents="none">
              <Text style={s.tapHintText}>Sektor antippen</Text>
            </View>
          )}

          {/* Sector detail panel */}
          {sectorData && (
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
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
    </GlassBackground>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  trailHeader: { padding: 10, paddingHorizontal: 16, paddingBottom: 8 },
  eyebrow: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 2.5, color: Colors.accent, textTransform: 'uppercase', marginBottom: 5, opacity: 0.9 },
  trailTitle: { fontFamily: Fonts.bodyBd, fontSize: 20, color: Colors.text, lineHeight: 24 },
  trailSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  bestBox: {
    backgroundColor: '#0e0c09', borderRadius: 8, padding: 5, paddingHorizontal: 11,
    alignItems: 'flex-end', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  bestLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.dim, letterSpacing: 1 },
  bestTime: { fontFamily: Fonts.mono, fontSize: 15, fontWeight: '700', marginTop: 1 },
  mapContainer: {
    flex: 1, margin: 10, marginTop: 0, borderRadius: 18,
    backgroundColor: '#0d0c0a',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  tapHint: {
    position: 'absolute', bottom: 14, left: 0, right: 0,
    alignItems: 'center',
  },
  tapHintText: {
    fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.5,
  },
  adminIconBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#0e0c09', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  adminIconText: { fontSize: 15, color: Colors.dim },
  placeBanner: {
    position: 'absolute', top: 12, left: 12, right: 12,
    backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  placeBannerText: { fontFamily: Fonts.bodyBd, fontSize: 12, color: '#fbbf24', letterSpacing: 0.5 },
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

const fm = StyleSheet.create({
  wrap: { alignItems: 'center' },
  badge: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowRadius: 4, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 2 },
  },
  icon: { fontSize: 13, fontWeight: '700' },
  pill: {
    marginTop: 2, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, maxWidth: 80,
  },
  pillText: { fontFamily: Fonts.mono, fontSize: 8, color: '#000', fontWeight: '700', textAlign: 'center' },
  stem: { width: 2, height: 6, borderRadius: 1 },
})

const pf = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  handle: { width: 36, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginBottom: 16 },
  title: { fontFamily: Fonts.bodyBd, fontSize: 16, color: Colors.text, marginBottom: 14, textAlign: 'center', letterSpacing: 0.5 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: {
    width: '30.5%', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard, alignItems: 'center', gap: 3,
  },
  typeIcon: { fontSize: 20 },
  typeLabel: { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  typeDesc: { fontFamily: Fonts.body, fontSize: 9, color: Colors.dim, textAlign: 'center' },
  input: {
    height: 44, borderRadius: 9, borderWidth: 1,
    paddingHorizontal: 12, color: Colors.text, fontFamily: Fonts.body, fontSize: 14,
    backgroundColor: Colors.bgCard, marginBottom: 14,
  },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 9, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: Colors.muted },
  confirmBtn: { flex: 2, height: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000', letterSpacing: 0.5 },
})

const am = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingTop: 58, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 34, height: 34, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontFamily: Fonts.bodyBd, fontSize: 22, color: Colors.text, lineHeight: 24 },
  title: { fontFamily: Fonts.bodyBd, fontSize: 18, letterSpacing: 1.5, color: Colors.text, textAlign: 'center' },
  subtitle: { fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 2.5, textAlign: 'center', marginTop: 2 },
  content: { padding: 16, paddingBottom: 42, gap: 12 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1, height: 40, borderRadius: 9, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: Colors.bgCard,
  },
  segmentDot: { width: 7, height: 7, borderRadius: 3.5 },
  segmentText: { fontFamily: Fonts.bodyBd, fontSize: 13, color: Colors.muted },
  rowBetween: {
    height: 44, borderRadius: 9, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, backgroundColor: Colors.bgCard,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  mapWrap: {
    height: 280, borderRadius: 9, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  map: { flex: 1 },
  inputRow: {
    borderRadius: 9, borderWidth: 1, borderColor: Colors.border,
    padding: 12, backgroundColor: Colors.bgCard, gap: 8,
  },
  label: { fontFamily: Fonts.bodyBd, fontSize: 11, color: Colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1, height: 40, borderRadius: 8, borderWidth: 1,
    color: Colors.text, fontFamily: Fonts.monoBd, fontSize: 16, paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  unit: { width: 42, fontFamily: Fonts.mono, fontSize: 12, color: Colors.dim },
  coordBox: {
    borderRadius: 9, borderWidth: 1,
    padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', gap: 4,
  },
  coordLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 2, color: Colors.dim, textTransform: 'uppercase', marginBottom: 4 },
  coordText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted },
  sampleBtn: {
    height: 44, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sampleText: { fontFamily: Fonts.bodyBd, fontSize: 12, letterSpacing: 0.5 },
  saveBtn: { height: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000', letterSpacing: 1, textTransform: 'uppercase' },
})
