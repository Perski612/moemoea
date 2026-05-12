import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { PixelAvatar } from './PixelAvatar'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
import type { BikeConfig } from '@/types'

const BIKE_COLORS = ['#1a1a1a', '#555555', '#1a3a99', '#991a1a', '#1a6620', '#997700']
const JERSEY_OPTS = [
  { J: '#e8e4dc', D: '#9a9890' },
  { J: '#1a1a1a', D: '#333333' },
  { J: '#cc2200', D: '#881500' },
]

interface Props {
  initial: Omit<BikeConfig, '$id' | 'userId'>
  accent?: string
  onSave: (config: Omit<BikeConfig, '$id' | 'userId'>) => Promise<void>
}

type Draft = Omit<BikeConfig, '$id' | 'userId'>

export function BikeConfigurator({ initial, accent = Colors.accent, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      {/* Live Preview */}
      <View style={[styles.preview, { borderColor: `${accent}33` }]}>
        <PixelAvatar
          tier="rookie"
          px={5}
          accentColor={accent}
          bikeColor={draft.bikeColor}
          jerseyJ={draft.jerseyJ}
          jerseyD={draft.jerseyD}
          bikeType={draft.bikeType}
          suspType={draft.suspension}
        />
      </View>

      <ConfigRow label="Fahrrad-Typ">
        <SegBtn
          options={['Hardtail', 'Fully']}
          active={draft.bikeType === 'fully' ? 'Fully' : 'Hardtail'}
          onSelect={(v) => set({ bikeType: v === 'Fully' ? 'fully' : 'hardtail' })}
          accent={accent}
        />
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
        <View style={styles.swatchRow}>
          {BIKE_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                draft.bikeColor === c && { borderColor: accent, borderWidth: 2.5 },
              ]}
              onPress={() => set({ bikeColor: c })}
            />
          ))}
        </View>
      </ConfigRow>

      <ConfigRow label="Trikot-Farbe">
        <View style={styles.swatchRow}>
          {JERSEY_OPTS.map((j) => (
            <TouchableOpacity
              key={j.J}
              style={[
                styles.swatch,
                { backgroundColor: j.J },
                draft.jerseyJ === j.J && { borderColor: accent, borderWidth: 2.5 },
              ]}
              onPress={() => set({ jerseyJ: j.J, jerseyD: j.D })}
            />
          ))}
        </View>
      </ConfigRow>

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
  preview: { alignItems: 'center', marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, backgroundColor: Colors.bg },
  configRow: { marginBottom: Spacing.md },
  configLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase', marginBottom: Spacing.xs },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 7, borderWidth: 2, borderColor: 'transparent' },
  segRow: { flexDirection: 'row', gap: 4 },
  segBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: 7, alignItems: 'center' },
  segBtnText: { fontFamily: Fonts.bodyBd, fontSize: 11, color: Colors.muted },
  saveBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
})
