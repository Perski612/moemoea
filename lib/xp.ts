import type { Run } from '@/types'

// ─── Level curve: 50 × n TP to go from level n → n+1 ────────────────────────
// Cumulative XP to reach level n: 25 × (n-1) × n
// Inverse: n = floor((1 + sqrt(1 + 4×xp/25)) / 2)

export function xpToNextLevel(level: number): number {
  return 50 * level
}

export function totalXpForLevel(level: number): number {
  return 25 * (level - 1) * level
}

export function getLevelFromXp(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2)
}

export function xpProgressInLevel(xp: number): {
  current: number
  needed: number
  fraction: number
} {
  const level = getLevelFromXp(xp)
  const base = totalXpForLevel(level)
  const needed = xpToNextLevel(level)
  const current = xp - base
  return { current, needed, fraction: current / needed }
}

// ─── Sensor-based TP (always applied, even without timing) ───────────────────
// airtime^1.5 × 3  →  progressive: 1s=3tp, 2s=8tp, 3s=15tp, 5s=33tp
// (gforce - 2.0)^2 × 4  →  starts at 2G baseline: 3G=4tp, 4G=16tp, 5G=36tp

function sensorXp(airtime: number, gforce: number): number {
  const airtimeTp = Math.floor(Math.pow(Math.max(0, airtime), 1.5) * 3)
  const gforceTp = Math.floor(Math.pow(Math.max(0, gforce - 2.0), 2) * 4)
  return airtimeTp + gforceTp
}

// ─── PB flags passed in from caller (async PB lookup happens outside) ─────────

export interface PbFlags {
  totalTime?: boolean
  p1Time?: boolean
  p2Time?: boolean
  maxSpeed?: boolean
  maxAirtime?: boolean
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export interface RunXpBreakdown {
  base: number    // timing: 10 (partial) or 18 (full p1+p2)
  sensor: number  // airtime + gforce formula
  pb: number      // personal best bonuses
  daily: number   // first run of the day
  total: number
}

export function calculateRunXp(
  run: Run,
  pbs: PbFlags = {},
  isFirstRunOfDay = false,
): RunXpBreakdown {
  const hasP1 = run.p1Time != null
  const hasP2 = run.p2Time != null

  const base = hasP1 && hasP2 ? 18 : hasP1 || hasP2 ? 10 : 0

  const sensor = sensorXp(run.maxAirtime, run.maxGForce)

  const pb =
    (pbs.totalTime  ? 20 : 0) +
    (pbs.p1Time     ? 10 : 0) +
    (pbs.p2Time     ? 10 : 0) +
    (pbs.maxSpeed   ?  5 : 0) +
    (pbs.maxAirtime ?  5 : 0)

  const daily = isFirstRunOfDay ? 5 : 0

  return { base, sensor, pb, daily, total: base + sensor + pb + daily }
}

// ─── Leaderboard Platz-1-Bonus (pro Tag, extern getriggert) ──────────────────

export const LEADERBOARD_DAILY_BONUS = 20
