export const Colors = {
  bg:        '#1a1714',
  bgDeep:    '#0f0d0a',
  bgCard:    '#252018',
  accent:    '#99EA57',
  accentRed: '#cc1a1a',
  text:      '#e8e4dc',
  muted:     '#9a9490',   // war #5a5550 — jetzt deutlich heller
  dim:       '#6a6460',   // war #3a3530 — jetzt sichtbar
  border:    'rgba(255,255,255,0.09)',
  borderBright: 'rgba(255,255,255,0.16)',
} as const

export const Fonts = {
  display: 'BebasNeue_400Regular',
  body:    'SpaceGrotesk_400Regular',
  bodyMd:  'SpaceGrotesk_500Medium',
  bodyBd:  'SpaceGrotesk_700Bold',
  mono:    'SpaceMono_400Regular',
  monoBd:  'SpaceMono_700Bold',
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 999,
} as const
