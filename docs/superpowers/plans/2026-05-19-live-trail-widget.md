# Live-Trail-Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Wer ist gerade am Trail?"-Widget to the dashboard between Wochenziele and Bestleistungen, showing riders active within the last 15 minutes.

**Architecture:** New `getActiveRiders()` store helper queries Appwrite for runs with `startedAt > now - 15min`, deduplicates per user, and returns `ActiveRider[]`. A new `LiveTrailWidget` component renders three states (active-collapsed, active-expanded, inactive) purely from props. The dashboard feeds it via the existing `useFocusEffect` refresh cycle.

**Tech Stack:** React Native / Expo, Zustand (`useRunStore`), Appwrite (`databases.listDocuments`), `react-native-svg`, `Animated` API

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `types/index.ts` | Add `ActiveRider` interface |
| Modify | `stores/useRunStore.ts` | Add `getActiveRiders` helper + `RunState` signature |
| Create | `components/LiveTrailWidget.tsx` | Widget UI — all three states, pulse animation |
| Modify | `app/(app)/(tabs)/dashboard.tsx` | Wire state + call + render widget |
| Modify | `__tests__/stores/useRunStore.test.ts` | Tests for `getActiveRiders` |

---

## Task 1: Add `ActiveRider` type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add the interface**

Open `types/index.ts` and append at the end of the file (after the `ClipPost` interface):

```ts
export interface ActiveRider {
  userId: string
  username: string
  tier: Tier
  lastRun: Run
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add ActiveRider type"
```

---

## Task 2: Implement `getActiveRiders` store helper (TDD)

**Files:**
- Modify: `stores/useRunStore.ts`
- Modify: `__tests__/stores/useRunStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the **bottom** of `__tests__/stores/useRunStore.test.ts`:

```ts
function makeRun(id: string, userId: string, username: string, tier: string, startedAt: string) {
  return {
    $id: id, userId, username, tier, startedAt,
    sessionId: 's1', totalTime: 90, p1Time: null, p2Time: null,
    maxAirtime: 2.1, maxSpeed: 60, maxGForce: 3.2,
    distance: 1200, dataSource: 'phone', $createdAt: '',
  }
}

