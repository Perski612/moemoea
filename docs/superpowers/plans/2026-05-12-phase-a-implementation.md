# MOE MOEA Trails — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständige Auth + Profil-Infrastruktur: Registrierung mit Admin-Freischaltung, Pixel-Avatar-Konfigurator, Appwrite-Backend.

**Architecture:** Expo Managed Workflow mit Expo Router (file-based). Appwrite als Backend für Auth und Datenbank. Zustand für globalen State. Routing-Guards in Layout-Komponenten reagieren reaktiv auf Store-Änderungen.

**Tech Stack:** React Native, Expo SDK 52+, Expo Router v4, Appwrite JS SDK v16, Zustand, react-native-svg, @expo-google-fonts, @tanstack/react-query, jest-expo, @testing-library/react-native

---

## Datei-Übersicht

| Datei | Verantwortlichkeit |
|---|---|
| `types/index.ts` | Profile, BikeConfig TypeScript-Interfaces |
| `constants/theme.ts` | Farben, Fonts, Spacing — einzige Design-Source |
| `lib/appwrite.ts` | Appwrite-Client-Singleton + Collection-IDs |
| `stores/useAuthStore.ts` | Session, isApproved, isAdmin, login/logout/checkSession |
| `stores/useProfileStore.ts` | Profile + BikeConfig State + Appwrite-Sync |
| `app/_layout.tsx` | Root: Font-Loading, Polyfills, QueryClientProvider, Stack |
| `app/(auth)/_layout.tsx` | Redirect wenn bereits eingeloggt + approved |
| `app/(auth)/login.tsx` | Login-Screen |
| `app/(auth)/register.tsx` | Registrierungs-Screen |
| `app/(auth)/pending.tsx` | "Warte auf Freischaltung" + 30s-Polling |
| `app/(app)/_layout.tsx` | Auth-Gate: redirect wenn nicht eingeloggt oder nicht approved |
| `app/(app)/(tabs)/_layout.tsx` | Tab-Bar-Konfiguration |
| `app/(app)/(tabs)/dashboard.tsx` | Platzhalter |
| `app/(app)/(tabs)/feed.tsx` | Platzhalter |
| `app/(app)/(tabs)/leaderboard.tsx` | Platzhalter |
| `app/(app)/(tabs)/profile.tsx` | Vollständiger Profil-Screen |
| `app/(app)/admin/index.tsx` | Admin-Panel: Pending/Approved User-Listen |
| `components/PixelAvatar.tsx` | SVG-Pixel-Art-Avatar (Port von HTML-Prototype) |
| `components/BikeConfigurator.tsx` | Avatar-Konfigurator mit Live-Preview |
| `components/ui/Label.tsx` | Uppercase-Label-Komponente |
| `__tests__/stores/useAuthStore.test.ts` | Unit-Tests für Auth-Store-Logik |
| `__tests__/stores/useProfileStore.test.ts` | Unit-Tests für Profile-Store-Logik |
| `__tests__/components/PixelAvatar.test.tsx` | Snapshot-Test für Avatar-Rendering |

---

## Task 1: Appwrite Console Setup

> Kein Code — manuelle Schritte in der Appwrite Console. Muss vor Task 3 abgeschlossen sein.

