import { useState, useEffect, useRef } from 'react'
import { Alert, Animated, ActivityIndicator, Image, ScrollView, View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import Svg, { Path, Polygon } from 'react-native-svg'
import { AppHeader } from '@/components/ui/AppHeader'
import { GlassBackground } from '@/components/ui/GlassBackground'
import { GlassCard } from '@/components/ui/GlassCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Colors, Fonts } from '@/constants/theme'
import { useFeedStore, parseReactions } from '@/stores/useFeedStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTheme } from '@/hooks/useTheme'
import type { ClipPost } from '@/types'
import type { Theme } from '@/hooks/useTheme'

const REACTION_EMOJIS = ['🔥', '💯', '🤙', '😮', '🫡', '👏']

// ── HELPERS ──────────────────────────────────────────────────────────────────

function TierDot({ tier }: { tier: string }) {
  const c = { rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' }[tier] ?? '#aaa'
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
}

function cloudinaryThumbnail(videoUrl: string): string {
  return videoUrl
    .replace('/video/upload/', '/video/upload/so_0,w_800,h_450,c_fill,q_auto/')
    .replace(/\.[^.]+$/, '.jpg')
}

function VideoPlaceholder() {
  return (
    <View style={{ height: 190, backgroundColor: '#0e0c0a', alignItems: 'center', justifyContent: 'center' }}>
      <View style={s.playBtn}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Polygon points="6,3 18,10 6,17" fill="rgba(255,255,255,0.25)" />
        </Svg>
      </View>
      <Text style={{ fontFamily: Fonts.mono, fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 3, marginTop: 8 }}>KEIN VIDEO</Text>
    </View>
  )
}

// ── FULLSCREEN VIDEO MODAL ────────────────────────────────────────────────────

type Floater = { id: number; emoji: string; x: number; anim: Animated.Value }

function VideoFullscreenModal({
  post, userId, onClose,
}: {
  post: ClipPost | null
  userId?: string
  onClose: () => void
}) {
  const { reactToClip, deleteClipPost } = useFeedStore()
  const player = useVideoPlayer(post?.videoUrl ?? null, p => { p.loop = false })
  const [floaters, setFloaters] = useState<Floater[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    if (post?.videoUrl) player.play()
    else player.pause()
  }, [post?.videoUrl])

  const handleReact = (emoji: string) => {
    if (!post || !userId) return
    reactToClip(post.$id, emoji, userId)

    const id = nextId.current++
    const anim = new Animated.Value(0)
    const x = 24 + Math.random() * 160
    setFloaters(prev => [...prev, { id, emoji, x, anim }])
    Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }).start(() =>
      setFloaters(prev => prev.filter(f => f.id !== id))
    )
  }

  const reactions = parseReactions(post?.reactions)

  return (
    <Modal visible={!!post} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={fs.bg}>
        {/* Video — fills available space above the overlay */}
        <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />

        {/* Floating emoji — absolute, anchored above the overlay */}
        {floaters.map(f => (
          <Animated.Text
            key={f.id}
            pointerEvents="none"
            style={[fs.floater, {
              left: f.x,
              transform: [{ translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -260] }) }],
              opacity: f.anim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
            }]}
          >
            {f.emoji}
          </Animated.Text>
        ))}

        {/* Close button */}
        <TouchableOpacity style={fs.closeBtn} onPress={onClose}>
          <Text style={fs.closeTxt}>✕</Text>
        </TouchableOpacity>

        {/* Bottom panel — sits below the video, no overlap */}
        <View style={fs.panel}>
          {post && (
            <View style={fs.userRow}>
              <UserAvatar userId={post.userId} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={fs.username}>{post.username}</Text>
                <Text style={fs.date}>{new Date(post.$createdAt).toLocaleDateString('de', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
              {userId === post.userId && (
                <TouchableOpacity
                  style={fs.deleteBtn}
                  onPress={() => Alert.alert(
                    'Clip löschen',
                    'Möchtest du diesen Clip wirklich löschen?',
                    [
                      { text: 'Abbrechen', style: 'cancel' },
                      { text: 'Löschen', style: 'destructive', onPress: async () => {
                        await deleteClipPost(post.$id)
                        onClose()
                      }},
                    ],
                  )}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="rgba(255,80,80,0.8)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={fs.reactionBar}>
            {REACTION_EMOJIS.map(emoji => {
              const count = (reactions[emoji] ?? []).length
              const reacted = userId ? (reactions[emoji] ?? []).includes(userId) : false
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[fs.reactionBtn, reacted && fs.reactionBtnActive]}
                  onPress={() => handleReact(emoji)}
                >
                  <Text style={fs.reactionEmoji}>{emoji}</Text>
                  {count > 0 && <Text style={[fs.reactionCount, reacted && { color: '#fff' }]}>{count}</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── VIDEO CARD ───────────────────────────────────────────────────────────────

function VideoCard({ post, onFire, onPlay, fired, accent, theme }: {
  post: ClipPost
  onFire: () => void
  onPlay: () => void
  fired: boolean
  accent: string
  theme: Theme
}) {
  return (
    <GlassCard style={s.feedCard} padding={0}>
      {post.videoUrl ? (
        <TouchableOpacity onPress={onPlay} activeOpacity={0.85}>
          <Image
            source={{ uri: cloudinaryThumbnail(post.videoUrl) }}
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            resizeMode="cover"
          />
          <View pointerEvents="none" style={s.playOverlay}>
            <View style={s.playBtn}>
              <Svg width={22} height={22} viewBox="0 0 20 20">
                <Polygon points="6,3 18,10 6,17" fill="rgba(255,255,255,0.85)" />
              </Svg>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <VideoPlaceholder />
      )}
      <View style={s.feedMeta}>
        <UserAvatar userId={post.userId} size={34} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={[s.feedUser, { color: theme.text }]}>{post.username}</Text>
            <TierDot tier={post.tier} />
          </View>
          <Text style={[s.feedDate, { color: theme.muted }]}>{new Date(post.$createdAt).toLocaleDateString('de')}</Text>
        </View>
        <TouchableOpacity
          style={[s.fireBtn, { borderColor: theme.cardBorder }, fired && { backgroundColor: 'rgba(255,107,0,0.14)', borderColor: '#ff6b00' }]}
          onPress={onFire}
        >
          <Text style={{ fontSize: 11, opacity: fired ? 1 : 0.3 }}>🔥</Text>
          <Text style={[s.fireCount, { color: fired ? '#ff6b00' : theme.muted }]}>{post.fireCount}</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  )
}

// ── UPLOAD MODAL ─────────────────────────────────────────────────────────────

function UploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { accent } = useTheme()
  const { uploadClipPost } = useFeedStore()
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => { setUploading(false); setDone(false); setError(null); onClose() }

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.5,
    })
    if (result.canceled || !result.assets?.[0]) return

    setUploading(true)
    setError(null)
    try {
      await uploadClipPost(result.assets[0].uri, result.assets[0].mimeType ?? undefined)
      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={reset}>
      <View style={um.bg}>
        <View style={um.header}>
          <Text style={um.title}>Video Einreichen</Text>
          <TouchableOpacity onPress={reset} style={um.closeBtn}>
            <Text style={{ color: Colors.muted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={um.body}>
          {done ? (
            <>
              <View style={[um.iconCircle, { borderColor: accent, backgroundColor: `${accent}18` }]}>
                <Svg width={26} height={26} viewBox="0 0 26 26">
                  <Path d="M5 13l6 6L21 7" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              </View>
              <Text style={[um.heading, { color: accent }]}>Clip eingereicht!</Text>
              <Text style={um.desc}>Dein Video ist jetzt im Feed sichtbar.</Text>
              <TouchableOpacity style={[um.btn, { backgroundColor: accent }]} onPress={reset}>
                <Text style={um.btnText}>Fertig</Text>
              </TouchableOpacity>
            </>
          ) : uploading ? (
            <>
              <ActivityIndicator size="large" color={accent} />
              <Text style={um.heading}>Wird hochgeladen…</Text>
              <Text style={um.desc}>Bitte warten, schließe diese Ansicht nicht.</Text>
            </>
          ) : (
            <>
              <View style={[um.iconCircle, { borderColor: `${accent}55` }]}>
                <Svg width={40} height={40} viewBox="0 0 40 40">
                  <Path d="M20 28V12M20 12L12 20M20 12l8 8" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <Path d="M8 32h24" stroke={accent} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </View>
              <Text style={um.heading}>Video auswählen</Text>
              <Text style={um.desc}>Wähle ein Video aus deiner Galerie.{'\n'}Max. 60 Sek · max. 45 MB</Text>
              {error ? <Text style={um.errorText}>{error}</Text> : null}
              <TouchableOpacity style={[um.btn, { backgroundColor: accent }]} onPress={pickAndUpload}>
                <Text style={um.btnText}>Galerie öffnen</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── SCREEN ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { posts, getClipPosts, toggleFire } = useFeedStore()
  const { session } = useAuthStore()
  const { theme, accent } = useTheme()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [fullscreenPost, setFullscreenPost] = useState<ClipPost | null>(null)

  const contestMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    getClipPosts(contestMonth)
  }, [contestMonth])

  const handleFire = (postId: string) => {
    if (session?.userId) toggleFire(postId, session.userId)
  }

  return (
    <GlassBackground>
      <AppHeader />
      <UploadModal visible={uploadOpen} onClose={() => setUploadOpen(false)} />
      <VideoFullscreenModal post={fullscreenPost} userId={session?.userId} onClose={() => setFullscreenPost(null)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Contest header */}
        <View style={s.contestHeader}>
          <View>
            <Text style={[s.eyebrow, { color: accent }]}>Style Contest</Text>
            <Text style={[s.contestTitle, { color: theme.text }]}>{new Date().toLocaleDateString('de', { month: 'long', year: 'numeric' })}</Text>
            <Text style={[s.contestSub, { color: theme.muted }]}>MOE MOEA Trails · {posts.length} Clips</Text>
          </View>
          <View style={[s.liveBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}55` }]}>
            <Text style={[s.liveBadgeText, { color: accent }]}>LIVE</Text>
          </View>
        </View>

        {/* Upload button */}
        <GlassCard style={s.uploadBtn} padding={14}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => setUploadOpen(true)}>
            <View style={[s.uploadIcon, { backgroundColor: `${accent}1a`, borderColor: `${accent}44` }]}>
              <Svg width={18} height={18} viewBox="0 0 18 18">
                <Path d="M9 13V3M9 3L5 7M9 3l4 4" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Path d="M2 15h14" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.uploadTitle, { color: theme.text }]}>Video einreichen</Text>
              <Text style={[s.uploadSub, { color: theme.muted }]}>Video aus Galerie auswählen und hochladen</Text>
            </View>
            <Text style={{ color: accent, fontSize: 12 }}>›</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Feed items */}
        {posts.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={[s.emptyText, { color: theme.muted }]}>Noch keine Clips diesen Monat.{'\n'}Sei der Erste!</Text>
          </View>
        ) : (
          posts.map((post) => (
            <VideoCard
              key={post.$id}
              post={post}
              onFire={() => handleFire(post.$id)}
              onPlay={() => setFullscreenPost(post)}
              fired={session?.userId ? post.firedBy.includes(session.userId) : false}
              accent={accent}
              theme={theme}
            />
          ))
        )}

      </ScrollView>
    </GlassBackground>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  contestHeader: { padding: 16, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: Fonts.bodyBd, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  contestTitle: { fontFamily: Fonts.bodyBd, fontSize: 22 },
  contestSub: { fontFamily: Fonts.body, fontSize: 13, marginTop: 2 },
  liveBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  liveBadgeText: { fontFamily: Fonts.mono, fontSize: 11 },

  uploadBtn: { marginHorizontal: 16, marginBottom: 16 },
  uploadIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontFamily: Fonts.bodyBd, fontSize: 16, marginBottom: 2 },
  uploadSub: { fontFamily: Fonts.body, fontSize: 12 },

  feedCard: { marginHorizontal: 16, marginBottom: 14 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  feedMeta: { padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedUser: { fontFamily: Fonts.bodyBd, fontSize: 15 },
  feedDate: { fontFamily: Fonts.body, fontSize: 12 },
  fireBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  fireCount: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700' },

  emptyState: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
})

const fs = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },

  closeBtn: { position: 'absolute', top: 54, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 16, lineHeight: 18 },

  panel: { backgroundColor: '#0e0c0a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 14, paddingBottom: 36, paddingHorizontal: 16, gap: 14 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { fontFamily: Fonts.bodyBd, fontSize: 15, color: '#fff' },
  date: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 },

  reactionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  reactionBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.35)' },
  reactionEmoji: { fontSize: 18 },
  reactionCount: { fontFamily: Fonts.mono, fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  floater: { position: 'absolute', bottom: 160, fontSize: 32 },

  deleteBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,80,80,0.3)', backgroundColor: 'rgba(255,80,80,0.08)', alignItems: 'center', justifyContent: 'center' },
})

const um = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(6,5,3,0.98)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 60 },
  title: { fontFamily: Fonts.display, fontSize: 24, letterSpacing: 2, color: Colors.text },
  closeBtn: { width: 30, height: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: Fonts.bodyBd, fontSize: 22, color: Colors.text, textAlign: 'center' },
  desc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: '#ff5555', textAlign: 'center' },
  btn: { alignSelf: 'stretch', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnText: { fontFamily: Fonts.bodyBd, fontSize: 16, color: '#000' },
})
