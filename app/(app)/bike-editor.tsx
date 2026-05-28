import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, ImageSourcePropType,
} from 'react-native'
import { router } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { useProfileStore } from '@/stores/useProfileStore'
import { useTheme } from '@/hooks/useTheme'
import { Fonts, Spacing, Radius } from '@/constants/theme'
import { SHOP_ITEMS } from '@/constants/shopItems'
import type { BikeConfig } from '@/types'

// ── Assets ────────────────────────────────────────────────────────────────────

const BIKE_IMAGES: Record<'hardtail' | 'enduro' | 'downhill', ImageSourcePropType> = {
  hardtail: require('@/assets/Hardtail.png'),
  enduro:   require('@/assets/Enduro.png'),
  downhill: require('@/assets/Downhill.png'),
}

// ── Options ───────────────────────────────────────────────────────────────────

const FRAME_COLORS: { hex: string; name: string }[] = [
  { hex: '#1a1a1a', name: 'Schwarz'  },
  { hex: '#555555', name: 'Grau'     },
  { hex: '#e8e4dc', name: 'Sand'     },
  { hex: '#1a3a99', name: 'Blau'     },
  { hex: '#991a1a', name: 'Rot'      },
  { hex: '#1a6620', name: 'Grün'     },
  { hex: '#997700', name: 'Gold'     },
  { hex: '#6b21a8', name: 'Lila'     },
]

const BIKE_TYPES: { value: 'hardtail' | 'enduro' | 'downhill'; label: string }[] = [
  { value: 'hardtail', label: 'Hardtail' },
  { value: 'enduro',   label: 'Enduro'   },
  { value: 'downhill', label: 'Downhill' },
]

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Path d="M13 5L7 11L13 17" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children, color }: { children: string; color: string }) {
  return <Text style={[s.sectionLabel, { color }]}>{children}</Text>
}

