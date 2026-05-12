import { View, Text, StyleSheet } from 'react-native'
import { PixelAvatar } from '@/components/PixelAvatar'
import { useProfileStore } from '@/stores/useProfileStore'
import { Colors, Fonts } from '@/constants/theme'

export function AppHeader() {
  const bikeConfig = useProfileStore((s) => s.bikeConfig)

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brandMain}>MOE MOEA</Text>
        <Text style={styles.brandSub}>TRAILS</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.dot} />
        <View style={styles.avatarBox}>
          <PixelAvatar
            tier="rookie"
            px={2}
            accentColor={Colors.accent}
            bikeColor={bikeConfig?.bikeColor}
            jerseyJ={bikeConfig?.jerseyJ}
            jerseyD={bikeConfig?.jerseyD}
            bikeType={bikeConfig?.bikeType ?? 'hardtail'}
            suspType={bikeConfig?.suspension ?? 'air'}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(12,10,7,0.95)',
  },
  brandMain: { fontFamily: Fonts.display, fontSize: 22, letterSpacing: 2.5, color: Colors.text },
  brandSub: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 6, color: Colors.accentRed, marginTop: -2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  avatarBox: {
    width: 36, height: 36, borderRadius: 9, backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: `${Colors.accent}44`,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
})
