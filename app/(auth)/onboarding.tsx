import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, ImageSourcePropType, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

const BIKE_IMAGES: Record<'hardtail' | 'enduro' | 'downhill', ImageSourcePropType> = {
  hardtail: require('@/assets/Hardtail.png'),
  enduro:   require('@/assets/Enduro.png'),
  downhill: require('@/assets/Downhill.png'),
}

const BIKE_TYPES = [
  { value: 'hardtail' as const, label: 'HARDTAIL', sub: 'XC & Trail · leichter Rahmen' },
  { value: 'enduro'   as const, label: 'ENDURO',   sub: 'All-Mountain · vollgefedert' },
  { value: 'downhill' as const, label: 'DOWNHILL', sub: 'DH & Gravity · maximaler Grip' },
]

const FRAME_COLORS = [
  { hex: '#1a1a1a', name: 'Schwarz' },
  { hex: '#555555', name: 'Grau'    },
  { hex: '#e8e4dc', name: 'Sand'    },
  { hex: '#1a3a99', name: 'Blau'    },
  { hex: '#991a1a', name: 'Rot'     },
  { hex: '#1a6620', name: 'Grün'    },
  { hex: '#997700', name: 'Gold'    },
  { hex: '#6b21a8', name: 'Lila'    },
]

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [bikeType, setBikeType] = useState<'hardtail' | 'enduro' | 'downhill'>('hardtail')
  const [bikeColor, setBikeColor] = useState('#1a1a1a')
  const [saving, setSaving] = useState(false)

  const session = useAuthStore(s => s.session)
  const { syncFromAppwrite, saveBikeConfig } = useProfileStore()

  const skip = () => router.replace('/(auth)/pending')

  const finish = async () => {
    if (!session) { skip(); return }
    setSaving(true)
    try {
      await syncFromAppwrite(session.userId)
      await saveBikeConfig({
        bikeType,
        suspension: 'air',
        material: 'alu',
        bikeColor,
        jerseyJ: '#ef4444',
        jerseyD: '#1a1a2e',
      })
    } catch {
      // Non-critical — user can configure bike later in editor
    } finally {
      setSaving(false)
      router.replace('/(auth)/pending')
    }
  }

  return (
    <View style={s.root}>
      <View style={s.brand}>
        <Text style={s.brandMain}>MOE MOEA</Text>
        <Text style={s.brandSub}>TRAILS</Text>
      </View>

      <View style={s.progressRow}>
        <View style={[s.progressDot, s.progressDotActive]} />
        <View style={[s.progressLine, step >= 1 && s.progressLineActive]} />
        <View style={[s.progressDot, step >= 1 && s.progressDotActive]} />
      </View>

      {step === 0 ? (
        <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
          <Text style={s.stepTitle}>{'WÄHLE DEINEN\nBIKE-TYP'}</Text>

          <View style={s.bikeList}>
            {BIKE_TYPES.map(bt => {
              const active = bikeType === bt.value
              return (
                <TouchableOpacity
                  key={bt.value}
                  style={[s.bikeCard, active && s.bikeCardActive]}
                  onPress={() => setBikeType(bt.value)}
                  activeOpacity={0.8}
                >
                  <Image source={BIKE_IMAGES[bt.value]} style={s.bikeImg} resizeMode="contain" />
                  <View style={s.bikeInfo}>
                    <Text style={[s.bikeLabel, active && { color: Colors.accent }]}>{bt.label}</Text>
                    <Text style={s.bikeSub}>{bt.sub}</Text>
                  </View>
                  <View style={[s.radioOuter, active && { borderColor: Colors.accent }]}>
                    {active && <View style={s.radioInner} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(1)}>
            <Text style={s.primaryBtnText}>WEITER</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={skip}>
            <Text style={s.skipText}>Überspringen</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
          <Text style={s.stepTitle}>DEIN STYLE</Text>

          <View style={s.previewBox}>
            <Image source={BIKE_IMAGES[bikeType]} style={s.previewImg} resizeMode="contain" />
            <View style={[s.previewColorDot, { backgroundColor: bikeColor }]} />
          </View>

          <Text style={s.colorSectionLabel}>RAHMENFARBE</Text>
          <View style={s.swatchGrid}>
            {FRAME_COLORS.map(c => (
              <TouchableOpacity
                key={c.hex}
                style={[s.swatch, { backgroundColor: c.hex }, bikeColor === c.hex && s.swatchActive]}
                onPress={() => setBikeColor(c.hex)}
                activeOpacity={0.8}
              />
            ))}
          </View>
          <Text style={s.colorName}>
            {FRAME_COLORS.find(c => c.hex === bikeColor)?.name ?? ''}
          </Text>

          <TouchableOpacity
            style={[s.primaryBtn, saving && s.primaryBtnDisabled]}
            onPress={finish}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={s.primaryBtnText}>LOS GEHT'S</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={() => setStep(0)}>
            <Text style={s.skipText}>← Zurück</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  brand: { alignItems: 'center', paddingTop: 56, paddingBottom: 4 },
  brandMain: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: 4, color: Colors.text },
  brandSub: { fontFamily: Fonts.display, fontSize: 12, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 0,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.accent },
  progressLine: { width: 40, height: 2, backgroundColor: Colors.border },
  progressLineActive: { backgroundColor: Colors.accent },

  stepContent: { paddingHorizontal: Spacing.md, paddingBottom: 48 },

  stepTitle: {
    fontFamily: Fonts.display,
    fontSize: 40,
    letterSpacing: 2,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },

  bikeList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  bikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.bgCard,
  },
  bikeCardActive: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}0d`,
  },
  bikeImg: { width: 100, height: 70, flexShrink: 0 },
  bikeInfo: { flex: 1 },
  bikeLabel: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 1.5,
    color: Colors.text,
  },
  bikeSub: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.muted, marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },

  previewBox: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewImg: { width: '100%', height: 160 },
  previewColorDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
  },

  colorSectionLabel: {
    fontFamily: Fonts.bodyBd,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.muted,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  swatch: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: 'transparent',
  },
  swatchActive: { borderColor: Colors.accent },
  colorName: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.muted,
    marginBottom: Spacing.lg,
  },

  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 3,
    color: '#000',
  },

  skipBtn: { alignItems: 'center', padding: Spacing.sm },
  skipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
})