describe('useRunStore.getActiveRiders', () => {
  it('deduplicates by userId, keeps latest run per rider', async () => {
    const now = new Date()
    const recent = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const older  = new Date(now.getTime() - 10 * 60 * 1000).toISOString()

    db.listDocuments.mockResolvedValueOnce({
      total: 3,
      documents: [
        makeRun('r1', 'u1', 'Max',  'rookie',  recent),
        makeRun('r2', 'u2', 'Lisa', 'veteran', older),
        makeRun('r3', 'u1', 'Max',  'rookie',  older),
      ],
    } as any)

    const { result } = renderHook(() => useRunStore())
    let riders: any
    await act(async () => { riders = await result.current.getActiveRiders() })

    expect(riders).toHaveLength(2)
    expect(riders.find((r: any) => r.userId === 'u1').lastRun.$id).toBe('r1')
    expect(riders.find((r: any) => r.userId === 'u2').username).toBe('Lisa')
  })

  it('returns empty array when no recent runs', async () => {
    db.listDocuments.mockResolvedValueOnce({ total: 0, documents: [] } as any)

    const { result } = renderHook(() => useRunStore())
    let riders: any
    await act(async () => { riders = await result.current.getActiveRiders() })

    expect(riders).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx jest __tests__/stores/useRunStore.test.ts --no-coverage
```

Expected: FAIL — `result.current.getActiveRiders is not a function`

- [ ] **Step 3: Add `getActiveRiders` to `RunState` interface**

In `stores/useRunStore.ts`, add to the `RunState` interface (after `getLeaderboard`):

```ts
getActiveRiders: () => Promise<import('@/types').ActiveRider[]>
```

- [ ] **Step 4: Implement `getActiveRiders`**

In `stores/useRunStore.ts`, add the import at the top with the existing type import:

```ts
import type { Session, Run, Tier, ActiveRider } from '@/types'
```

Then add the implementation inside the `create<RunState>(() => ({` object, after the `getLeaderboard` method:

```ts
  getActiveRiders: async () => {
    const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const res = await databases.listDocuments(DB_ID, RUNS_ID, [
      Query.greaterThanEqual('startedAt', threshold),
      Query.orderDesc('startedAt'),
      Query.limit(100),
    ])
    const runs = res.documents as unknown as Run[]
    const seen = new Set<string>()
    const riders: ActiveRider[] = []
    for (const run of runs) {
      if (!seen.has(run.userId)) {
        seen.add(run.userId)
        riders.push({ userId: run.userId, username: run.username, tier: run.tier, lastRun: run })
      }
    }
    return riders
  },
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
npx jest __tests__/stores/useRunStore.test.ts --no-coverage
```

Expected: PASS — all tests green including the two new ones.

- [ ] **Step 6: Commit**

```bash
git add stores/useRunStore.ts __tests__/stores/useRunStore.test.ts types/index.ts
git commit -m "feat: add getActiveRiders store helper with 15-min threshold"
```

---

## Task 3: Create `LiveTrailWidget` component

**Files:**
- Create: `components/LiveTrailWidget.tsx`

- [ ] **Step 1: Create the file**

Create `components/LiveTrailWidget.tsx` with the full content below:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GlassCard } from '@/components/ui/GlassCard'
import { PixelAvatar } from '@/components/PixelAvatar'
import { Fonts, Radius } from '@/constants/theme'
import type { Theme } from '@/hooks/useTheme'
import type { ActiveRider } from '@/types'

const MAX_VISIBLE = 4

const PHRASES = {
  low:  ['Jemand ist gerade am Trail', 'Ein paar Rider unterwegs', 'Läuft heute schon was'],
  mid:  ['Trail ist heute gut besucht', 'Einiges los gerade', 'Die Crew ist da'],
  high: ['Trail ist heute VOLL am laufen 🔥', 'Mega Session gerade', 'Heute wird gesendet'],
  none: ['Trail schläft gerade'],
} as const

function pickPhrase(count: number): string {
  const key = count === 0 ? 'none' : count <= 3 ? 'low' : count <= 6 ? 'mid' : 'high'
  const pool = PHRASES[key] as readonly string[]
  return pool[Math.floor(Math.random() * pool.length)]
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = (secs % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

function TierDot({ tier }: { tier: string }) {
  const color = ({ rookie: '#99EA57', veteran: '#ffd700', legend: '#bf00ff' } as Record<string, string>)[tier] ?? '#aaa'
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
}

type Props = {
  riders: ActiveRider[]
  accent: string
  theme: Theme
}

export function LiveTrailWidget({ riders, accent, theme }: Props) {
  const [expanded, setExpanded] = useState(false)
  const pulse = useRef(new Animated.Value(1)).current
  const isActive = riders.length > 0
  const phrase = useMemo(() => pickPhrase(riders.length), [riders.length])

  useEffect(() => {
    if (!isActive) { pulse.setValue(1); return }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [isActive, pulse])

  const visible = riders.slice(0, MAX_VISIBLE)
  const overflow = riders.length - MAX_VISIBLE

  return (
    <GlassCard padding={0} style={[s.card, !isActive && { opacity: 0.45 }]}>
      <TouchableOpacity
        onPress={() => isActive && setExpanded(v => !v)}
        activeOpacity={isActive ? 0.7 : 1}
        style={s.header}
      >
        {/* Pulse dot */}
        <View style={s.dotWrap}>
          {isActive ? (
            <Animated.View style={[s.dot, { backgroundColor: '#ef4444', opacity: pulse }]} />
          ) : (
            <View style={[s.dot, { backgroundColor: theme.cardBorder }]} />
          )}
        </View>

        {/* Phrase text */}
        <Text style={[s.phrase, { color: isActive ? theme.text : theme.dim }]} numberOfLines={1}>
          {phrase}
        </Text>

        {/* Stacked avatars */}
        {isActive && (
          <View style={s.stack}>
            {visible.map((rider, i) => (
              <View
                key={rider.userId}
                style={{ marginLeft: i === 0 ? 0 : -10, zIndex: MAX_VISIBLE - i }}
              >
                <PixelAvatar tier={rider.tier} px={1} />
              </View>
            ))}
            {overflow > 0 && (
              <View style={[s.overflow, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}>
                <Text style={[s.overflowTxt, { color: accent }]}>+{overflow}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded rider list */}
      {isActive && expanded && (
        <View style={[s.body, { borderTopColor: theme.cardBorder }]}>
          {riders.map((rider) => (
            <View key={rider.userId} style={s.riderRow}>
              <PixelAvatar tier={rider.tier} px={1} />
              <View style={s.riderInfo}>
                <View style={s.riderNameRow}>
                  <Text style={[s.riderName, { color: theme.text }]}>{rider.username}</Text>
                  <TierDot tier={rider.tier} />
                </View>
                <Text style={[s.riderSub, { color: theme.muted }]}>
                  {fmtTime(rider.lastRun.totalTime)} · ✦ {rider.lastRun.maxAirtime.toFixed(1)}s
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  )
}

const s = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dotWrap: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  phrase: { flex: 1, fontFamily: Fonts.body, fontSize: 13 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  overflow: {
    marginLeft: -8, width: 24, height: 24,
    borderRadius: Radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  overflowTxt: { fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700' },
  body: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 10 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riderInfo: { flex: 1 },
  riderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  riderName: { fontFamily: Fonts.bodyBd, fontSize: 13 },
  riderSub: { fontFamily: Fonts.mono, fontSize: 11, marginTop: 2 },
})
```

- [ ] **Step 2: Commit**

```bash
git add components/LiveTrailWidget.tsx
git commit -m "feat: add LiveTrailWidget component"
```

---

## Task 4: Wire widget into dashboard.tsx

**Files:**
- Modify: `app/(app)/(tabs)/dashboard.tsx`

- [ ] **Step 1: Add import**

At the top of `app/(app)/(tabs)/dashboard.tsx`, add after the existing component imports:

```ts
import { LiveTrailWidget } from '@/components/LiveTrailWidget'
import type { ActiveRider } from '@/types'
```

- [ ] **Step 2: Add state**

Inside `DashboardScreen()`, after the existing `useState` declarations (around line 314), add:

```ts
const [activeRiders, setActiveRiders] = useState<ActiveRider[]>([])
```

- [ ] **Step 3: Add store destructuring**

In the existing destructuring of `useRunStore` (line 304), add `getActiveRiders`:

```ts
const { getSessionsWithRuns, getPersonalBests, getWeeklyStats, getWeeklyRanking, getActiveRiders } = useRunStore()
```

- [ ] **Step 4: Call in loadDashboard**

Inside the `loadDashboard` callback, add after `getWeeklyRanking(...).then(...)` (around line 352):

```ts
    getActiveRiders().then(setActiveRiders)
```

- [ ] **Step 5: Add to useCallback deps**

In the `useCallback` dependency array (around line 353), add `getActiveRiders`:

```ts
  }, [getPersonalBests, getSessionsWithRuns, getWeeklyRanking, getWeeklyStats, getActiveRiders, userId])
```

- [ ] **Step 6: Insert widget in JSX**

In the JSX (around line 394-397), between the closing `</View>` of `<WeeklyGoals>` and the `<Text>` for "Bestleistungen", add:

```tsx
        {/* Live-Trail-Widget */}
        <LiveTrailWidget
          riders={activeRiders}
          accent={accent}
          theme={theme}
        />

        {/* Bestleistungen Carousel */}
        <Text style={[s.sectionLabel, { color: accent, marginTop: 24 }]}>Bestleistungen</Text>
```

The block you're replacing looks like this (lines 396-398):

```tsx
        {/* Bestleistungen Carousel */}
        <Text style={[s.sectionLabel, { color: accent, marginTop: 24 }]}>Bestleistungen</Text>
        <Carousel bests={bests} weeklyRanking={weeklyRanking} accent={accent} theme={theme} />
```

Replace with:

```tsx
        {/* Live-Trail-Widget */}
        <View style={{ marginTop: 16 }}>
          <LiveTrailWidget
            riders={activeRiders}
            accent={accent}
            theme={theme}
          />
        </View>

        {/* Bestleistungen Carousel */}
        <Text style={[s.sectionLabel, { color: accent, marginTop: 24 }]}>Bestleistungen</Text>
        <Carousel bests={bests} weeklyRanking={weeklyRanking} accent={accent} theme={theme} />
```

- [ ] **Step 7: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 8: Final commit**

```bash
git add app/(app)/(tabs)/dashboard.tsx
git commit -m "feat: wire LiveTrailWidget into dashboard with active rider data"
```
