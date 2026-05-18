import { Tabs } from 'expo-router'
import { Fonts } from '@/constants/theme'
import Svg, { Circle, Rect, Path, Polygon } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'

function DashIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={8.5} stroke={color} strokeWidth={1.4} fill="none" />
      <Path d="M11 11L7.5 7.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={11} cy={11} r={1.5} fill={color} />
      <Path d="M5.5 14.5A7 7 0 0115 5.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.35} />
    </Svg>
  )
}

function FeedIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22">
      <Rect x={2} y={4} width={18} height={14} rx={3} stroke={color} strokeWidth={1.4} fill="none" />
      <Polygon points="9,8.5 15.5,11 9,13.5" fill={color} />
    </Svg>
  )
}

function LeaderIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22">
      <Rect x={1} y={13} width={6} height={8} rx={1} fill={color} opacity={0.45} />
      <Rect x={8} y={8} width={6} height={13} rx={1} fill={color} />
      <Rect x={15} y={10} width={6} height={11} rx={1} fill={color} opacity={0.45} />
      <Path d="M6.5 5.5L11 2l4.5 3.5" stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

function StreckeIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22">
      <Circle cx={4.5} cy={4.5} r={2.5} fill={color} />
      <Path d="M4.5 4.5 C 7 6 9 7 11 10 C 13 13 14 16 17.5 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Rect x={15} y={16} width={6} height={6} rx={1} fill="none" stroke={color} strokeWidth={1.4} />
      <Rect x={15} y={16} width={3} height={3} fill={color} opacity={0.75} />
      <Rect x={18} y={19} width={3} height={3} fill={color} opacity={0.75} />
    </Svg>
  )
}

function SensorIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={8.5} stroke={color} strokeWidth={1.4} fill="none" />
      <Path d="M11 6v5l3.5 3.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M5 11h2M15 11h2M11 5v2M11 15v2" stroke={color} strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
    </Svg>
  )
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22">
      <Circle cx={11} cy={7} r={3.5} stroke={color} strokeWidth={1.4} fill="none" />
      <Path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </Svg>
  )
}

export default function TabLayout() {
  const { theme, accent } = useTheme()

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBorder,
          height: 96,
          paddingBottom: 30,
          paddingTop: 6,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: theme.dim,
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyBd,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginTop: 2,
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
        name="strecke"
        options={{
          title: 'Strecke',
          tabBarIcon: ({ color }) => <StreckeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="sensor"
        options={{
          title: 'Sensor',
          tabBarIcon: ({ color }) => <SensorIcon color={color} />,
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
