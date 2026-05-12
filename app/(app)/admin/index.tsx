import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { databases, DB_ID, PROFILES_ID, Query } from '@/lib/appwrite'
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
import type { Profile } from '@/types'

type Segment = 'pending' | 'approved'

async function fetchProfiles(approved: boolean): Promise<Profile[]> {
  const res = await databases.listDocuments(DB_ID, PROFILES_ID, [
    Query.equal('approved', approved),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ])
  return res.documents as unknown as Profile[]
}

async function approveUser(userId: string): Promise<void> {
  await databases.updateDocument(DB_ID, PROFILES_ID, userId, { approved: true })
}

export default function AdminScreen() {
  const [segment, setSegment] = useState<Segment>('pending')
  const qc = useQueryClient()

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin-profiles', 'pending'],
    queryFn: () => fetchProfiles(false),
  })

  const { data: approved = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['admin-profiles', 'approved'],
    queryFn: () => fetchProfiles(true),
  })

  const { mutate: approve, isPending: approving } = useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] })
    },
    onError: (e: any) => {
      Alert.alert('Fehler', e?.message ?? 'Freischaltung fehlgeschlagen')
    },
  })

  const list    = segment === 'pending' ? pending : approved
  const loading = segment === 'pending' ? loadingPending : loadingApproved

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.brandMain}>MOE MOEA</Text>
          <Text style={styles.brandSub}>ADMIN</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Segment Control */}
      <View style={styles.segRow}>
        {(['pending', 'approved'] as Segment[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.seg, segment === s && styles.segActive]}
            onPress={() => setSegment(s)}
          >
            <Text style={[styles.segText, segment === s && styles.segTextActive]}>
              {s === 'pending' ? `Ausstehend (${pending.length})` : `Genehmigt (${approved.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading
        ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowUsername}>{item.username}</Text>
                  <Text style={styles.rowSub}>{item.team} · {formatDate(item.$createdAt)}</Text>
                </View>
                {segment === 'pending' && (
                  <TouchableOpacity
                    style={[styles.approveBtn, approving && styles.approveBtnDisabled]}
                    onPress={() => approve(item.userId)}
                    disabled={approving}
                  >
                    <Text style={styles.approveBtnText}>Freischalten</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {segment === 'pending' ? 'Keine ausstehenden Accounts' : 'Keine genehmigten Accounts'}
              </Text>
            }
          />
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { fontFamily: Fonts.display, fontSize: 24, color: Colors.text },
  brandMain: { fontFamily: Fonts.display, fontSize: 20, letterSpacing: 2.5, color: Colors.text, textAlign: 'center' },
  brandSub: { fontFamily: Fonts.display, fontSize: 10, letterSpacing: 6, color: Colors.accentRed, textAlign: 'center' },
  segRow: { flexDirection: 'row', margin: Spacing.md, gap: 6 },
  seg: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, padding: 8, alignItems: 'center' },
  segActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}18` },
  segText: { fontFamily: Fonts.bodyBd, fontSize: 11, color: Colors.muted },
  segTextActive: { color: Colors.accent },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
  },
  rowInfo: { flex: 1 },
  rowUsername: { fontFamily: Fonts.bodyBd, fontSize: 14, color: Colors.text },
  rowSub: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.muted, marginTop: 2 },
  approveBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  approveBtnDisabled: { opacity: 0.5 },
  approveBtnText: { fontFamily: Fonts.bodyBd, fontSize: 12, color: '#000' },
  empty: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 40 },
})
