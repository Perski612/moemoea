import { useState, useEffect } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import Svg, { Rect, Circle, Path, Polygon } from 'react-native-svg'
import { AppHeader } from '@/components/ui/AppHeader'
import { GlassBackground } from '@/components/ui/GlassBackground'
import { GlassCard } from '@/components/ui/GlassCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Colors, Fonts, Radius } from '@/constants/theme'
import { useFeedStore } from '@/stores/useFeedStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTheme } from '@/hooks/useTheme'

// ── HELPERS ──────────────────────────────────────────────────────────────────

function TierDot({ tier }: { tier: string }) {
  const c = { rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' }[tier] ?? '#aaa'
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
}

function VideoPlaceholder() {
  return (
    <View style={{ height: 190, backgroundColor: '#0e0c0a', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Polygon points="6,3 18,10 6,17" fill="rgba(255,255,255,0.65)" />
        </Svg>
      </View>
      <Text style={{ fontFamily: Fonts.mono, fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, marginTop: 8 }}>MOE MOEA TRAILS</Text>
    </View>
  )
}

// ── UPLOAD MODAL ─────────────────────────────────────────────────────────────

function UploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { accent } = useTheme()
  const [step, setStep] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  const reset = () => { setStep(0); setUploading(false); setDone(false); onClose() }

  const stepLabel = ['QR CODE', 'AUFNEHMEN', 'HOCHLADEN']

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={um.bg}>
        {/* Header */}
        <View style={um.header}>
          <Text style={um.title}>Video Einreichen</Text>
          <TouchableOpacity onPress={reset} style={um.closeBtn}>
            <Text style={{ color: Colors.muted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Step bar */}
        <View style={um.stepBar}>
          {stepLabel.map((l, i) => (
            <View key={i} style={{ flex: 1 }}>
              <View style={[um.stepLine, { backgroundColor: step >= i ? accent : 'rgba(255,255,255,0.08)' }]} />
              <Text style={[um.stepText, { color: step >= i ? accent : Colors.dim }]}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Step 0: QR */}
        {step === 0 && (
          <View style={um.stepContent}>
            <View style={[um.qrBox, { borderColor: accent }]}>
              <Svg width={80} height={80} viewBox="0 0 7 7">
                {[
                  [0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],
                  [4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],
                  [0,4],[1,4],[2,4],[0,5],[2,5],[0,6],[1,6],[2,6],
                  [3,0],[3,3],[3,6],[1,3],[5,3],[4,4],[6,4],[5,5],[3,5],[4,6],[6,6],
                ].map(([cx, cy], idx) => (
                  <Rect key={idx} x={cx} y={cy} width={1} height={1} fill={accent} />
                ))}
              </Svg>
            </View>
            <Text style={um.stepHead}>QR-Code scannen</Text>
            <Text style={um.stepDesc}>
              Halte die Kamera vor den QR-Code{'\n'}am Photo-Spot des Trails.{'\n'}Er muss am Anfang des Videos sichtbar sein!
            </Text>
            {['QR-Code am Spot aufsuchen', 'Code vollständig im Bild halten', 'Grünes Licht abwarten'].map((t, i) => (
              <View key={i} style={um.hint}>
                <View style={[um.hintNum, { borderColor: accent }]}>
                  <Text style={[um.hintNumText, { color: accent }]}>{i + 1}</Text>
                </View>
                <Text style={um.hintText}>{t}</Text>
              </View>
            ))}
            <TouchableOpacity style={[um.btn, { backgroundColor: accent }]} onPress={() => setStep(1)}>
              <Text style={um.btnText}>QR erkannt → Weiter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Record */}
        {step === 1 && (
          <View style={um.stepContent}>
            <View style={[um.viewfinder, { borderColor: accent }]}>
              <Text style={[um.timer, { color: accent }]}>00:00</Text>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.dim, letterSpacing: 1.5 }}>BEREIT</Text>
            </View>
            <Text style={um.stepDesc}>Starte die Aufnahme. QR-Code zuerst ins Bild!</Text>
            <TouchableOpacity style={[um.btn, { backgroundColor: accent }]} onPress={() => setStep(2)}>
              <Text style={um.btnText}>● Aufnahme starten</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Upload */}
        {step === 2 && (
          <View style={um.stepContent}>
            {done ? (
              <>
                <View style={[um.doneCircle, { borderColor: accent, backgroundColor: `${accent}18` }]}>
                  <Svg width={26} height={26} viewBox="0 0 26 26">
                    <Path d="M5 13l6 6L21 7" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                </View>
                <Text style={[um.stepHead, { color: accent }]}>Clip eingereicht!</Text>
                <Text style={um.stepDesc}>Dein Video wurde validiert und ist{'\n'}jetzt im Feed sichtbar.</Text>
                <TouchableOpacity style={[um.btn, { backgroundColor: accent }]} onPress={reset}>
                  <Text style={um.btnText}>Fertig</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={um.stepHead}>Clip hochladen</Text>
                <Text style={um.stepDesc}>QR-Code validiert ✓</Text>
                <TouchableOpacity
                  style={[um.btn, { backgroundColor: uploading ? 'rgba(255,255,255,0.04)' : accent }]}
                  disabled={uploading}
                  onPress={() => {
                    setUploading(true)
                    setTimeout(() => { setUploading(false); setDone(true) }, 2200)
                  }}
                >
                  <Text style={[um.btnText, { color: uploading ? Colors.dim : '#000' }]}>
                    {uploading ? 'Wird hochgeladen…' : '▲ Hochladen & einreichen'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  )
}

export default function FeedScreen() {
  const { posts, getClipPosts, toggleFire } = useFeedStore()
  const { session } = useAuthStore()
  const { theme, accent } = useTheme()
  const [uploadOpen, setUploadOpen] = useState(false)

  const contestMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    getClipPosts(contestMonth)
  }, [contestMonth])

  const toggle = (postId: string) => {
    if (session?.userId) toggleFire(postId, session.userId)
  }

  return (
    <GlassBackground>
      <AppHeader />
      <UploadModal visible={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Contest header */}
        <View style={s.contestHeader}>
          <View>
            <Text style={[s.eyebrow, { color: accent }]}>Style Contest</Text>
            <Text style={[s.contestTitle, { color: theme.text }]}>{new Date().toLocaleDateString('de', { month: 'long', year: 'numeric' })}</Text>
            <Text style={[s.contestSub, { color: theme.muted }]}>MOE MOEA Trails · {posts.filter(p => p.verified).length} validierte Clips</Text>
          </View>
          <View style={[s.liveBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}55` }]}>
            <Text style={[s.liveBadgeText, { color: accent }]}>LIVE</Text>
          </View>
        </View>

        {/* Upload button */}
        <GlassCard style={[s.uploadBtn, { borderColor: accent }]} padding={14}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => setUploadOpen(true)}>
            <View style={[s.uploadIcon, { backgroundColor: `${accent}1a`, borderColor: `${accent}44` }]}>
              <Svg width={18} height={18} viewBox="0 0 18 18">
                <Path d="M9 13V3M9 3L5 7M9 3l4 4" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Path d="M2 15h14" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.uploadTitle, { color: theme.text }]}>Video einreichen</Text>
              <Text style={[s.uploadSub, { color: theme.muted }]}>QR scannen → aufnehmen → hochladen</Text>
            </View>
            <Text style={{ color: accent, fontSize: 12 }}>›</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* QR warning */}
        <View style={s.qrWarning}>
          <Text style={s.qrWarningText}>QR-Code am Anfang des Videos pflicht — sonst kein Leaderboard!</Text>
        </View>

        {/* Feed items */}
        {posts.map((post) => {
          const fired = session?.userId ? post.firedBy.includes(session.userId) : false
          return (
            <GlassCard key={post.$id} style={s.feedCard} padding={0}>
              <VideoPlaceholder />
              {post.verified
                ? <View style={[s.badge, { backgroundColor: `${accent}22`, borderColor: `${accent}77` }]}>
                    <Text style={[s.badgeText, { color: accent }]}>QR VALID</Text>
                  </View>
                : <View style={[s.badge, { backgroundColor: 'rgba(255,40,40,0.13)', borderColor: 'rgba(255,60,60,0.35)' }]}>
                    <Text style={[s.badgeText, { color: 'rgba(255,80,80,0.9)' }]}>NICHT VALIDIERT</Text>
                  </View>
              }
              <View style={s.feedMeta}>
                <UserAvatar userId={post.userId} size={34} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={[s.feedUser, { color: theme.text }]}>{post.username}</Text>
                    <TierDot tier={post.tier} />
                  </View>
                  <Text style={[s.feedBike, { color: theme.muted }]}>{new Date(post.$createdAt).toLocaleDateString('de')}</Text>
                </View>
                <TouchableOpacity
                  style={[s.fireBtn, { borderColor: theme.cardBorder }, fired && { backgroundColor: 'rgba(255,107,0,0.14)', borderColor: '#ff6b00' }]}
                  onPress={() => toggle(post.$id)}
                >
                  <Text style={{ fontSize: 11 }}>{fired ? '🔥' : '🤍'}</Text>
                  <Text style={[s.fireCount, { color: fired ? '#ff6b00' : theme.muted }]}>{post.fireCount}</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )
        })}

      </ScrollView>
    </GlassBackground>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  contestHeader: { padding: 16, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 2, color: Colors.accent, textTransform: 'uppercase', marginBottom: 4 },
  contestTitle: { fontFamily: Fonts.bodyBd, fontSize: 22, color: Colors.text },
  contestSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  liveBadge: { backgroundColor: `${Colors.accent}18`, borderWidth: 1, borderColor: `${Colors.accent}55`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  liveBadgeText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.accent },

  uploadBtn: {
    marginHorizontal: 16, marginBottom: 16,
  },
  uploadIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: `${Colors.accent}1a`,
    borderWidth: 1, borderColor: `${Colors.accent}44`, alignItems: 'center', justifyContent: 'center',
  },
  uploadTitle: { fontFamily: Fonts.bodyBd, fontSize: 16, color: Colors.text, marginBottom: 2 },
  uploadSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  qrWarning: {
    marginHorizontal: 16, marginBottom: 14, padding: 10, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: 'rgba(255,107,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.25)',
  },
  qrWarningText: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,107,0,0.85)' },

  feedCard: {
    marginHorizontal: 16, marginBottom: 14,
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: 10, right: 10,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontFamily: Fonts.mono, fontSize: 10 },
  feedMeta: { padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedUser: { fontFamily: Fonts.bodyBd, fontSize: 15, color: Colors.text },
  feedBike: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  fireBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  fireCount: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700' },
})

const um = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(6,5,3,0.98)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 60 },
  title: { fontFamily: Fonts.display, fontSize: 24, letterSpacing: 2, color: Colors.text },
  closeBtn: { width: 30, height: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 20 },
  stepLine: { height: 2, borderRadius: 99, marginBottom: 5 },
  stepText: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  stepContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 18 },
  qrBox: { padding: 12, borderWidth: 2, borderRadius: 14 },
  stepHead: { fontFamily: Fonts.bodyBd, fontSize: 20, color: Colors.text, textAlign: 'center' },
  stepDesc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  hintNum: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hintNumText: { fontFamily: Fonts.mono, fontSize: 10 },
  hintText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, flex: 1 },
  btn: { alignSelf: 'stretch', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { fontFamily: Fonts.bodyBd, fontSize: 16, color: '#000' },
  viewfinder: { width: 180, height: 130, borderWidth: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timer: { fontFamily: Fonts.mono, fontSize: 28, fontWeight: '700' },
  doneCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
