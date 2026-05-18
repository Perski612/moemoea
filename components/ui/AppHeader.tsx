import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { RemoteAvatar } from '@/components/RemoteAvatar'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { databases, DB_ID, SESSIONS_ID, Query } from '@/lib/appwrite'
import { Colors, Fonts } from '@/constants/theme'
import type { Session } from '@/types'

function currentMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

async function fetchMonthlyStreak(userId: string): Promise<number> {
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
  return new Set(sessions.map((session) => session.date.slice(0, 10))).size
}

export function AppHeader() {
  const bikeConfig = useProfileStore((s) => s.bikeConfig)
  const session = useAuthStore((s) => s.session)
  const insets = useSafeAreaInsets()
  const { data: monthlyStreak = 0 } = useQuery({
    queryKey: ['monthly-streak', session?.userId],
    queryFn: () => fetchMonthlyStreak(session!.userId),
    enabled: Boolean(session?.userId),
    retry: false,
  })

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View>
        <Text style={styles.brandMain}>MOE MOEA</Text>
        <Text style={styles.brandSub}>TRAILS</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakDays}>{monthlyStreak}</Text>
        </View>
        <TouchableOpacity style={styles.avatarBox} onPress={() => router.push('/(app)/(tabs)/profile')}>
          <RemoteAvatar url={bikeConfig?.avatarUrl} size={50} />
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
    gap: 5,
    backgroundColor: 'rgba(153,234,87,0.08)',
    borderWidth: 1, borderColor: 'rgba(153,234,87,0.25)',
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5,
    minWidth: 46,
  },
  streakFlame: { fontSize: 14, lineHeight: 18 },
  streakDays: {
    fontFamily: Fonts.mono, fontSize: 16, fontWeight: '700',
    color: Colors.accent, lineHeight: 18,
  },

  avatarBox: {
    width: 50, height: 50, borderRadius: 11, backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: `${Colors.accent}44`,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
})
