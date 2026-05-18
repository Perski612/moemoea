import { useState } from 'react'
import { Image, ImageSourcePropType, Linking, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native'
import { RemoteAvatar } from './RemoteAvatar'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
import { AVATAR_PRESETS, DEFAULT_AVATAR_URL } from '@/constants/avatarPresets'
import type { BikeConfig } from '@/types'

const BIKE_COLORS = ['#1a1a1a', '#555555', '#1a3a99', '#991a1a', '#1a6620', '#997700']

const BIKE_TYPE_OPTIONS: { value: 'hardtail' | 'enduro' | 'downhill'; label: string; img: ImageSourcePropType }[] = [
  { value: 'hardtail', label: 'Hardtail', img: require('@/assets/Hardtail.png') },
  { value: 'enduro',   label: 'Enduro',   img: require('@/assets/Enduro.png') },
  { value: 'downhill', label: 'Downhill', img: require('@/assets/Downhill.png') },
]

interface Props {
  initial: Omit<BikeConfig, '$id' | 'userId'>
  accent?: string
  onSave: (config: Omit<BikeConfig, '$id' | 'userId'>) => Promise<void>
}

type Draft = Omit<BikeConfig, '$id' | 'userId'>
type Section = 'bike' | 'rider'

export function BikeConfigurator({ initial, accent = Colors.accent, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [customUrl, setCustomUrl] = useState(initial.avatarUrl || DEFAULT_AVATAR_URL)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [openSection, setOpenSection] = useState<Section>('rider')

  const set = (patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <SectionPanel title="Fahrer" open={openSection === 'rider'} onPress={() => setOpenSection(openSection === 'rider' ? 'bike' : 'rider')}>
        <ConfigRow label="Avatar">
          <View style={styles.avatarPresetGrid}>
            {AVATAR_PRESETS.map((preset) => {
              const active = (draft.avatarPresetId ?? 'messy_green') === preset.id
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.avatarPreset, active && { borderColor: accent, backgroundColor: `${accent}12` }]}
                  onPress={() => {
                    setCustomUrl(preset.url)
                    set({ avatarPresetId: preset.id, avatarUrl: preset.url })
                  }}
                >
                  <RemoteAvatar url={preset.url} size={50} />
                  <Text style={[styles.avatarPresetLabel, active && { color: accent }]}>{preset.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ConfigRow>
        <ConfigRow label="Eigener Link">
          <TouchableOpacity
            style={styles.generatorBtn}
            onPress={() => Linking.openURL('https://www.avatarsinpixels.com/minipix/')}
          >
            <Text style={styles.generatorText}>Generator öffnen</Text>
          </TouchableOpacity>
          <TextInput
            value={customUrl}
            onChangeText={setCustomUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.linkInput}
            placeholder="https://www.avatarsinpixels.com/..."
            placeholderTextColor={Colors.dim}
          />
          <TouchableOpacity
            style={[styles.useLinkBtn, { backgroundColor: accent }]}
            onPress={() => set({ avatarPresetId: 'custom_link', avatarUrl: customUrl.trim() || DEFAULT_AVATAR_URL })}
          >
            <Text style={styles.useLinkText}>Link nutzen</Text>
          </TouchableOpacity>
        </ConfigRow>
      </SectionPanel>

      <SectionPanel title="Bike" open={openSection === 'bike'} onPress={() => setOpenSection(openSection === 'bike' ? 'rider' : 'bike')}>
        <ConfigRow label="Fahrrad-Typ">
          <View style={styles.bikeTypeRow}>
            {BIKE_TYPE_OPTIONS.map(({ value, label, img }) => {
              const active = draft.bikeType === value
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.bikeTypeCard, active && { borderColor: accent, backgroundColor: `${accent}18` }]}
                  onPress={() => set({ bikeType: value })}
                >
                  <Image source={img} style={styles.bikeTypeImg} resizeMode="contain" />
                  <Text style={[styles.bikeTypeLabel, active && { color: accent }]}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ConfigRow>
        <ConfigRow label="Federgabel / Dämpfer">
          <SegBtn
            options={['Air', 'Coil']}
            active={draft.suspension === 'coil' ? 'Coil' : 'Air'}
            onSelect={(v) => set({ suspension: v.toLowerCase() as 'air' | 'coil' })}
            accent={accent}
          />
        </ConfigRow>
        <ConfigRow label="Rahmen-Material">
          <SegBtn
            options={['Aluminium', 'Carbon']}
            active={draft.material === 'carbon' ? 'Carbon' : 'Aluminium'}
            onSelect={(v) => set({ material: v.toLowerCase() as 'alu' | 'carbon' })}
            accent={accent}
          />
        </ConfigRow>
        <ConfigRow label="Rahmen-Farbe">
          <Swatches colors={BIKE_COLORS} active={draft.bikeColor} accent={accent} onSelect={(bikeColor) => set({ bikeColor })} />
        </ConfigRow>
        <View style={styles.inlineRow}>
          {([
            { key: 'marke' as const, label: 'Marke', placeholder: 'z.B. Trek' },
            { key: 'modell' as const, label: 'Modell', placeholder: 'z.B. Slash 9.8' },
          ]).map(({ key, label, placeholder }) => (
            <View key={key} style={styles.inlineField}>
              <Text style={styles.configLabel}>{label}</Text>
              <TextInput
                value={draft[key] ?? ''}
                onChangeText={v => set({ [key]: v })}
                placeholder={placeholder}
                placeholderTextColor={Colors.dim}
                style={styles.textField}
              />
            </View>
          ))}
        </View>
        <View style={styles.inlineRow}>
          {([
            { key: 'federweg_v' as const, label: 'Federweg vorne (mm)', placeholder: '170' },
            { key: 'federweg_h' as const, label: 'Federweg hinten (mm)', placeholder: '160' },
          ]).map(({ key, label, placeholder }) => (
            <View key={key} style={styles.inlineField}>
              <Text style={styles.configLabel}>{label}</Text>
              <TextInput
                value={draft[key] ?? ''}
                onChangeText={v => set({ [key]: v })}
                placeholder={placeholder}
                placeholderTextColor={Colors.dim}
                keyboardType="numeric"
                style={styles.textField}
              />
            </View>
          ))}
        </View>
      </SectionPanel>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: saved ? `${accent}33` : accent }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#000" />
          : <Text style={[styles.saveBtnText, saved && { color: accent }]}>
              {saved ? '✓ Gespeichert' : 'Speichern'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  )
}

function SectionPanel({ title, open, onPress, children }: { title: string; open: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.sectionPanel}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.sectionContent}>{children}</View>}
    </View>
  )
}

function Swatches({ colors, active, accent, onSelect }: { colors: string[]; active: string; accent: string; onSelect: (color: string) => void }) {
  return (
    <View style={styles.swatchRow}>
      {colors.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.swatch,
            { backgroundColor: color },
            active === color && { borderColor: accent, borderWidth: 2.5 },
          ]}
          onPress={() => onSelect(color)}
        />
      ))}
    </View>
  )
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      {children}
    </View>
  )
}

