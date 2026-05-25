import { View, Text, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { useRef, useState } from 'react'
import { RemoteAvatar } from '@/components/RemoteAvatar'
import { LevelEmblem } from '@/components/LevelEmblem'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { databases, DB_ID, SESSIONS_ID, Query } from '@/lib/appwrite'
import { Colors, Fonts } from '@/constants/theme'
import type { Session } from '@/types'

function currentMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function currentWeekStart() {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
  const mon = new Date(now)
  mon.setDate(now.getDate() - day)
  mon.setHours(0, 0, 0, 0)
  return mon.toISOString()
}

async function fetchStreakData(userId: string): Promise<{ monthly: number; weekly: number }> {
  const res = await databases.listDocuments(
    DB_ID,
    SESSIONS_ID,
    [
      Query.equal('userId', userId),
      Query.greaterThanEqual('date', currentMonthStart()),
      Query.limit(100),
    ],
  ).catch(() => ({ documents: [] }))

  const sessions = res.documents as unknown as Session[]
  const weekStart = currentWeekStart()
  const monthly = new Set(sessions.map((s) => s.date.slice(0, 10))).size
  const weekly = new Set(
    sessions.filter((s) => s.date >= weekStart).map((s) => s.date.slice(0, 10))
  ).size
  return { monthly, weekly }
}

export function AppHeader() {
  const bikeConfig = useProfileStore((s) => s.bikeConfig)
  const profile = useProfileStore((s) => s.profile)
  const session = useAuthStore((s) => s.session)
  const level = profile?.level ?? 1
  const insets = useSafeAreaInsets()
  const [showTooltip, setShowTooltip] = useState(false)
  const { data: streakData = { monthly: 0, weekly: 0 } } = useQuery({
    queryKey: ['streak-data', session?.userId],
    queryFn: () => fetchStreakData(session!.userId),
    enabled: Boolean(session?.userId),
    retry: false,
  })

  const weeklyText = streakData.weekly === 0
    ? "Diese Woche noch kein Trail — Zeit wird's! 🏔️"
    : streakData.weekly === 1
    ? 'Du warst diese Woche schon 1x am Trail 🔥'
    : `Du warst diese Woche schon ${streakData.weekly}x am Trail 🔥`

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View>
        <Text style={styles.brandMain}>MOE MOEA</Text>
        <Text style={styles.brandSub}>TRAILS</Text>
      </View>
      <View style={styles.right}>
        <View>
          <TouchableOpacity
            style={styles.streakBadge}
            onPress={() => setShowTooltip((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakDays}>{streakData.monthly}</Text>
          </TouchableOpacity>
          {showTooltip && (
            <TouchableOpacity
              style={styles.tooltip}
              onPress={() => setShowTooltip(false)}
              activeOpacity={1}
            >
              <Text style={styles.tooltipText}>{weeklyText}</Text>
              <Text style={styles.tooltipSub}>Diesen Monat: {streakData.monthly} Tage</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.avatarBox} onPress={() => router.push('/(app)/(tabs)/profile')}>
          <RemoteAvatar url={bikeConfig?.avatarUrl} size={50} />
          <View style={styles.emblemBadge}>
            <LevelEmblem level={level} size={24} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(12,10,7,0.97)',
  },
  brandMain: { fontFamily: Fonts.display, fontSize: 26, letterSpacing: 3, color: Colors.text },
  brandSub:  { fontFamily: Fonts.display, fontSize: 12, letterSpacing: 7, color: Colors.accentRed, marginTop: -2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(153,234,87,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(153,234,87,0.25)',
    borderRadius: 11, paddingHorizontal: 11,
    height: 50, minWidth: 60,
  },
  streakFlame: { fontSize: 16, lineHeight: 20 },
  streakDays: {
    fontFamily: Fonts.mono, fontSize: 15, fontWeight: '700',
    color: Colors.accent, lineHeight: 20,
  },
  tooltip: {
    position: 'absolute',
    top: 56,
    right: 0,
    backgroundColor: 'rgba(20,18,14,0.97)',
    borderWidth: 1, borderColor: 'rgba(153,234,87,0.3)',
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 220,
    zIndex: 999,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  tooltipText: {
    fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18,
  },
  tooltipSub: {
    fontFamily: Fonts.mono, fontSize: 11, color: Colors.accent, marginTop: 4, opacity: 0.7,
  },

  avatarBox: {
    width: 50, height: 50, borderRadius: 11, backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: `${Colors.accent}44`,
    alignItems: 'center', justifyContent: 'center', overflow: 'visible',
  },
  emblemBadge: {
    position: 'absolute', bottom: -8, right: -8,
  },
})
