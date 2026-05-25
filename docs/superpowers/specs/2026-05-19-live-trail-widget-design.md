# Live-Trail-Widget — Design Spec

**Date:** 2026-05-19
**Feature:** "Wer ist gerade am Trail?" Widget im Dashboard-Tab

---

## Übersicht

Ein schmales Widget zwischen den Sektionen "Wochenziele" und "Bestleistungen" im Dashboard. Es zeigt auf einen Blick, wer gerade (oder kürzlich) am Trail aktiv war. Ziel: die technischen Daten-Blöcke aufbrechen und eine soziale, lebendige Komponente einbringen.

---

## 1. Data Layer

### Aktiv-Schwelle
Ein User gilt als "aktiv", wenn sein letzter Run ein `startedAt`-Timestamp hat, der weniger als **15 Minuten** zurückliegt.

### Neuer Store-Helper
`getActiveRiders(userId: string): Promise<ActiveRider[]>` im `useRunStore`.

```ts
type ActiveRider = {
  userId: string
  username: string
  tier: Tier
  lastRun: Run
}
```

**Implementierung:** Query auf die `runs`-Collection, gefiltert auf `startedAt > now - 15min`, gruppiert per User (neuester Run pro User). Nutzt denselben Appwrite-Client wie die bestehenden Queries.

### Refresh-Verhalten
Wird im bestehenden `loadDashboard`-Callback aufgerufen — kein separater Polling-Intervall, kein WebSocket. Refresh passiert bei `useFocusEffect` (Tab-Fokus). Später auf Appwrite Realtime migrierbar ohne API-Änderung.

---

## 2. UI-Struktur

### Position
Zwischen `<WeeklyGoals>` und dem "Bestleistungen"-Label, ohne eigenes Section-Label.

### State: Collapsed (aktiv, ≥1 Rider)
- Höhe: ~52px
- Links: pulsierender roter Kreis (React Native `Animated`, Opacity-Loop, ~1s Intervall) + kleines "LIVE"-Label daneben
- Mitte: Spruch-Text (dynamisch, siehe Abschnitt 3)
- Rechts: Stacked Avatare (max. 4 sichtbar, danach `+N`-Badge). Jeder Avatar versetzt um ~10px horizontal.
- Tippbar → expand

### State: Expanded
- Wächst nach unten (wie `DayRow` im Dashboard)
- Pro aktivem Rider eine Zeile:
  - `PixelAvatar` (klein, ~28px)
  - Username + TierDot
  - Letzte Session-Info: beste Zeit + Airtime des letzten Runs
- Gleicher Tap auf Header → collapse

### State: Inactive (0 Rider)
- Gleiche Höhe wie collapsed
- Gedimmter Stil (reduzierte Opacity / Border-Color)
- Statischer grauer Kreis (kein Puls)
- Text: `"Trail schläft gerade"` (fest, kein Random)
- Nicht tippbar, kein Expand

---

## 3. Sprüche

Zufällig aus der jeweiligen Gruppe gewählt bei jedem Render/Refresh.

| Anzahl aktiver Rider | Phrases |
|---|---|
| 1–3 | "Jemand ist gerade am Trail" · "Ein paar Rider unterwegs" · "Läuft heute schon was" |
| 4–6 | "Trail ist heute gut besucht" · "Einiges los gerade" · "Die Crew ist da" |
| 7+ | "Trail ist heute VOLL am laufen 🔥" · "Mega Session gerade" · "Heute wird gesendet" |
| 0 | "Trail schläft gerade" (fest) |

---

## 4. Komponente

Neue Datei: `components/LiveTrailWidget.tsx`

**Props:**
```ts
type Props = {
  riders: ActiveRider[]
  accent: string
  theme: Theme
}
```

Kein eigener Datenfetch — erhält `riders` von der Dashboard-Parent-Komponente. Eigener lokaler State: `expanded: boolean`.

---

## 5. Integration in dashboard.tsx

1. State `activeRiders: ActiveRider[]` hinzufügen (default `[]`)
2. `getActiveRiders(userId)` im `loadDashboard`-Callback aufrufen
3. `<LiveTrailWidget riders={activeRiders} accent={accent} theme={theme} />` zwischen `<WeeklyGoals>` und dem "Bestleistungen"-Label einfügen

---

## 6. Out of Scope

- Appwrite Realtime / WebSocket (geplant für spätere Phase)
- Push-Notifications wenn Freunde den Trail betreten
- Filterung nach Freundesliste
