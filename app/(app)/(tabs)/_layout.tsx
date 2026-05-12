import { Tabs } from 'expo-router'
import { Colors, Fonts } from '@/constants/theme'
import Svg, { Circle, Rect, Path, Polygon } from 'react-native-svg'

function DashIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={8.5} stroke={color} strokeWidth={1.4} fill="none" />
      <Path d="M11 11L7.5 7.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={11} cy={11} r={1.5} fill={color} />
      <Path d="M5.5 14.5A7 7 0 0115 5.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.35} />
    </Svg>
  )
}

function FeedIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Rect x={2} y={4} width={18} height={14} rx={3} stroke={color} strokeWidth={1.4} fill="none" />
      <Polygon points="9,8.5 15.5,11 9,13.5" fill={color} />
    </Svg>
  )
}

function LeaderIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Rect x={1} y={13} width={6} height={8} rx={1} fill={color} opacity={0.45} />
      <Rect x={8} y={8} width={6} height={13} rx={1} fill={color} />
      <Rect x={15} y={10} width={6} height={11} rx={1} fill={color} opacity={0.45} />
      <Path d="M6.5 5.5L11 2l4.5 3.5" stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Circle cx={11} cy={7} r={3.5} stroke={color} strokeWidth={1.4} fill="none" />
      <Path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </Svg>
  )
}

export default function TabLayout() {
  const accent = Colors.accent

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10,8,5,0.97)',
          borderTopColor: 'rgba(255,255,255,0.07)',
          height: 88,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: Colors.dim,
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyBd,
          fontSize: 8,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <DashIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Rangliste',
          tabBarIcon: ({ color }) => <LeaderIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  )
}