- [ ] **Schritt 1: Appwrite-Projekt anlegen**

  Gehe zu [cloud.appwrite.io](https://cloud.appwrite.io), erstelle ein neues Projekt mit dem Namen `moe-moea-trails`. Notiere die **Project ID**.

- [ ] **Schritt 2: Web-Platform hinzufügen**

  Im Projekt → Add Platform → Web → Hostname: `localhost`. (Für React Native benötigt man keinen Bundle-Identifier an dieser Stelle — die Web-Platform reicht für den JS SDK.)

- [ ] **Schritt 3: Datenbank anlegen**

  Database → Create Database → ID: `trails-db`, Name: `trails-db`.

- [ ] **Schritt 4: Collection `profiles` anlegen**

  In `trails-db` → Create Collection → ID: `profiles`, Name: `profiles`.

  Attribute hinzufügen:
  | Key | Type | Default | Required |
  |---|---|---|---|
  | `userId` | String (255) | — | ✓ |
  | `username` | String (64) | — | ✓ |
  | `team` | String (128) | — | ✓ |
  | `xp` | Integer | 0 | ✓ |
  | `level` | Integer | 1 | ✓ |
  | `approved` | Boolean | false | ✓ |
  | `isAdmin` | Boolean | false | ✓ |

  Index hinzufügen: Key `userId_index`, Type `key`, Attribute `userId`.

- [ ] **Schritt 5: Collection `bike_configs` anlegen**

  In `trails-db` → Create Collection → ID: `bike_configs`, Name: `bike_configs`.

  Attribute hinzufügen:
  | Key | Type | Default | Required |
  |---|---|---|---|
  | `userId` | String (255) | — | ✓ |
  | `bikeType` | Enum: `hardtail,fully` | `hardtail` | ✓ |
  | `suspension` | Enum: `air,coil` | `air` | ✓ |
  | `material` | Enum: `alu,carbon` | `alu` | ✓ |
  | `bikeColor` | String (16) | `#1a1a1a` | ✓ |
  | `jerseyJ` | String (16) | `#e8e4dc` | ✓ |
  | `jerseyD` | String (16) | `#9a9890` | ✓ |

- [ ] **Schritt 6: Permissions setzen**

  **`profiles` Collection:**
  - Delete alle Default-Permissions
  - Add: `Any` → Read (damit eingeloggte User ihr eigenes Dokument lesen können — Appwrite filtert per Document Security)
  - Enable Document Security (Toggle in Collection Settings)

  **`bike_configs` Collection:**
  - Delete alle Default-Permissions
  - Enable Document Security

- [ ] **Schritt 7: Team `admins` erstellen**

  Auth → Teams → Create Team → ID: `admins`, Name: `admins`.
  Deinen eigenen Account dem Team hinzufügen: Teams → admins → Members → Add Member.

- [ ] **Schritt 8: Notizen**

  Folgende Werte notieren (für `.env.local`):
  - Appwrite Endpoint: `https://cloud.appwrite.io/v1`
  - Project ID: `<deine-project-id>`

---

## Task 2: Projekt-Initialisierung

- [ ] **Schritt 1: Expo-Projekt im bestehenden Verzeichnis anlegen**

  ```bash
  cd /Users/drixxen/Documents/MoeMoeaTrails
  npx create-expo-app@latest . --template blank-typescript
  ```

  Wenn gefragt ob bestehende Dateien überschrieben werden: `No` für `docs/` und `MTB Trail App.html`. `Yes` für neue Expo-Dateien.

- [ ] **Schritt 2: Expo Router + Navigation installieren**

  ```bash
  npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
  ```

- [ ] **Schritt 3: package.json `main` Field setzen**

  In `package.json`:
  ```json
  {
    "main": "expo-router/entry"
  }
  ```

- [ ] **Schritt 4: app.json für Expo Router konfigurieren**

  ```json
  {
    "expo": {
      "name": "MOE MOEA Trails",
      "slug": "moe-moea-trails",
      "version": "1.0.0",
      "scheme": "moemoeatrails",
      "orientation": "portrait",
      "userInterfaceStyle": "dark",
      "splash": {
        "backgroundColor": "#0c0a07"
      },
      "ios": {
        "supportsTablet": false,
        "bundleIdentifier": "de.moemoea.trails"
      },
      "android": {
        "adaptiveIcon": {
          "backgroundColor": "#0c0a07"
        },
        "package": "de.moemoea.trails"
      },
      "plugins": [
        "expo-router"
      ],
      "experiments": {
        "typedRoutes": true
      }
    }
  }
  ```

- [ ] **Schritt 5: Restliche Pakete installieren**

  ```bash
  npx expo install react-native-svg
  npm install appwrite react-native-url-polyfill
  npm install zustand @tanstack/react-query
  npx expo install @expo-google-fonts/bebas-neue @expo-google-fonts/space-grotesk @expo-google-fonts/space-mono expo-font expo-splash-screen
  ```

- [ ] **Schritt 6: Test-Dependencies installieren**

  ```bash
  npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo
  ```

  In `package.json` jest-Konfiguration hinzufügen:
  ```json
  {
    "jest": {
      "preset": "jest-expo",
      "setupFilesAfterFramework": [
        "@testing-library/jest-native/extend-expect"
      ],
      "transformIgnorePatterns": [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
      ]
    }
  }
  ```

- [ ] **Schritt 7: `.env.local` anlegen**

  ```bash
  cat > .env.local << 'EOF'
  EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
  EXPO_PUBLIC_APPWRITE_PROJECT_ID=DEINE_PROJECT_ID_HIER
  EXPO_PUBLIC_DB_ID=trails-db
  EXPO_PUBLIC_PROFILES_ID=profiles
  EXPO_PUBLIC_BIKE_CONFIGS_ID=bike_configs
  EOF
  ```

- [ ] **Schritt 8: `.gitignore` erweitern**

  ```
  # Appwrite
  .env.local
  .env*.local
  ```

- [ ] **Schritt 9: Verzeichnisstruktur anlegen**

  ```bash
  mkdir -p app/\(auth\) app/\(app\)/\(tabs\) app/\(app\)/admin
  mkdir -p components/ui constants lib stores types __tests__/stores __tests__/components
  ```

- [ ] **Schritt 10: Initial-Commit**

  ```bash
  git add -A
  git commit -m "feat: initialize Expo project with dependencies"
  ```

---

## Task 3: Types & Theme Constants

- [ ] **Schritt 1: Types anlegen**

  `types/index.ts`:
  ```ts
  export interface Profile {
    $id: string
    userId: string
    username: string
    team: string
    xp: number
    level: number
    approved: boolean
    isAdmin: boolean
    $createdAt: string
  }

  export interface BikeConfig {
    $id: string
    userId: string
    bikeType: 'hardtail' | 'fully'
    suspension: 'air' | 'coil'
    material: 'alu' | 'carbon'
    bikeColor: string
    jerseyJ: string
    jerseyD: string
  }

  export type Tier = 'rookie' | 'veteran' | 'legend'
  ```

- [ ] **Schritt 2: Theme-Konstanten anlegen**

  `constants/theme.ts`:
  ```ts
  export const Colors = {
    bg:        '#0c0a07',
    bgDeep:    '#080604',
    bgCard:    '#181411',
    accent:    '#39ff14',
    accentRed: '#cc1a1a',
    text:      '#e8e4dc',
    muted:     '#5a5550',
    dim:       '#3a3530',
    border:    'rgba(255,255,255,0.08)',
    borderBright: 'rgba(255,255,255,0.13)',
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
  ```

- [ ] **Schritt 3: Label-UI-Komponente anlegen**

  `components/ui/Label.tsx`:
  ```tsx
  import { Text, StyleSheet } from 'react-native'
  import { Colors, Fonts } from '@/constants/theme'

  interface LabelProps {
    children: string
    color?: string
  }

  export function Label({ children, color = Colors.accent }: LabelProps) {
    return (
      <Text style={[styles.label, { color }]}>{children}</Text>
    )
  }

  const styles = StyleSheet.create({
    label: {
      fontFamily: Fonts.bodyBd,
      fontSize: 9,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
  })
  ```

- [ ] **Schritt 4: Commit**

  ```bash
  git add types/ constants/ components/ui/
  git commit -m "feat: add types, theme constants, and Label component"
  ```

---

## Task 4: Appwrite Client Singleton

- [ ] **Schritt 1: Test schreiben**

  `__tests__/lib/appwrite.test.ts`:
  ```ts
  describe('appwrite singleton', () => {
    it('exports account, databases, and collection IDs', async () => {
      const mod = await import('@/lib/appwrite')
      expect(mod.account).toBeDefined()
      expect(mod.databases).toBeDefined()
      expect(mod.DB_ID).toBe('trails-db')
      expect(mod.PROFILES_ID).toBe('profiles')
      expect(mod.BIKE_CONFIGS_ID).toBe('bike_configs')
    })
  })
  ```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

  ```bash
  npx jest __tests__/lib/appwrite.test.ts
  ```
  Expected: `Cannot find module '@/lib/appwrite'`

- [ ] **Schritt 3: Appwrite Client implementieren**

  `lib/appwrite.ts`:
  ```ts
  import 'react-native-url-polyfill/auto'
  import { Client, Account, Databases, Teams, ID, Permission, Role, Query, Models } from 'appwrite'

  const client = new Client()
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)

  export const account   = new Account(client)
  export const databases = new Databases(client)
  export const teams     = new Teams(client)

  export const DB_ID           = process.env.EXPO_PUBLIC_DB_ID!
  export const PROFILES_ID     = process.env.EXPO_PUBLIC_PROFILES_ID!
  export const BIKE_CONFIGS_ID = process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID!

  export { ID, Permission, Role, Query }
  export type { Models }
  ```

- [ ] **Schritt 4: Test ausführen — erwartet PASS**

  ```bash
  npx jest __tests__/lib/appwrite.test.ts
  ```
  Expected: `PASS`

- [ ] **Schritt 5: `__tests__/lib/` Verzeichnis anlegen und Commit**

  ```bash
  mkdir -p __tests__/lib
  git add lib/ __tests__/lib/
  git commit -m "feat: add Appwrite client singleton"
  ```

---

## Task 5: Auth Store

- [ ] **Schritt 1: Test schreiben**

  `__tests__/stores/useAuthStore.test.ts`:
  ```ts
  import { renderHook, act } from '@testing-library/react-native'

  // Appwrite mocken bevor der Store importiert wird
  jest.mock('@/lib/appwrite', () => ({
    account: {
      getSession: jest.fn(),
      createEmailPasswordSession: jest.fn(),
      deleteSession: jest.fn(),
    },
    databases: {
      getDocument: jest.fn(),
    },
    DB_ID: 'trails-db',
    PROFILES_ID: 'profiles',
  }))

  import { useAuthStore } from '@/stores/useAuthStore'
  import { account, databases } from '@/lib/appwrite'

  const mockAccount = account as jest.Mocked<typeof account>
  const mockDatabases = databases as jest.Mocked<typeof databases>

  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ session: null, isApproved: false, isAdmin: false })
  })

  describe('useAuthStore', () => {
    it('setzt isApproved auf false wenn kein Profile approved', async () => {
      mockAccount.getSession.mockResolvedValueOnce({ $id: 'session-1', userId: 'user-1' } as any)
      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'user-1', userId: 'user-1', approved: false, isAdmin: false,
      } as any)

      const { result } = renderHook(() => useAuthStore())
      await act(async () => { await result.current.checkSession() })

      expect(result.current.isApproved).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })

    it('setzt isApproved auf true wenn Profile approved', async () => {
      mockAccount.getSession.mockResolvedValueOnce({ $id: 'session-1', userId: 'user-1' } as any)
      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'user-1', userId: 'user-1', approved: true, isAdmin: false,
      } as any)

      const { result } = renderHook(() => useAuthStore())
      await act(async () => { await result.current.checkSession() })

      expect(result.current.isApproved).toBe(true)
    })

    it('setzt session auf null bei logout', async () => {
      mockAccount.deleteSession.mockResolvedValueOnce({} as any)
      useAuthStore.setState({ session: { $id: 'session-1' } as any, isApproved: true, isAdmin: false })

      const { result } = renderHook(() => useAuthStore())
      await act(async () => { await result.current.logout() })

      expect(result.current.session).toBeNull()
      expect(result.current.isApproved).toBe(false)
    })

    it('checkSession setzt session auf null wenn getSession wirft', async () => {
      mockAccount.getSession.mockRejectedValueOnce(new Error('no session'))

      const { result } = renderHook(() => useAuthStore())
      await act(async () => { await result.current.checkSession() })

      expect(result.current.session).toBeNull()
    })
  })
  ```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

  ```bash
  npx jest __tests__/stores/useAuthStore.test.ts
  ```
  Expected: `Cannot find module '@/stores/useAuthStore'`

- [ ] **Schritt 3: Auth Store implementieren**

  `stores/useAuthStore.ts`:
  ```ts
  import { create } from 'zustand'
  import { Models } from 'appwrite'
  import { account, databases, DB_ID, PROFILES_ID } from '@/lib/appwrite'

  interface AuthState {
    session: Models.Session | null
    isApproved: boolean
    isAdmin: boolean
    checkSession: () => Promise<void>
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
  }

  export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isApproved: false,
    isAdmin: false,

    checkSession: async () => {
      try {
        const session = await account.getSession('current')
        const profile = await databases.getDocument(DB_ID, PROFILES_ID, session.userId)
        set({
          session,
          isApproved: profile.approved as boolean,
          isAdmin: profile.isAdmin as boolean,
        })
      } catch {
        set({ session: null, isApproved: false, isAdmin: false })
      }
    },

    login: async (email: string, password: string) => {
      const session = await account.createEmailPasswordSession(email, password)
      const profile = await databases.getDocument(DB_ID, PROFILES_ID, session.userId)
      set({
        session,
        isApproved: profile.approved as boolean,
        isAdmin: profile.isAdmin as boolean,
      })
    },

    logout: async () => {
      try {
        await account.deleteSession('current')
      } finally {
        set({ session: null, isApproved: false, isAdmin: false })
      }
    },
  }))
  ```

- [ ] **Schritt 4: Test ausführen — erwartet PASS**

  ```bash
  npx jest __tests__/stores/useAuthStore.test.ts
  ```
  Expected: `PASS` (4 Tests)

- [ ] **Schritt 5: Commit**

  ```bash
  git add stores/useAuthStore.ts __tests__/stores/useAuthStore.test.ts
  git commit -m "feat: add auth store with session management"
  ```

---

## Task 6: Profile Store

- [ ] **Schritt 1: Test schreiben**

  `__tests__/stores/useProfileStore.test.ts`:
  ```ts
  import { renderHook, act } from '@testing-library/react-native'

  jest.mock('@/lib/appwrite', () => ({
    databases: {
      getDocument: jest.fn(),
      createDocument: jest.fn(),
      updateDocument: jest.fn(),
    },
    DB_ID: 'trails-db',
    PROFILES_ID: 'profiles',
    BIKE_CONFIGS_ID: 'bike_configs',
    Permission: { read: jest.fn(() => 'read'), write: jest.fn(() => 'write') },
    Role: { user: jest.fn((id: string) => `user:${id}`), team: jest.fn((t: string) => `team:${t}`) },
  }))

  import { useProfileStore } from '@/stores/useProfileStore'
  import { databases } from '@/lib/appwrite'

  const mockDatabases = databases as jest.Mocked<typeof databases>

  beforeEach(() => {
    jest.clearAllMocks()
    useProfileStore.setState({ profile: null, bikeConfig: null })
  })

  describe('useProfileStore', () => {
    it('syncFromAppwrite befüllt profile und bikeConfig', async () => {
      const mockProfile = { $id: 'u1', userId: 'u1', username: 'MaxTrailblazer', team: 'MOE MOEA Crew', xp: 0, level: 1, approved: true, isAdmin: false }
      const mockBike = { $id: 'u1', userId: 'u1', bikeType: 'hardtail', suspension: 'air', material: 'alu', bikeColor: '#1a1a1a', jerseyJ: '#e8e4dc', jerseyD: '#9a9890' }
      mockDatabases.getDocument
        .mockResolvedValueOnce(mockProfile as any)
        .mockResolvedValueOnce(mockBike as any)

      const { result } = renderHook(() => useProfileStore())
      await act(async () => { await result.current.syncFromAppwrite('u1') })

      expect(result.current.profile?.username).toBe('MaxTrailblazer')
      expect(result.current.bikeConfig?.bikeType).toBe('hardtail')
    })

    it('saveBikeConfig erstellt neues Dokument wenn keines existiert', async () => {
      mockDatabases.createDocument.mockResolvedValueOnce({ $id: 'u1' } as any)
      useProfileStore.setState({ profile: { $id: 'u1', userId: 'u1' } as any, bikeConfig: null })

      const newConfig = { bikeType: 'fully', suspension: 'coil', material: 'carbon', bikeColor: '#1a3a99', jerseyJ: '#cc2200', jerseyD: '#881500' } as any

      const { result } = renderHook(() => useProfileStore())
      await act(async () => { await result.current.saveBikeConfig(newConfig) })

      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1)
    })

    it('saveBikeConfig aktualisiert wenn Dokument existiert (409)', async () => {
      const conflict = Object.assign(new Error('conflict'), { code: 409 })
      mockDatabases.createDocument.mockRejectedValueOnce(conflict)
      mockDatabases.updateDocument.mockResolvedValueOnce({ $id: 'u1' } as any)
      useProfileStore.setState({ profile: { $id: 'u1', userId: 'u1' } as any, bikeConfig: null })

      const newConfig = { bikeType: 'fully', suspension: 'air', material: 'alu', bikeColor: '#555', jerseyJ: '#e8e4dc', jerseyD: '#9a9890' } as any

      const { result } = renderHook(() => useProfileStore())
      await act(async () => { await result.current.saveBikeConfig(newConfig) })

      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1)
    })
  })
  ```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

  ```bash
  npx jest __tests__/stores/useProfileStore.test.ts
  ```
  Expected: `Cannot find module '@/stores/useProfileStore'`

- [ ] **Schritt 3: Profile Store implementieren**

  `stores/useProfileStore.ts`:
  ```ts
  import { create } from 'zustand'
  import { databases, DB_ID, PROFILES_ID, BIKE_CONFIGS_ID, Permission, Role, ID } from '@/lib/appwrite'
  import type { Profile, BikeConfig } from '@/types'

  interface ProfileState {
    profile: Profile | null
    bikeConfig: BikeConfig | null
    setProfile: (p: Profile) => void
    setBikeConfig: (b: BikeConfig) => void
    syncFromAppwrite: (userId: string) => Promise<void>
    saveBikeConfig: (config: Omit<BikeConfig, '$id' | 'userId'>) => Promise<void>
    clear: () => void
  }

  export const useProfileStore = create<ProfileState>((set, get) => ({
    profile: null,
    bikeConfig: null,

    setProfile: (profile) => set({ profile }),
    setBikeConfig: (bikeConfig) => set({ bikeConfig }),
    clear: () => set({ profile: null, bikeConfig: null }),

    syncFromAppwrite: async (userId: string) => {
      const [profile, bikeConfig] = await Promise.all([
        databases.getDocument(DB_ID, PROFILES_ID, userId),
        databases.getDocument(DB_ID, BIKE_CONFIGS_ID, userId).catch(() => null),
      ])
      set({ profile: profile as unknown as Profile, bikeConfig: bikeConfig as unknown as BikeConfig | null })
    },

    saveBikeConfig: async (config) => {
      const userId = get().profile?.$id
      if (!userId) throw new Error('No profile loaded')

      const permissions = [
        Permission.read(Role.user(userId)),
        Permission.write(Role.user(userId)),
      ]

      let doc: unknown
      try {
        doc = await databases.createDocument(DB_ID, BIKE_CONFIGS_ID, userId, { userId, ...config }, permissions)
      } catch (e: any) {
        if (e?.code === 409) {
          doc = await databases.updateDocument(DB_ID, BIKE_CONFIGS_ID, userId, config)
        } else {
          throw e
        }
      }
      set({ bikeConfig: doc as unknown as BikeConfig })
    },
  }))
  ```

- [ ] **Schritt 4: Test ausführen — erwartet PASS**

  ```bash
  npx jest __tests__/stores/useProfileStore.test.ts
  ```
  Expected: `PASS` (3 Tests)

- [ ] **Schritt 5: Commit**

  ```bash
  git add stores/useProfileStore.ts __tests__/stores/useProfileStore.test.ts
  git commit -m "feat: add profile store with Appwrite sync and bike config save"
  ```

---

## Task 7: Root Layout & Providers

- [ ] **Schritt 1: Root Layout anlegen**

  `app/_layout.tsx`:
  ```tsx
  import 'react-native-url-polyfill/auto'
  import { useEffect } from 'react'
  import { Stack } from 'expo-router'
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
  import {
    useFonts,
    BebasNeue_400Regular,
  } from '@expo-google-fonts/bebas-neue'
  import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  } from '@expo-google-fonts/space-grotesk'
  import {
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  } from '@expo-google-fonts/space-mono'
  import * as SplashScreen from 'expo-splash-screen'
  import { useAuthStore } from '@/stores/useAuthStore'

  SplashScreen.preventAutoHideAsync()

  const queryClient = new QueryClient()

  export default function RootLayout() {
    const checkSession = useAuthStore((s) => s.checkSession)

    const [fontsLoaded, fontError] = useFonts({
      BebasNeue_400Regular,
      SpaceGrotesk_400Regular,
      SpaceGrotesk_500Medium,
      SpaceGrotesk_700Bold,
      SpaceMono_400Regular,
      SpaceMono_700Bold,
    })

    useEffect(() => {
      if (fontsLoaded || fontError) {
        checkSession().finally(() => SplashScreen.hideAsync())
      }
    }, [fontsLoaded, fontError, checkSession])

    if (!fontsLoaded && !fontError) return null

    return (
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    )
  }
  ```

- [ ] **Schritt 2: tsconfig.json für Path-Aliases prüfen**

  In `tsconfig.json` sicherstellen dass `@/*` aufgelöst wird:
  ```json
  {
    "extends": "expo/tsconfig.base",
    "compilerOptions": {
      "strict": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["./*"]
      }
    }
  }
  ```

- [ ] **Schritt 3: App starten und prüfen dass sie lädt**

  ```bash
  npx expo start
  ```
  Expected: Metro Bundler startet, keine Fehler in der Konsole, Splash Screen erscheint und verschwindet.

- [ ] **Schritt 4: Commit**

  ```bash
  git add app/_layout.tsx tsconfig.json
  git commit -m "feat: add root layout with font loading, QueryClient, and session check"
  ```

---

## Task 8: Auth Screens

- [ ] **Schritt 1: Auth Group Layout**

  `app/(auth)/_layout.tsx`:
  ```tsx
  import { Stack, Redirect } from 'expo-router'
  import { useAuthStore } from '@/stores/useAuthStore'

  export default function AuthLayout() {
    const { session, isApproved } = useAuthStore()

    if (session && isApproved) {
      return <Redirect href="/(app)/(tabs)/dashboard" />
    }

    return <Stack screenOptions={{ headerShown: false }} />
  }
  ```

- [ ] **Schritt 2: Login-Screen**

  `app/(auth)/login.tsx`:
  ```tsx
  import { useState } from 'react'
  import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
  import { Link } from 'expo-router'
  import { useAuthStore } from '@/stores/useAuthStore'
  import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

  export default function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const login = useAuthStore((s) => s.login)

    const handleLogin = async () => {
      if (!email || !password) {
        Alert.alert('Fehler', 'Email und Passwort erforderlich.')
        return
      }
      setLoading(true)
      try {
        await login(email.trim(), password)
        // syncFromAppwrite läuft in (app)/_layout.tsx via useEffect
      } catch (e: any) {
        Alert.alert('Login fehlgeschlagen', e?.message ?? 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <View style={styles.brand}>
            <Text style={styles.brandMain}>MOE MOEA</Text>
            <Text style={styles.brandSub}>TRAILS</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Passwort"
            placeholderTextColor={Colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Einloggen…' : 'Einloggen'}</Text>
          </TouchableOpacity>

          <Link href="/(auth)/register" style={styles.link}>
            <Text style={styles.linkText}>Noch kein Account? Registrieren</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    )
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
    brand: { alignItems: 'center', marginBottom: 48 },
    brandMain: { fontFamily: Fonts.display, fontSize: 48, letterSpacing: 4, color: Colors.text },
    brandSub: { fontFamily: Fonts.display, fontSize: 18, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },
    input: {
      fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
      backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    },
    btn: {
      backgroundColor: Colors.accent, borderRadius: Radius.md,
      padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
    link: { marginTop: Spacing.lg, alignSelf: 'center' },
    linkText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  })
  ```

- [ ] **Schritt 3: Register-Screen**

  `app/(auth)/register.tsx`:
  ```tsx
  import { useState } from 'react'
  import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
  import { Link } from 'expo-router'
  import { ID, Permission, Role, account, databases, DB_ID, PROFILES_ID } from '@/lib/appwrite'
  import { useAuthStore } from '@/stores/useAuthStore'
  import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

  const TEAMS = ['MOE MOEA Crew', 'Singletrack Sisters', 'Trail Devils', 'Dirt Crew', 'Solo']

  export default function RegisterScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [team, setTeam] = useState(TEAMS[0])
    const [loading, setLoading] = useState(false)

    const checkSession = useAuthStore((s) => s.checkSession)

    const handleRegister = async () => {
      if (!email || !password || !username) {
        Alert.alert('Fehler', 'Alle Felder sind erforderlich.')
        return
      }
      if (password.length < 8) {
        Alert.alert('Fehler', 'Passwort muss mindestens 8 Zeichen lang sein.')
        return
      }
      setLoading(true)
      try {
        const user = await account.create(ID.unique(), email.trim(), password, username)
        await account.createEmailPasswordSession(email.trim(), password)

        const permissions = [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
          Permission.read(Role.team('admins')),
          Permission.write(Role.team('admins')),
        ]

        await databases.createDocument(DB_ID, PROFILES_ID, user.$id, {
          userId: user.$id,
          username,
          team,
          xp: 0,
          level: 1,
          approved: false,
          isAdmin: false,
        }, permissions)

        await checkSession()
      } catch (e: any) {
        Alert.alert('Registrierung fehlgeschlagen', e?.message ?? 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.inner}>
          <View style={styles.brand}>
            <Text style={styles.brandMain}>MOE MOEA</Text>
            <Text style={styles.brandSub}>TRAILS</Text>
          </View>
          <Text style={styles.title}>Account erstellen</Text>

          <TextInput style={styles.input} placeholder="Username" placeholderTextColor={Colors.muted}
            value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.muted}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Passwort (min. 8 Zeichen)" placeholderTextColor={Colors.muted}
            value={password} onChangeText={setPassword} secureTextEntry />

          <Text style={styles.teamLabel}>Team</Text>
          <View style={styles.teamRow}>
            {TEAMS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.teamChip, team === t && styles.teamChipActive]}
                onPress={() => setTeam(t)}
              >
                <Text style={[styles.teamChipText, team === t && styles.teamChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Registrieren…' : 'Registrieren'}</Text>
          </TouchableOpacity>

          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>Bereits registriert? Einloggen</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
    brand: { alignItems: 'center', marginBottom: 32 },
    brandMain: { fontFamily: Fonts.display, fontSize: 40, letterSpacing: 4, color: Colors.text },
    brandSub: { fontFamily: Fonts.display, fontSize: 16, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },
    title: { fontFamily: Fonts.bodyBd, fontSize: 18, color: Colors.text, marginBottom: Spacing.md },
    input: {
      fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
      backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    },
    teamLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 2, color: Colors.muted, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.sm },
    teamRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
    teamChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
    teamChipActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}18` },
    teamChipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
    teamChipTextActive: { color: Colors.accent },
    btn: { backgroundColor: Colors.accent, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
    btnDisabled: { opacity: 0.5 },
    btnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
    link: { marginTop: Spacing.lg, alignSelf: 'center' },
    linkText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  })
  ```

- [ ] **Schritt 4: Pending-Screen**

  `app/(auth)/pending.tsx`:
  ```tsx
  import { useEffect } from 'react'
  import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
  import { useAuthStore } from '@/stores/useAuthStore'
  import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'

  export default function PendingScreen() {
    const { checkSession, logout, isApproved } = useAuthStore()

    useEffect(() => {
      const interval = setInterval(checkSession, 30_000)
      return () => clearInterval(interval)
    }, [checkSession])

    // Wenn isApproved sich auf true ändert, reagiert (auth)/_layout.tsx
    // und redirectet automatisch zu (app)/(tabs)/dashboard

    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.brand}>
            <Text style={styles.brandMain}>MOE MOEA</Text>
            <Text style={styles.brandSub}>TRAILS</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.dot} />
            <Text style={styles.title}>Warte auf Freischaltung</Text>
            <Text style={styles.body}>
              Dein Account wurde erstellt und wartet auf die Genehmigung durch einen Admin.{'\n\n'}
              Die App überprüft automatisch alle 30 Sekunden.
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Ausloggen</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
    brand: { alignItems: 'center', marginBottom: 48 },
    brandMain: { fontFamily: Fonts.display, fontSize: 40, letterSpacing: 4, color: Colors.text },
    brandSub: { fontFamily: Fonts.display, fontSize: 16, letterSpacing: 8, color: Colors.accentRed, marginTop: -4 },
    card: {
      backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowRadius: 8, shadowOpacity: 1 },
    title: { fontFamily: Fonts.bodyBd, fontSize: 18, color: Colors.text, textAlign: 'center' },
    body: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
    logoutBtn: { marginTop: Spacing.xl, alignSelf: 'center', padding: Spacing.sm },
    logoutText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  })
  ```

- [ ] **Schritt 5: In Expo starten und Auth-Flow testen**

  ```bash
  npx expo start
  ```

  Testen:
  - Login-Screen erscheint beim ersten Start ✓
  - Register führt zu Pending-Screen ✓
  - Logout auf Pending-Screen kehrt zu Login zurück ✓

- [ ] **Schritt 6: Commit**

  ```bash
  git add app/\(auth\)/
  git commit -m "feat: add auth screens (login, register, pending with polling)"
  ```

---

## Task 9: App Layout Guard + Placeholder Tabs

- [ ] **Schritt 1: App Group Layout Guard**

  `app/(app)/_layout.tsx`:
  ```tsx
  import { Stack, Redirect } from 'expo-router'
  import { useAuthStore } from '@/stores/useAuthStore'
  import { useProfileStore } from '@/stores/useProfileStore'
  import { useEffect } from 'react'

  export default function AppLayout() {
    const { session, isApproved } = useAuthStore()
    const syncFromAppwrite = useProfileStore((s) => s.syncFromAppwrite)

    useEffect(() => {
      if (session && isApproved) {
        syncFromAppwrite(session.userId)
      }
    }, [session, isApproved, syncFromAppwrite])

    if (!session) return <Redirect href="/(auth)/login" />
    if (!isApproved) return <Redirect href="/(auth)/pending" />

    return <Stack screenOptions={{ headerShown: false }} />
  }
  ```

- [ ] **Schritt 2: Tab-Bar Layout**

  `app/(app)/(tabs)/_layout.tsx`:
  ```tsx
  import { Tabs } from 'expo-router'
  import { View, Text, StyleSheet } from 'react-native'
  import { Colors, Fonts } from '@/constants/theme'
  import { useAuthStore } from '@/stores/useAuthStore'
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
  ```

- [ ] **Schritt 3: Platzhalter-Screens anlegen**

  `app/(app)/(tabs)/dashboard.tsx`:
  ```tsx
  import { View, Text, StyleSheet } from 'react-native'
  import { Colors, Fonts } from '@/constants/theme'

  export default function DashboardScreen() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>DASHBOARD</Text>
        <Text style={styles.sub}>Kommt in Phase C</Text>
      </View>
    )
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: 4, color: Colors.text },
    sub: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, marginTop: 8 },
  })
  ```

  `app/(app)/(tabs)/feed.tsx`:
  ```tsx
  import { View, Text, StyleSheet } from 'react-native'
  import { Colors, Fonts } from '@/constants/theme'

  export default function FeedScreen() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>FEED</Text>
        <Text style={styles.sub}>Kommt in Phase B</Text>
      </View>
    )
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: 4, color: Colors.text },
    sub: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, marginTop: 8 },
  })
  ```

  `app/(app)/(tabs)/leaderboard.tsx`:
  ```tsx
  import { View, Text, StyleSheet } from 'react-native'
  import { Colors, Fonts } from '@/constants/theme'

  export default function LeaderboardScreen() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>RANGLISTE</Text>
        <Text style={styles.sub}>Kommt in Phase B/C</Text>
      </View>
    )
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: 4, color: Colors.text },
    sub: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, marginTop: 8 },
  })
  ```

- [ ] **Schritt 4: App testen — vollständiger Auth-Flow**

  ```bash
  npx expo start
  ```

  Testen:
  - Registrierung → Pending-Screen ✓
  - Nach manuellem `approved: true` in Appwrite Console → 30s warten → App öffnet sich ✓
  - Tab-Bar mit 4 Icons ist sichtbar ✓
  - Platzhalter-Screens erscheinen beim Tab-Wechsel ✓

- [ ] **Schritt 5: Commit**

  ```bash
  git add app/\(app\)/
  git commit -m "feat: add app layout guard and placeholder tab screens"
  ```

---

## Task 10: PixelAvatar Komponente

- [ ] **Schritt 1: Snapshot-Test schreiben**

  `__tests__/components/PixelAvatar.test.tsx`:
  ```tsx
  import React from 'react'
  import { render } from '@testing-library/react-native'
  import { PixelAvatar } from '@/components/PixelAvatar'

  describe('PixelAvatar', () => {
    it('rendert ohne Fehler mit Default-Props', () => {
      const { toJSON } = render(<PixelAvatar />)
      expect(toJSON()).toMatchSnapshot()
    })

    it('rendert Fully-Bike mit Coil-Fork anders als Hardtail-Air', () => {
      const { toJSON: toJSONFully } = render(<PixelAvatar bikeType="fully" suspType="coil" />)
      const { toJSON: toJSONHardtail } = render(<PixelAvatar bikeType="hardtail" suspType="air" />)
      expect(JSON.stringify(toJSONFully())).not.toBe(JSON.stringify(toJSONHardtail()))
    })

    it('wendet accentColor als Helmet-Farbe an', () => {
      const { toJSON } = render(<PixelAvatar accentColor="#ff0000" />)
      const json = JSON.stringify(toJSON())
      expect(json).toContain('#ff0000')
    })
  })
  ```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

  ```bash
  npx jest __tests__/components/PixelAvatar.test.tsx
  ```
  Expected: `Cannot find module '@/components/PixelAvatar'`

- [ ] **Schritt 3: PixelAvatar implementieren**

  `components/PixelAvatar.tsx`:
  ```tsx
  import Svg, { Rect } from 'react-native-svg'
  import type { Tier } from '@/types'

  const PALETTES: Record<Tier, { H: string; V: string; S: string; E: string }> = {
    rookie:  { H: '#39ff14', V: '#1a4a08', S: '#d4a574', E: '#111' },
    veteran: { H: '#ffd700', V: '#7a5500', S: '#d4a574', E: '#111' },
    legend:  { H: '#bf00ff', V: '#5a0080', S: '#d4a574', E: '#111' },
  }

  function buildRows(bikeType: 'hardtail' | 'fully', suspType: 'air' | 'coil'): string[] {
    const frameRow = bikeType === 'fully' ? '.BBBBXBBBB..' : '.BBBBBBBBB..'
    const forkRow  = suspType  === 'coil' ? 'BKB......BKB' : 'BB.......BB.'
    return [
      '....HHHH....',
      '...HHHHHH...',
      '..HHHHHHHH..',
      '..HVVVVVHH..',
      '..HSSSSSHH..',
      '..HSE.E.SH..',
      '..HSSSSSHH..',
      'BJJJJJJJJJJB',
      'BJJJDDJJJJJB',
      '..JJJJJJJJJ.',
      '...JJJJJJJ..',
      '....JJ.JJ...',
      '...BBB.BBB..',
      frameRow,
      forkRow,
      'WW.......WW.',
      '.WWW...WWW..',
    ]
  }

  interface PixelAvatarProps {
    tier?: Tier
    px?: number
    accentColor?: string
    bikeColor?: string
    jerseyJ?: string
    jerseyD?: string
    bikeType?: 'hardtail' | 'fully'
    suspType?: 'air' | 'coil'
  }

  export function PixelAvatar({
    tier      = 'rookie',
    px        = 3,
    accentColor,
    bikeColor,
    jerseyJ,
    jerseyD,
    bikeType  = 'hardtail',
    suspType  = 'air',
  }: PixelAvatarProps) {
    const base = PALETTES[tier] ?? PALETTES.rookie
    const pal: Record<string, string> = {
      H: accentColor ?? base.H,
      V: base.V,
      S: base.S,
      E: base.E,
      J: jerseyJ ?? '#e8e4dc',
      D: jerseyD ?? '#9a9890',
      B: bikeColor ?? '#1a1a1a',
      W: '#0d0d0d',
      X: '#888888',
      K: '#666666',
    }

    const rows = buildRows(bikeType, suspType)
    const cols = rows[0].length
    const width  = cols * px
    const height = rows.length * px

    const rects = rows.flatMap((row, ri) =>
      [...row].flatMap((ch, ci) =>
        ch === '.' ? [] : [
          <Rect
            key={`${ri}-${ci}`}
            x={ci * px}
            y={ri * px}
            width={px}
            height={px}
            fill={pal[ch] ?? '#fff'}
          />
        ]
      )
    )

    return (
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ imageRendering: 'pixelated' } as any}
      >
        {rects}
      </Svg>
    )
  }
  ```

- [ ] **Schritt 4: Test ausführen — erwartet PASS**

  ```bash
  npx jest __tests__/components/PixelAvatar.test.tsx
  ```
  Expected: `PASS` (3 Tests, Snapshot wird erstellt)

- [ ] **Schritt 5: Commit**

  ```bash
  git add components/PixelAvatar.tsx __tests__/components/PixelAvatar.test.tsx
  git commit -m "feat: add PixelAvatar component (port from HTML prototype)"
  ```

---

## Task 11: BikeConfigurator Komponente

- [ ] **Schritt 1: BikeConfigurator implementieren**

  `components/BikeConfigurator.tsx`:
  ```tsx
  import { useState } from 'react'
  import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
  import { PixelAvatar } from './PixelAvatar'
  import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
  import type { BikeConfig } from '@/types'

  const BIKE_COLORS = ['#1a1a1a', '#555555', '#1a3a99', '#991a1a', '#1a6620', '#997700']
  const JERSEY_OPTS = [
    { J: '#e8e4dc', D: '#9a9890' },
    { J: '#1a1a1a', D: '#333333' },
    { J: '#cc2200', D: '#881500' },
  ]

  interface Props {
    initial: Omit<BikeConfig, '$id' | 'userId'>
    accent?: string
    onSave: (config: Omit<BikeConfig, '$id' | 'userId'>) => Promise<void>
  }

  type Draft = Omit<BikeConfig, '$id' | 'userId'>

  export function BikeConfigurator({ initial, accent = Colors.accent, onSave }: Props) {
    const [draft, setDraft] = useState<Draft>(initial)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const set = (patch: Partial<Draft>) => {
      setDraft((prev) => ({ ...prev, ...patch }))
      setSaved(false)
    }

    const handleSave = async () => {
      setSaving(true)
      try {
        await onSave(draft)
        setSaved(true)
      } finally {
        setSaving(false)
      }
    }

    return (
      <View style={styles.container}>
        {/* Live Preview */}
        <View style={[styles.preview, { borderColor: `${accent}33` }]}>
          <PixelAvatar
            tier="rookie"
            px={5}
            accentColor={accent}
            bikeColor={draft.bikeColor}
            jerseyJ={draft.jerseyJ}
            jerseyD={draft.jerseyD}
            bikeType={draft.bikeType}
            suspType={draft.suspension}
          />
        </View>

        <ConfigRow label="Fahrrad-Typ">
          <SegBtn
            options={['Hardtail', 'Fully']}
            active={draft.bikeType === 'fully' ? 'Fully' : 'Hardtail'}
            onSelect={(v) => set({ bikeType: v === 'Fully' ? 'fully' : 'hardtail' })}
            accent={accent}
          />
        </ConfigRow>

        <ConfigRow label="Federgabel / Dämpfer">
          <SegBtn
            options={['Air', 'Coil']}
            active={draft.suspension === 'coil' ? 'Coil' : 'Air'}
            onSelect={(v) => set({ suspension: v.toLowerCase() as 'air' | 'coil' })}
            accent={accent}
          />
        </ConfigRow>

        <ConfigRow label="Rahmen-Material">
          <SegBtn
            options={['Aluminium', 'Carbon']}
            active={draft.material === 'carbon' ? 'Carbon' : 'Aluminium'}
            onSelect={(v) => set({ material: v.toLowerCase() as 'alu' | 'carbon' })}
            accent={accent}
          />
        </ConfigRow>

        <ConfigRow label="Rahmen-Farbe">
          <View style={styles.swatchRow}>
            {BIKE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  draft.bikeColor === c && { borderColor: accent, borderWidth: 2.5 },
                ]}
                onPress={() => set({ bikeColor: c })}
              />
            ))}
          </View>
        </ConfigRow>

        <ConfigRow label="Trikot-Farbe">
          <View style={styles.swatchRow}>
            {JERSEY_OPTS.map((j) => (
              <TouchableOpacity
                key={j.J}
                style={[
                  styles.swatch,
                  { backgroundColor: j.J },
                  draft.jerseyJ === j.J && { borderColor: accent, borderWidth: 2.5 },
                ]}
                onPress={() => set({ jerseyJ: j.J, jerseyD: j.D })}
              />
            ))}
          </View>
        </ConfigRow>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? `${accent}33` : accent }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text style={[styles.saveBtnText, saved && { color: accent }]}>
                {saved ? '✓ Gespeichert' : 'Speichern'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    )
  }

  function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>{label}</Text>
        {children}
      </View>
    )
  }

  function SegBtn({ options, active, onSelect, accent }: { options: string[]; active: string; onSelect: (v: string) => void; accent: string }) {
    return (
      <View style={styles.segRow}>
        {options.map((o) => (
          <TouchableOpacity
            key={o}
            style={[styles.segBtn, active === o && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => onSelect(o)}
          >
            <Text style={[styles.segBtnText, active === o && { color: '#000' }]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  const styles = StyleSheet.create({
    container: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.md },
    preview: { alignItems: 'center', marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, backgroundColor: Colors.bg },
    configRow: { marginBottom: Spacing.md },
    configLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase', marginBottom: Spacing.xs },
    swatchRow: { flexDirection: 'row', gap: 8 },
    swatch: { width: 30, height: 30, borderRadius: 7, borderWidth: 2, borderColor: 'transparent' },
    segRow: { flexDirection: 'row', gap: 4 },
    segBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: 7, alignItems: 'center' },
    segBtnText: { fontFamily: Fonts.bodyBd, fontSize: 11, color: Colors.muted },
    saveBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
    saveBtnText: { fontFamily: Fonts.bodyBd, fontSize: 14, color: '#000' },
  })
  ```

- [ ] **Schritt 2: Commit**

  ```bash
  git add components/BikeConfigurator.tsx
  git commit -m "feat: add BikeConfigurator component with live preview"
  ```

---

## Task 12: Profil-Screen

- [ ] **Schritt 1: App-Header-Komponente anlegen**

  `components/ui/AppHeader.tsx`:
  ```tsx
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
  ```

- [ ] **Schritt 2: Profil-Screen implementieren**

  `app/(app)/(tabs)/profile.tsx`:
  ```tsx
  import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
  import { router } from 'expo-router'
  import { AppHeader } from '@/components/ui/AppHeader'
  import { PixelAvatar } from '@/components/PixelAvatar'
  import { BikeConfigurator } from '@/components/BikeConfigurator'
  import { Label } from '@/components/ui/Label'
  import { useAuthStore } from '@/stores/useAuthStore'
  import { useProfileStore } from '@/stores/useProfileStore'
  import { Colors, Fonts, Spacing, Radius } from '@/constants/theme'
  import type { BikeConfig } from '@/types'

  const DEFAULT_BIKE: Omit<BikeConfig, '$id' | 'userId'> = {
    bikeType: 'hardtail',
    suspension: 'air',
    material: 'alu',
    bikeColor: '#1a1a1a',
    jerseyJ: '#e8e4dc',
    jerseyD: '#9a9890',
  }

  export default function ProfileScreen() {
    const { logout, isAdmin } = useAuthStore()
    const { profile, bikeConfig, setBikeConfig } = useProfileStore()
    const saveBikeConfig = useProfileStore((s) => s.saveBikeConfig)

    const xp    = profile?.xp    ?? 0
    const xpMax = 4000
    const level = profile?.level ?? 1

    const handleSave = async (config: Omit<BikeConfig, '$id' | 'userId'>) => {
      await saveBikeConfig(config)
    }

    const handleLogout = async () => {
      await logout()
    }

    const bikeInitial = bikeConfig
      ? { bikeType: bikeConfig.bikeType, suspension: bikeConfig.suspension, material: bikeConfig.material, bikeColor: bikeConfig.bikeColor, jerseyJ: bikeConfig.jerseyJ, jerseyD: bikeConfig.jerseyD }
      : DEFAULT_BIKE

    return (
      <View style={styles.screen}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Identity */}
          <View style={styles.identity}>
            <View style={styles.avatarWrapper}>
              <PixelAvatar
                tier="rookie" px={4} accentColor={Colors.accent}
                bikeColor={bikeConfig?.bikeColor} jerseyJ={bikeConfig?.jerseyJ}
                jerseyD={bikeConfig?.jerseyD} bikeType={bikeConfig?.bikeType ?? 'hardtail'}
                suspType={bikeConfig?.suspension ?? 'air'}
              />
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.username}>{profile?.username ?? '—'}</Text>
              <Text style={styles.team}>{profile?.team ?? '—'}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {level}</Text>
              </View>
            </View>
          </View>

          {/* XP Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>ERFAHRUNG</Text>
              <Text style={styles.xpValue}>{xp.toLocaleString('de')} / {xpMax.toLocaleString('de')} XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${(xp / xpMax) * 100}%` }]} />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[['—', 'Distanz'], ['—', 'Runs'], ['—', 'Fires'], ['—', 'Rang']].map(([v, l]) => (
              <View key={l} style={styles.stat}>
                <Text style={styles.statVal}>{v}</Text>
                <Text style={styles.statLbl}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Avatar Konfigurator */}
          <View style={styles.section}>
            <Label>Avatar Konfigurator</Label>
            <BikeConfigurator
              initial={bikeInitial}
              accent={Colors.accent}
              onSave={handleSave}
            />
          </View>

          {/* Admin Button */}
          {isAdmin && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/(app)/admin')}>
                <Text style={styles.adminBtnText}>Admin-Panel öffnen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Ausloggen</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    )
  }

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bg },
    scroll: { padding: Spacing.md, paddingBottom: 120 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    avatarWrapper: {
      width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.bgCard,
      borderWidth: 2, borderColor: `${Colors.accent}55`,
      alignItems: 'center', justifyContent: 'center',
    },
    identityInfo: { flex: 1 },
    username: { fontFamily: Fonts.bodyBd, fontSize: 20, color: Colors.text },
    team: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
    levelBadge: {
      alignSelf: 'flex-start', marginTop: 6, borderWidth: 1, borderColor: `${Colors.accent}44`,
      backgroundColor: `${Colors.accent}1a`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2,
    },
    levelText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.accent },
    xpSection: { marginBottom: Spacing.md },
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    xpLabel: { fontFamily: Fonts.bodyBd, fontSize: 9, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase' },
    xpValue: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.accent },
    xpTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99 },
    xpFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 99 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
    stat: { alignItems: 'center' },
    statVal: { fontFamily: Fonts.monoBd, fontSize: 15, color: Colors.text },
    statLbl: { fontFamily: Fonts.bodyBd, fontSize: 8, letterSpacing: 1.5, color: Colors.muted, textTransform: 'uppercase' },
    section: { marginBottom: Spacing.lg },
    adminBtn: {
      borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
      padding: Spacing.md, alignItems: 'center',
    },
    adminBtnText: { fontFamily: Fonts.bodyBd, fontSize: 13, color: Colors.muted },
    logoutBtn: { alignSelf: 'center', padding: Spacing.sm, marginBottom: Spacing.lg },
    logoutText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  })
  ```

- [ ] **Schritt 3: In App testen**

  ```bash
  npx expo start
  ```

  Testen:
  - Profil-Tab zeigt Avatar, Username, Team, Level ✓
  - Bike-Konfigurator aktualisiert Avatar live ✓
  - "Speichern" schreibt in Appwrite und zeigt "✓ Gespeichert" ✓
  - AppHeader zeigt Avatar rechts oben ✓
  - Bei `isAdmin: true` in Profil → Admin-Button sichtbar ✓

- [ ] **Schritt 4: Commit**

  ```bash
  git add app/\(app\)/\(tabs\)/profile.tsx components/ui/AppHeader.tsx
  git commit -m "feat: add profile screen with avatar, XP bar, and bike configurator"
  ```

---

## Task 13: Admin-Panel

- [ ] **Schritt 1: Admin-Screen implementieren**

  `app/(app)/admin/index.tsx`:
  ```tsx
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

    const list   = segment === 'pending' ? pending : approved
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
  ```

- [ ] **Schritt 2: Admin-Screen in Appwrite testen**

  In Appwrite Console: eigenes `profiles`-Dokument auf `isAdmin: true` setzen + User dem Team `admins` hinzufügen.

  ```bash
  npx expo start
  ```

  Testen:
  - Admin-Button auf Profil-Screen sichtbar ✓
  - Admin-Panel öffnet sich ✓
  - "Ausstehend"-Segment zeigt neue Registrierungen ✓
  - "Freischalten" setzt `approved: true` → User verschwindet aus Liste ✓
  - "Genehmigt"-Segment zeigt freigeschaltete User ✓

- [ ] **Schritt 3: Alle Tests ausführen**

  ```bash
  npx jest
  ```
  Expected: `PASS` für alle Test-Suites

- [ ] **Schritt 4: Finaler Commit**

  ```bash
  git add app/\(app\)/admin/ components/ui/AppHeader.tsx
  git commit -m "feat: add admin panel with pending/approved user management"
  ```

---

## Gesamtübersicht Phase A: Done-Checklist

- [ ] Appwrite-Projekt mit zwei Collections und Team `admins` konfiguriert
- [ ] Expo-Projekt mit Expo Router, Fonts und allen Dependencies läuft
- [ ] Auth-Flow: Registrierung → Pending → Freischaltung → App
- [ ] Auth-Gate leitet korrekt um in alle Richtungen
- [ ] Profil-Screen mit Avatar, XP-Balken, Bike-Konfigurator
- [ ] BikeConfigurator speichert in Appwrite und aktualisiert alle Avatare
- [ ] Admin-Panel: Pending-Liste, Freischalten, Approved-Liste
- [ ] Alle Unit- und Snapshot-Tests grün
- [ ] `.env.local` nicht in Git

---

*Ende Phase A Implementierungsplan*
