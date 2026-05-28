import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { useProfileStore } from '@/stores/useProfileStore'
import { useTheme } from '@/hooks/useTheme'
import { Fonts, Spacing, Radius } from '@/constants/theme'
import { SHOP_ITEMS, type ShopItem, type PartCategory } from '@/constants/shopItems'

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Path d="M13 5L7 11L13 17" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

function CoinBadge({ amount, size = 'md' }: { amount: number; size?: 'sm' | 'md' }) {
  const fontSize = size === 'sm' ? 11 : 15
  const iconSize = size === 'sm' ? 12 : 16
  return (
    <View style={[s.coinBadge, size === 'sm' && s.coinBadgeSm]}>
      <View style={[s.coinIcon, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}>
        <Text style={[s.coinIconText, { fontSize: iconSize * 0.55, lineHeight: iconSize }]}>¢</Text>
      </View>
      <Text style={[s.coinAmount, { fontSize }]}>{amount.toLocaleString('de-DE')}</Text>
    </View>
  )
}

function ItemCard({
  item,
  owned,
  equipped,
  canAfford,
  coins,
  onBuy,
  onEquip,
  accent,
}: {
  item: ShopItem
  owned: boolean
  equipped: boolean
  canAfford: boolean
  coins: number
  onBuy: () => Promise<void>
  onEquip: () => Promise<void>
  accent: string
}) {
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()

  const handlePress = async () => {
    if (loading) return
    if (!owned) {
      Alert.alert(
        item.name,
        `${item.subtitle} für ¢ ${item.price} kaufen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Kaufen',
            onPress: async () => {
              setLoading(true)
              try { await onBuy() }
              catch (e: any) { Alert.alert('Fehler', e?.message ?? 'Kauf fehlgeschlagen') }
              finally { setLoading(false) }
            },
          },
        ],
      )
      return
    }
    setLoading(true)
    try { await onEquip() }
    catch (e: any) { Alert.alert('Fehler', e?.message ?? 'Ausrüsten fehlgeschlagen') }
    finally { setLoading(false) }
  }

  const borderColor = equipped ? accent : owned ? `${accent}55` : theme.border
  const bgColor = equipped ? `${accent}14` : owned ? `${accent}08` : 'transparent'

  let btnBg: string
  let btnBorder: string
  let btnContent: React.ReactNode

  if (equipped) {
    btnBg = `${accent}22`
    btnBorder = `${accent}55`
    btnContent = <Text style={[s.btnText, { color: accent }]}>✓ Ausgerüstet</Text>
  } else if (owned) {
    btnBg = `${accent}33`
    btnBorder = accent
    btnContent = loading
      ? <ActivityIndicator color={accent} size="small" />
      : <Text style={[s.btnText, { color: accent }]}>Ausrüsten</Text>
  } else {
    btnBg = canAfford ? accent : 'rgba(255,255,255,0.04)'
    btnBorder = canAfford ? accent : theme.border
    btnContent = loading
      ? <ActivityIndicator color={canAfford ? '#000' : theme.muted} size="small" />
      : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[s.coinIcon, { width: 13, height: 13, borderRadius: 6.5, opacity: canAfford ? 1 : 0.5 }]}>
            <Text style={[s.coinIconText, { fontSize: 7, lineHeight: 13 }]}>¢</Text>
          </View>
          <Text style={[s.btnText, { color: canAfford ? '#000' : theme.muted }]}>{item.price}</Text>
        </View>
      )
  }

  return (
    <View style={[s.card, { borderColor, backgroundColor: bgColor }]}>
      <View style={s.imgWrap}>
        <Image source={item.img} style={s.cardImg} resizeMode="contain" />
        {owned && (
          <View style={[s.ownedBadge, { backgroundColor: accent }]}>
            <Text style={s.ownedBadgeText}>OWNED</Text>
          </View>
        )}
      </View>

      <View style={s.cardInfo}>
        <Text style={[s.cardName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[s.cardSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
        <Text style={[s.cardSpec, { color: theme.dim }]}>{item.spec}</Text>
        {!owned && !canAfford && (
          <Text style={[s.deficitText, { color: theme.dim }]}>
            −{item.price - coins} Münzen fehlen
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: btnBg, borderColor: btnBorder }]}
        onPress={equipped ? undefined : handlePress}
        disabled={equipped || loading || (!owned && !canAfford)}
        activeOpacity={0.75}
      >
        {btnContent}
      </TouchableOpacity>
    </View>
  )
}

function CategorySection({
  title,
  items,
  category,
  ownedParts,
  equippedFork,
  equippedShock,
  coins,
  accent,
  onBuy,
  onEquip,
}: {
  title: string
  items: ShopItem[]
  category: PartCategory
  ownedParts: string[]
  equippedFork?: string
  equippedShock?: string
  coins: number
  accent: string
  onBuy: (id: string) => Promise<void>
  onEquip: (id: string) => Promise<void>
}) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: accent }]}>{title}</Text>
      <View style={s.grid}>
        {items.map(item => {
          const owned = ownedParts.includes(item.id)
          const equipped = category === 'fork' ? equippedFork === item.id : equippedShock === item.id
          return (
            <ItemCard
              key={item.id}
              item={item}
              owned={owned}
              equipped={equipped}
              canAfford={coins >= item.price}
              coins={coins}
              accent={accent}
              onBuy={() => onBuy(item.id)}
              onEquip={() => onEquip(item.id)}
            />
          )
        })}
      </View>
    </View>
  )
}

type TabId = 'all' | 'fork' | 'shock'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',   label: 'ALLE'    },
  { id: 'fork',  label: 'GABELN'  },
  { id: 'shock', label: 'DÄMPFER' },
]

export default function ShopScreen() {
  const { profile, bikeConfig, purchaseItem, equipPart } = useProfileStore()
  const { theme, accent } = useTheme()
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const coins = profile?.coins ?? 0
  const ownedParts = profile?.ownedParts ?? []
  const equippedFork = bikeConfig?.equippedFork
  const equippedShock = bikeConfig?.equippedShock

  const forks = SHOP_ITEMS.filter(i => i.category === 'fork')
  const shocks = SHOP_ITEMS.filter(i => i.category === 'shock')

  const showForks  = activeTab === 'all' || activeTab === 'fork'
  const showShocks = activeTab === 'all' || activeTab === 'shock'

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <BackIcon color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>HÄNDLER</Text>
        <CoinBadge amount={coins} />
      </View>

      {/* Category filter tabs */}
      <View style={[s.tabBar, { borderBottomColor: theme.border }]}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, {
                borderColor: active ? accent : 'transparent',
                backgroundColor: active ? `${accent}12` : 'transparent',
              }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[s.tabText, { color: active ? accent : theme.muted }]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {showForks && (
          <CategorySection
            title="GABELN"
            items={forks}
            category="fork"
            ownedParts={ownedParts}
            equippedFork={equippedFork}
            equippedShock={equippedShock}
            coins={coins}
            accent={accent}
            onBuy={async id => { await purchaseItem(id) }}
            onEquip={async id => { await equipPart('fork', id) }}
          />
        )}

        {showShocks && (
          <CategorySection
            title="DÄMPFER"
            items={shocks}
            category="shock"
            ownedParts={ownedParts}
            equippedFork={equippedFork}
            equippedShock={equippedShock}
            coins={coins}
            accent={accent}
            onBuy={async id => { await purchaseItem(id) }}
            onEquip={async id => { await equipPart('shock', id) }}
          />
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  )
}

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
  title: { flex: 1, fontFamily: Fonts.display, fontSize: 30, letterSpacing: 2 },

  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinBadgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  coinIcon: {
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIconText: {
    fontFamily: Fonts.monoBd,
    color: '#000',
    textAlign: 'center',
  },
  coinAmount: {
    fontFamily: Fonts.monoBd,
    color: '#FFD700',
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tabText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 10,
    letterSpacing: 1.5,
  },

  scroll: { padding: Spacing.md, paddingTop: Spacing.lg },

  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontFamily: Fonts.bodyBd,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  grid: { gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },

  imgWrap: { width: 100, height: 70, flexShrink: 0 },
  cardImg: { width: 100, height: 70 },
  ownedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownedBadgeText: {
    fontFamily: Fonts.monoBd,
    fontSize: 8,
    color: '#000',
    letterSpacing: 0.8,
  },

  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontFamily: Fonts.bodyBd, fontSize: 13 },
  cardSubtitle: { fontFamily: Fonts.body, fontSize: 11 },
  cardSpec: { fontFamily: Fonts.mono, fontSize: 10 },
  deficitText: { fontFamily: Fonts.mono, fontSize: 10, marginTop: 2 },

  btn: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 92,
  },
  btnText: { fontFamily: Fonts.bodyBd, fontSize: 12 },
})