function SegBtn({ options, active, onSelect, accent }: { options: string[]; active: string; onSelect: (v: string) => void; accent: string }) {
  return (
    <View style={styles.segRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          style={[styles.segBtn, active === o && { backgroundColor: accent, borderColor: accent }]}
          onPress={() => onSelect(o)}
        >
          <Text style={[styles.segBtnText, active === o && { color: '#000' }]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md },
  sectionPanel: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, marginBottom: Spacing.sm, overflow: 'hidden' },
  sectionHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: 'rgba(255,255,255,0.035)' },
  sectionTitle: { fontFamily: Fonts.bodyBd, fontSize: 13, color: Colors.text },
  sectionChevron: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.muted },
  sectionContent: { padding: Spacing.md, paddingBottom: Spacing.sm },
  configRow: { marginBottom: Spacing.md },
  configLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase', marginBottom: Spacing.xs },
  avatarPresetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarPreset: {
    width: 82,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingVertical: 8,
    overflow: 'hidden',
  },
  avatarPresetLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, color: Colors.muted, marginTop: 4 },
  linkInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.text,
  },
  generatorBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  generatorText: { fontFamily: Fonts.bodyBd, fontSize: 12, color: Colors.text },
  useLinkBtn: { marginTop: 8, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  useLinkText: { fontFamily: Fonts.bodyBd, fontSize: 12, color: '#000' },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 7, borderWidth: 2, borderColor: 'transparent' },
  segRow: { flexDirection: 'row', gap: 4 },
  segBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: 7, alignItems: 'center' },
  segBtnText: { fontFamily: Fonts.bodyBd, fontSize: 11, color: Colors.muted },
  bikeTypeRow: { flexDirection: 'row', gap: 8 },
  bikeTypeCard: {
    flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  bikeTypeImg: { width: 72, height: 46 },
  bikeTypeLabel: { fontFamily: Fonts.bodyBd, fontSize: 10, color: Colors.muted, marginTop: 5, letterSpacing: 0.8 },
  saveBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
  textField: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 7,
    color: Colors.text, fontFamily: Fonts.body, fontSize: 13,
  },
  inlineRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.sm },
  inlineField: { flex: 1 },
})
