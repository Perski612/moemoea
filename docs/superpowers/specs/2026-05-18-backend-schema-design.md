# Backend Schema Design — MOE MOEA Trails

**Date:** 2026-05-18  
**Status:** Approved  
**Platform:** Appwrite (cloud.appwrite.io)  
**Project ID:** `fra-6a032a7a002bf847e2cb`  
**Database ID:** `database-trails-db`

---

## Context

MOE MOEA Trails is an MTB trail app for a single local trail (Neckartal). Users ride the trail, the app measures sensor data on-device, uploads processed metrics to Appwrite, and displays stats, leaderboards, and a social feed.

**Phase 1 (PoC):** Phone sensors (gyro, GPS) — raw data processed on-device, only metrics uploaded.  
**Phase 2 (later):** External hardware sensor on bike, same schema, `dataSource` field distinguishes both.

No video files are stored. Storage usage is DB-only (small numbers/strings per document).

---

## Collections

### `profiles` *(already exists)*

One document per user, `$id` = Appwrite account userId.

| Field | Type | Notes |
|-------|------|-------|
| userId | string | Appwrite account ID |
| username | string | Display name |
| team | string | e.g. "MOE MOEA Crew" |
| xp | integer | Total XP accumulated |
| level | integer | Derived from XP |
| approved | boolean | Admin must approve new users |
| isAdmin | boolean | Admin flag |
| tier | enum | `'rookie' \| 'veteran' \| 'legend'` — set by admin |

---

### `bike_configs`

One document per user. Created on first profile save.

| Field | Type | Notes |
|-------|------|-------|
| userId | string | Appwrite account ID |
| bikeType | enum | `'hardtail' \| 'fully'` |
| suspension | enum | `'air' \| 'coil'` |
| material | enum | `'alu' \| 'carbon'` |
| bikeColor | string | Hex color |
| jerseyJ | string | Jersey color J |
| jerseyD | string | Jersey color D |

---

### `sessions`

One document per day a user visits the trail. Groups runs together for the dashboard "Letzte Sessions" view.

| Field | Type | Notes |
|-------|------|-------|
| userId | string | |
| date | string | `YYYY-MM-DD` |
| trailId | string | Hardcoded `'moe-moea'` for now — future multi-trail support |

**Indexes:** `userId` + `date` (for querying user sessions sorted by date).

---

### `runs`

One document per descent. Core of the app — all leaderboards and stats are computed from this collection.

| Field | Type | Notes |
|-------|------|-------|
| sessionId | string | Reference to `sessions.$id` |
| userId | string | Denormalized for fast leaderboard queries |
| startedAt | datetime | |
| totalTime | float | Full run in seconds (P1 + P2) |
| p1Time | float \| null | Part 1 sector time in seconds |
| p2Time | float \| null | Part 2 sector time in seconds |
| maxAirtime | float | Peak airtime in seconds |
| maxSpeed | float | Peak speed in km/h |
| maxGForce | float | Peak G-force in g |
| distance | float | Distance in meters |
| dataSource | enum | `'phone' \| 'external'` |

**Raw sensor data is NOT stored** — processed on-device, only metrics uploaded.

**Indexes:**
- `userId` (personal stats, personal bests)
- `startedAt` (weekly queries)
- `maxAirtime`, `maxSpeed`, `maxGForce`, `totalTime` (leaderboard sorting)

**Computed from this collection (no extra storage):**
- Leaderboard (Gesamt / P1 / P2 × Airtime / Speed / GForce / Style)
- Personal bests per sector
- Weekly goals progress (Distanz, Airtime, Top-Speed)
- Dashboard session detail (runs per day, per-run chart data)
- Sector times in Strecke screen

---

### `clip_posts`

Feed entries for the Style Contest. No video file — just metadata and social interaction. Users submit their best run for the monthly contest.

| Field | Type | Notes |
|-------|------|-------|
| userId | string | |
| runId | string \| null | Optional link to a run |
| contestMonth | string | `YYYY-MM` — which contest this belongs to |
| verified | boolean | QR code scanned at trail photo spot |
| fireCount | integer | Cached count for fast display |
| firedBy | string[] | Array of userIds — prevents double-firing |
| createdAt | datetime | |

**No separate `clip_reactions` collection** — `firedBy[]` is sufficient for the expected user count (~50 users).

**Style score** on the leaderboard = `fireCount` of the user's clip posts for that month.

**Indexes:** `contestMonth`, `userId`, `createdAt`.

---

## What is NOT stored

| Data | Reason |
|------|--------|
| Raw gyro/GPS sensor arrays | Processed on-device. Would be 500KB–2MB per run. Never uploaded. |
| Video files | Out of scope for now. Would require external storage (e.g. Cloudflare R2). |
| Leaderboard snapshots | Computed live from `runs`. User count is small enough. |
| Weekly goal targets | Hardcoded in app (50km distance, 30s airtime, 80km/h speed). |

---

## Extensibility Notes

- **New trail:** Add a `trails` collection, reference by `trailId` in `sessions`. Already stubbed.
- **External hardware:** Set `dataSource: 'external'` in runs. No schema change needed.
- **More sectors:** Add `p3Time`, `p4Time` fields to `runs` — or migrate to a `sector_times` sub-structure.
- **Video (Phase 2):** Add `videoUrl` field to `clip_posts`, store in Cloudflare R2 or similar.
- **Teams/Groups:** `team` is already a string in `profiles`. A `teams` collection can be added later.
