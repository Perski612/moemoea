import { useColorScheme } from 'react-native'
import { useSettingsStore } from '@/stores/useSettingsStore'

export const DARK_THEME = {
  bg:         '#1a1714',
  bgCard:     '#252018',
  text:       '#e8e4dc',
  muted:      '#9a9490',
  dim:        '#6a6460',
  border:     'rgba(255,255,255,0.09)',
  cardBg:     'rgba(255,255,255,0.025)',
  cardBorder: 'rgba(255,255,255,0.07)',
  tabBar:     'rgba(18,15,10,0.97)',
  tabBorder:  'rgba(255,255,255,0.09)',
}

export const LIGHT_THEME = {
  bg:         '#dfd8cc',
  bgCard:     '#d4ccbf',
  text:       '#1a1714',
  muted:      '#5a5550',
  dim:        '#7a7470',
  border:     'rgba(0,0,0,0.12)',
  cardBg:     'rgba(0,0,0,0.05)',
  cardBorder: 'rgba(0,0,0,0.11)',
  tabBar:     '#d4ccbf',
  tabBorder:  'rgba(0,0,0,0.12)',
}

export type Theme = typeof DARK_THEME

export function useTheme() {
  const systemScheme = useColorScheme()
  const { accentColor, colorScheme } = useSettingsStore()
  const isDark = colorScheme === 'system' ? systemScheme !== 'light' : colorScheme === 'dark'
  const theme = isDark ? DARK_THEME : LIGHT_THEME
  const accent = isDark ? accentColor : '#4a6e10'
  return { theme, accent, isDark }
}
