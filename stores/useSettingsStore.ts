import { create } from 'zustand'

export const ACCENT_OPTIONS = [
  '#99EA57', // default green
  '#00e5ff', // cyan
  '#ff6b00', // orange
  '#bf00ff', // purple
  '#ffd700', // gold
  '#ff4466', // pink-red
]

interface SettingsState {
  accentColor: string
  units: 'km' | 'mi'
  colorScheme: 'dark' | 'light' | 'system'
  setAccentColor: (c: string) => void
  setUnits: (u: 'km' | 'mi') => void
  setColorScheme: (s: 'dark' | 'light' | 'system') => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  accentColor: '#99EA57',
  units: 'km',
  colorScheme: 'system',
  setAccentColor: (accentColor) => set({ accentColor }),
  setUnits: (units) => set({ units }),
  setColorScheme: (colorScheme) => set({ colorScheme }),
}))
