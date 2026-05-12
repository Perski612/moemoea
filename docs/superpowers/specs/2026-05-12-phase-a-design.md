# MOE MOEA Trails — Phase A Design Spec
*Auth + Profil + Appwrite-Setup*
*Erstellt: 2026-05-12*

---

## Überblick

Phase A legt das Fundament der App: Nutzer-Registrierung mit Admin-Freischaltung, Profil mit Pixel-Avatar-Konfigurator, und die vollständige Appwrite-Backend-Infrastruktur. Kein Video, keine Telemetrie — nur der Auth- und Profil-Core.

**Stack:**
- React Native + Expo (Managed Workflow)
- Expo Router (file-based Navigation)
- Appwrite (Auth, Database)
- Zustand (globaler State)
- react-native-svg (Pixel-Avatar)
- @tanstack/react-query (Server-State)

---

## 1. Projektstruktur

```
moe-moea-trails/
├── app/
│   ├── _layout.tsx              # Root: Auth-Gate, Font-Loading, QueryClient
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── pending.tsx          # "Warte auf Freischaltung"
│   ├── (app)/
│   │   ├── _layout.tsx          # Guard: eingeloggt + approved
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx      # Tab-Bar
│   │   │   ├── dashboard.tsx    # Platzhalter Phase A
│   │   │   ├── feed.tsx         # Platzhalter Phase A
│   │   │   ├── leaderboard.tsx  # Platzhalter Phase A
│   │   │   └── profile.tsx      # Voll implementiert
│   │   └── admin/
│   │       └── index.tsx        # Admin-only
├── components/
│   ├── PixelAvatar.tsx
│   ├── BikeConfigurator.tsx
│   └── ui/                      # Shared UI-Komponenten
├── constants/
│   └── theme.ts                 # Farben, Fonts, Spacing
├── lib/
│   └── appwrite.ts              # Singleton Client + Services
├── stores/
│   ├── useAuthStore.ts
│   └── useProfileStore.ts
├── types/
│   └── index.ts                 # Profile, BikeConfig, etc.
└── .env.local                   # Nie committen
```

---

## 2. Appwrite Schema

**Project:** `moe-moea-trails`
**Database:** `trails-db`

### Collection: `profiles`

| Feld        | Typ      | Default | Details                        |
|-------------|----------|---------|--------------------------------|
| `userId`    | String   | —       | Appwrite Account-ID, indexed   |
| `username`  | String   | —       | Unique                         |
| `team`      | String   | —       | z.B. "MOE MOEA Crew"           |
| `xp`        | Integer  | 0       |                                |
| `level`     | Integer  | 1       |                                |
| `approved`  | Boolean  | false   | Source of Truth für Auth-Gate  |
| `isAdmin`   | Boolean  | false   | Manuell in Console setzen      |
| `createdAt` | DateTime | —       |                                |

### Collection: `bike_configs`

| Feld          | Typ    | Details                          |
|---------------|--------|----------------------------------|
| `userId`      | String | Appwrite Account-ID, indexed, unique |
| `bikeType`    | Enum   | `hardtail` \| `fully`            |
| `suspension`  | Enum   | `air` \| `coil`                  |
| `material`    | Enum   | `alu` \| `carbon`                |
| `bikeColor`   | String | Hex-String, z.B. `#1a3a99`       |
| `jerseyJ`     | String | Hex-String (Trikot-Hauptfarbe)   |
| `jerseyD`     | String | Hex-String (Trikot-Detail)       |

### Appwrite Team: `admins`

- Admin-User werden in Appwrite Console dem Team `admins` hinzugefügt
- `profiles`-Collection Permissions:
  - Read: `user:[userId]` (eigenes), `team:admins` (alle)
  - Write: `user:[userId]` (eigenes), `team:admins` (alle)
- `bike_configs`-Collection Permissions:
  - Read: `user:[userId]`
  - Write: `user:[userId]`

---

## 3. Auth & Approval Flow

### Registrierung
1. User füllt Register-Screen aus (Email, Passwort, Username, Team)
2. `account.create()` → Appwrite Account
3. `account.createEmailPasswordSession()` → Session starten
4. `databases.createDocument('trails-db', 'profiles', ...)` mit `approved: false`
5. Redirect → `(auth)/pending`

### Pending-Screen
- Zeigt "Dein Account wartet auf Freischaltung" im App-Stil
- Pollt alle 30s: `databases.getDocument('trails-db', 'profiles', userId)`
- `approved === true` → Redirect → `(app)/(tabs)/dashboard`
- Logout-Button immer sichtbar

### Auth-Gate (`app/(app)/_layout.tsx`)
```
checkSession()
  ├── Keine Session → Redirect (auth)/login
  ├── Session, approved = false → Redirect (auth)/pending
  └── Session, approved = true → App rendern
        └── isAdmin = true → Admin-Tab einblenden
```

### Login
- `account.createEmailPasswordSession(email, password)`
- Danach `profiles`-Dokument laden → `approved` prüfen → Routing

---

## 4. Profil & Bike-Config