function SegmentRow({ options, value, onChange, accent }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  accent: string
}) {
  const { theme } = useTheme()
  return (
    <View style={s.segRow}>
      {options.map(o => {
        const active = o.value === value
        return (
          <TouchableOpacity
            key={o.value}
            style={[s.segBtn, {
              borderColor: active ? accent : theme.border,
              backgroundColor: active ? `${accent}1a` : 'transparent',
            }]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[s.segBtnText, { color: active ? accent : theme.muted }]}>{o.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function ColorSwatch({ colors, value, onChange, accent }: {
  colors: { hex: string; name: string }[]
  value: string
  onChange: (c: string) => void
  accent: string
}) {
  return (
    <View style={s.swatchRow}>
      {colors.map(c => (
        <TouchableOpacity
          key={c.hex}
          style={[
            s.swatch,
            { backgroundColor: c.hex },
            value === c.hex && { borderColor: accent, borderWidth: 3 },
          ]}
          onPress={() => onChange(c.hex)}
        />
      ))}
    </View>
  )
}

// ── PartSlot — equipped part + owned-parts quick-equip chips ──────────────────

function PartSlot({
  category, equippedId, ownedIds, onShop, onEquip, accent,
}: {
  category: 'fork' | 'shock'
  equippedId?: string
  ownedIds: string[]
  onShop: () => void
  onEquip: (id: string) => Promise<void>
  accent: string
}) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState<string | null>(null)

  const label = category === 'fork' ? 'GABEL' : 'DÄMPFER'
  const categoryItems = SHOP_ITEMS.filter(i => i.category === category)
  const ownedItems = categoryItems.filter(i => ownedIds.includes(i.id))
  const equippedItem = equippedId ? SHOP_ITEMS.find(i => i.id === equippedId) : null

  const handleEquip = async (id: string) => {
    setLoading(id)
    try { await onEquip(id) } finally { setLoading(null) }
  }

  return (
    <View style={[s.partSlot, { borderColor: equippedItem ? `${accent}33` : theme.border, backgroundColor: theme.bgCard }]}>

      {/* Label + shop link */}
      <View style={s.partSlotTop}>
        <Text style={[s.partSlotLabel, { color: accent }]}>{label}</Text>
        <TouchableOpacity onPress={onShop} hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}>
          <Text style={[s.shopLink, { color: theme.dim }]}>
            {ownedItems.length > 0 ? 'Mehr kaufen →' : 'Händler →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Equipped item or empty placeholder */}
      {equippedItem ? (
        <View style={s.equippedRow}>
          <Image source={equippedItem.img} style={s.equippedImg} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[s.equippedName, { color: theme.text }]}>{equippedItem.name}</Text>
            <Text style={[s.equippedSub, { color: theme.muted }]}>{equippedItem.subtitle}</Text>
            <Text style={[s.equippedSpec, { color: theme.dim }]}>{equippedItem.spec}</Text>
          </View>
          <View style={[s.equippedBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
            <Text style={[s.equippedBadgeText, { color: accent }]}>✓</Text>
          </View>
        </View>
      ) : (
        <View style={[s.emptySlot, { borderColor: theme.border }]}>
          <Text style={[s.emptySlotText, { color: theme.dim }]}>Nichts ausgerüstet</Text>
        </View>
      )}

      {/* Owned parts — horizontal chips for direct equip without shop roundtrip */}
      {ownedItems.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.ownedScroll}
          contentContainerStyle={s.ownedScrollContent}
        >
          {ownedItems.map(item => {
            const isEquipped = equippedId === item.id
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.ownedChip, {
                  borderColor: isEquipped ? accent : theme.border,
                  backgroundColor: isEquipped ? `${accent}18` : 'transparent',
                }]}
                onPress={() => !isEquipped && handleEquip(item.id)}
                disabled={isEquipped || loading !== null}
                activeOpacity={0.7}
              >
                {loading === item.id ? (
                  <ActivityIndicator size="small" color={accent} />
                ) : (
                  <Text style={[s.ownedChipText, { color: isEquipped ? accent : theme.muted }]} numberOfLines={1}>
                    {isEquipped ? '✓ ' : ''}{item.subtitle}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BikeEditorScreen() {
  const { profile, bikeConfig, saveBikeConfig, equipPart } = useProfileStore()
  const { theme, accent } = useTheme()

  type Draft = Omit<BikeConfig, '$id' | 'userId'>

  const initial: Draft = bikeConfig
    ? (({ $id: _i, userId: _u, ...rest }) => rest)(bikeConfig)
    : {
        bikeType: 'hardtail', suspension: 'air', material: 'alu',
        bikeColor: '#1a1a1a', jerseyJ: '#e8e4dc', jerseyD: '#9a9890',
      }

  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const patch = (p: Partial<Draft>) => { setDraft(d => ({ ...d, ...p })); setSaved(false) }

  const handleSave = async () => {
    setSaving(true)
    try { await saveBikeConfig(draft); setSaved(true) }
    finally { setSaving(false) }
  }

  const bikeType   = (draft.bikeType  ?? 'hardtail') as 'hardtail' | 'enduro' | 'downhill'
  const suspType   = (draft.suspension ?? 'air')      as 'air' | 'coil'
  const ownedParts = profile?.ownedParts ?? []
  const colorName  = FRAME_COLORS.find(c => c.hex === (draft.bikeColor ?? '#1a1a1a'))?.name ?? 'Custom'

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <BackIcon color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>BIKE EDITOR</Text>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saved ? `${accent}22` : accent }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={[s.saveBtnText, { color: saved ? accent : '#000' }]}>
                {saved ? '✓ Gespeichert' : 'Speichern'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Bike Preview */}
        <View style={[s.previewBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Image
            source={BIKE_IMAGES[bikeType]}
            style={s.bikeImage}
            resizeMode="contain"
          />
          <View style={s.previewMeta}>
            <View style={[s.colorDot, { backgroundColor: draft.bikeColor ?? '#1a1a1a' }]} />
            <Text style={[s.previewMetaText, { color: theme.muted }]}>
              {colorName}  ·  {bikeType.toUpperCase()}  ·  {suspType === 'air' ? 'AIR' : 'COIL'}  ·  {draft.material === 'carbon' ? 'CARBON' : 'ALU'}
            </Text>
          </View>
        </View>

        {/* Rahmenfarbe */}
        <SectionLabel color={accent}>RAHMENFARBE</SectionLabel>
        <ColorSwatch
          colors={FRAME_COLORS}
          value={draft.bikeColor ?? '#1a1a1a'}
          onChange={bikeColor => patch({ bikeColor })}
          accent={accent}
        />

        {/* Typ */}
        <SectionLabel color={accent}>TYP</SectionLabel>
        <SegmentRow
          options={BIKE_TYPES}
          value={bikeType}
          onChange={v => patch({ bikeType: v as Draft['bikeType'] })}
          accent={accent}
        />

        {/* Federung */}
        <SectionLabel color={accent}>FEDERUNG</SectionLabel>
        <SegmentRow
          options={[{ value: 'air', label: 'Air' }, { value: 'coil', label: 'Coil' }]}
          value={suspType}
          onChange={v => patch({ suspension: v as 'air' | 'coil' })}
          accent={accent}
        />

        {/* Material */}
        <SectionLabel color={accent}>MATERIAL</SectionLabel>
        <SegmentRow
          options={[{ value: 'alu', label: 'Aluminium' }, { value: 'carbon', label: 'Carbon' }]}
          value={draft.material ?? 'alu'}
          onChange={v => patch({ material: v as 'alu' | 'carbon' })}
          accent={accent}
        />

        {/* Ausgerüstete Parts */}
        <SectionLabel color={accent}>AUSGERÜSTETE PARTS</SectionLabel>
        <View style={s.partsCol}>
          <PartSlot
            category="fork"
            equippedId={draft.equippedFork}
            ownedIds={ownedParts}
            onShop={() => router.push('/(app)/shop')}
            onEquip={async id => {
              await equipPart('fork', id)
              patch({ equippedFork: id })
            }}
            accent={accent}
          />
          <PartSlot
            category="shock"
            equippedId={draft.equippedShock}
            ownedIds={ownedParts}
            onShop={() => router.push('/(app)/shop')}
            onEquip={async id => {
              await equipPart('shock', id)
              patch({ equippedShock: id })
            }}
            accent={accent}
          />
        </View>

        {/* Specs */}
        <SectionLabel color={accent}>SPECS</SectionLabel>
        <View style={[s.specsCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={s.specRow}>
            {[
              { key: 'marke' as const,  label: 'Marke',  placeholder: 'z.B. Trek' },
              { key: 'modell' as const, label: 'Modell', placeholder: 'z.B. Slash 9.8' },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={s.specField}>
                <Text style={[s.specLabel, { color: theme.muted }]}>{label.toUpperCase()}</Text>
                <TextInput
                  value={draft[key] ?? ''}
                  onChangeText={v => patch({ [key]: v })}
                  placeholder={placeholder}
                  placeholderTextColor={theme.dim}
                  style={[s.specInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            ))}
          </View>
          <View style={s.specRow}>
            {[
              { key: 'federweg_v' as const, label: 'Vorne (mm)', placeholder: '170' },
              { key: 'federweg_h' as const, label: 'Hinten (mm)', placeholder: '160' },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={s.specField}>
                <Text style={[s.specLabel, { color: theme.muted }]}>{label.toUpperCase()}</Text>
                <TextInput
                  value={draft[key] ?? ''}
                  onChangeText={v => patch({ [key]: v })}
                  placeholder={placeholder}
                  placeholderTextColor={theme.dim}
                  keyboardType="numeric"
                  style={[s.specInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontFamily: Fonts.display, fontSize: 28, letterSpacing: 2 },
  saveBtn: {
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  saveBtnText: { fontFamily: Fonts.bodyBd, fontSize: 13 },

  scroll: { padding: Spacing.md },

  // Preview
  previewBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  bikeImage: {
    width: '100%',
    height: 180,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  previewMetaText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
  },

  // Section label
  sectionLabel: {
    fontFamily: Fonts.bodyBd,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  // Segment
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  segBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
  },
  segBtnText: { fontFamily: Fonts.bodyBd, fontSize: 12 },

  // Swatches
  swatchRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  swatch: {
    width: 34, height: 34,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  // Parts — vertical stack
  partsCol: { gap: 10, marginBottom: 4 },

  partSlot: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 10,
  },
  partSlotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partSlotLabel: {
    fontFamily: Fonts.bodyBd,
    fontSize: 9,
    letterSpacing: 2,
  },
  shopLink: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },

  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  equippedImg: { width: 90, height: 62 },
  equippedName: { fontFamily: Fonts.bodyBd, fontSize: 12 },
  equippedSub:  { fontFamily: Fonts.body,   fontSize: 11, marginTop: 1 },
  equippedSpec: { fontFamily: Fonts.mono,   fontSize: 10, marginTop: 2 },
  equippedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  equippedBadgeText: { fontFamily: Fonts.bodyBd, fontSize: 11 },

  emptySlot: {
    height: 54,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: { fontFamily: Fonts.body, fontSize: 12 },

  ownedScroll: { marginTop: -2 },
  ownedScrollContent: { gap: 7, paddingBottom: 2 },
  ownedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedChipText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 11,
  },

  // Specs
  specsCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 12,
  },
  specRow: { flexDirection: 'row', gap: 10 },
  specField: { flex: 1 },
  specLabel: {
    fontFamily: Fonts.bodyBd,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  specInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: Fonts.body,
    fontSize: 13,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
})