### Profil-Screen
- Pixel-Avatar (px=5, accentColor aus theme), Username, Team, Level-Badge, XP-Balken
- Stats-Row: Distanz `—`, Runs `—`, Fires `—`, Rang `—` (Platzhalter, Phase B/C)
- Avatar-Konfigurator (scrollbar darunter)
- Logout-Button am Ende

### BikeConfigurator-Komponente
- Live-Preview: `PixelAvatar` aktualisiert sich bei jeder Änderung
- Optionen: Fahrrad-Typ (Hardtail/Fully), Federgabel (Air/Coil), Rahmen-Material (Alu/Carbon), Rahmen-Farbe (6 Swatches), Trikot-Farbe (3 Swatches)
- "Speichern"-Button → `databases.upsertDocument(...)` auf `bike_configs`
- Gespeichert → `useProfileStore.setBikeConfig(...)` → alle Screens aktuell

### PixelAvatar-Komponente
- Direkter Port der HTML-Prototype-Logik nach `react-native-svg`
- Props: `tier`, `px`, `accentColor`, `bikeColor`, `jerseyJ`, `jerseyD`, `bikeType`, `suspType`
- Rendert `<Rect>`-Elemente via `react-native-svg`

---

## 5. Admin Panel

**Zugang:** Profil-Screen zeigt "Admin"-Button wenn `profile.isAdmin === true`
**Route:** `app/admin/index.tsx` (kein eigener Tab, von Profil erreichbar)

### Layout
- Header: "MOE MOEA / ADMIN" im App-Stil
- Segment-Control: **Ausstehend** | **Genehmigt**
- Ausstehend: FlatList mit Username, Team, Datum + "Freischalten"-Button
- Freischalten → `databases.updateDocument(..., { approved: true })` → Item verschwindet
- Genehmigt: Read-only Liste aller approved User

### Datenzugriff
- Admin-User ist Mitglied des Appwrite-Teams `admins`
- Kann damit alle `profiles`-Dokumente lesen und schreiben
- Query für Ausstehend: `Query.equal('approved', false)`
- Query für Genehmigt: `Query.equal('approved', true)`

---

## 6. State Management

### `useAuthStore` (Zustand)
```ts
interface AuthStore {
  session: Models.Session | null
  isApproved: boolean
  isAdmin: boolean
  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

### `useProfileStore` (Zustand)
```ts
interface ProfileStore {
  profile: Profile | null
  bikeConfig: BikeConfig | null
  setProfile: (p: Profile) => void
  setBikeConfig: (b: BikeConfig) => void
  syncFromAppwrite: (userId: string) => Promise<void>
}
```

### App-Start Sequenz
1. Root `_layout.tsx` mountet → `checkSession()` aufrufen
2. Aktive Session → `profiles`-Dokument laden → `approved` + `isAdmin` → Store befüllen
3. Expo Router `<Redirect>` basierend auf Store-State (kein imperatives `router.push`)
4. Nach Routing: `bike_configs` laden → `useProfileStore.syncFromAppwrite()`

---

## 7. Appwrite Client

```ts
// lib/appwrite.ts
import { Client, Account, Databases } from 'appwrite'

export const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)

export const account   = new Account(client)
export const databases = new Databases(client)

export const DB_ID           = process.env.EXPO_PUBLIC_DB_ID!
export const PROFILES_ID     = process.env.EXPO_PUBLIC_PROFILES_ID!
export const BIKE_CONFIGS_ID = process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID!
```

**`.env.local`** (nie committen, in `.gitignore`):
```
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=xxx
EXPO_PUBLIC_DB_ID=trails-db
EXPO_PUBLIC_PROFILES_ID=profiles
EXPO_PUBLIC_BIKE_CONFIGS_ID=bike_configs
```

---

## 8. Design-System

**`constants/theme.ts`:**
```ts
export const Colors = {
  bg:       '#0c0a07',
  bgCard:   '#181411',
  accent:   '#9CEB50',
  accentRed:'#cc1a1a',
  text:     '#e8e4dc',
  muted:    '#5a5550',
  dim:      '#3a3530',
}

export const Fonts = {
  display: 'BebasNeue_400Regular',
  body:    'SpaceGrotesk_400Regular',
  bodyMd:  'SpaceGrotesk_500Medium',
  bodyBd:  'SpaceGrotesk_700Bold',
  mono:    'SpaceMono_400Regular',
  monoBd:  'SpaceMono_700Bold',
}
```

Fonts via `@expo-google-fonts/bebas-neue`, `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/space-mono`.

---

## 9. Nicht in Phase A (explizit ausgeschlossen)

- Videos, QR-Scanning, Appwrite Storage → Phase B
- Accelerometer, Airtime-Messung, echte Stats → Phase C
- Push-Notifications
- Achievements (Grid ist Platzhalter)
- Leaderboard-Daten (Screen ist Platzhalter)
- Feed-Inhalte (Screen ist Platzhalter)

---

## 10. Offene Punkte für Phase B

- Appwrite Storage Bucket für Videos
- QR-Code-Generierung und -Verwaltung pro Trail-Spot
- Video-Validierungs-Logik (QR am Anfang des Videos)
- `runs`, `fires`-Collections

---

*Ende Phase A Spec*
