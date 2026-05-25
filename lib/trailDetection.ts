export type TrailLineId = 'p1' | 'p2'

export type TrailDetectionStatus =
  | 'waiting_for_gps'
  | 'low_accuracy'
  | 'near_entrance'
  | 'wrong_direction'
  | 'too_slow'
  | 'running'
  | 'finished'

export interface TrailPoint {
  latitude: number
  longitude: number
}

export interface TrailLine {
  id: TrailLineId
  name: string
  points: TrailPoint[]
  startRadiusM: number
  finishRadiusM: number
}

export interface TrailRuleLike {
  lineId: TrailLineId
  name: string
  enabled: boolean
  startLat: number
  startLon: number
  finishLat: number
  finishLon: number
  startRadiusM: number
  finishRadiusM: number
}

export interface LocationSample extends TrailPoint {
  accuracyM: number | null
  speedMs: number | null
  timestampMs: number
}

export interface TrailDetectionState {
  status: TrailDetectionStatus
  activeLineId: TrailLineId | null
  startedAtMs: number | null
  finishedAtMs: number | null
  samples: LocationSample[]
  confidence: number
  reason: string
}

export interface TrailDetectionOptions {
  maxAccuracyM: number
  minStartSpeedMs: number
  minStartDisplacementM: number
  minStartSamples: number
  directionToleranceDeg: number
  sampleWindowMs: number
}

export const TRAIL_LINES: TrailLine[] = [
  {
    id: 'p1',
    name: 'P1',
    startRadiusM: 35,
    finishRadiusM: 35,
    points: [
      { latitude: 48.820618, longitude: 9.807626 },
      { latitude: 48.820663, longitude: 9.807693 },
      { latitude: 48.820719, longitude: 9.807935 },
      { latitude: 48.820767, longitude: 9.807898 },
      { latitude: 48.820857, longitude: 9.807975 },
      { latitude: 48.821013, longitude: 9.808015 },
      { latitude: 48.821143, longitude: 9.808120 },
      { latitude: 48.821303, longitude: 9.808273 },
      { latitude: 48.821422, longitude: 9.808507 },
      { latitude: 48.821526, longitude: 9.808858 },
      { latitude: 48.821690, longitude: 9.808922 },
      { latitude: 48.821767, longitude: 9.808830 },
      { latitude: 48.821844, longitude: 9.808838 },
      { latitude: 48.821908, longitude: 9.809039 },
      { latitude: 48.822028, longitude: 9.809088 },
      { latitude: 48.822256, longitude: 9.808963 },
      { latitude: 48.822293, longitude: 9.809043 },
      { latitude: 48.822322, longitude: 9.809254 },
    ],
  },
  {
    id: 'p2',
    name: 'P2',
    startRadiusM: 35,
    finishRadiusM: 35,
    points: [
      { latitude: 48.822322, longitude: 9.809254 },
      { latitude: 48.822305, longitude: 9.810208 },
      { latitude: 48.822359, longitude: 9.810345 },
      { latitude: 48.822457, longitude: 9.810351 },
      { latitude: 48.822493, longitude: 9.810411 },
      { latitude: 48.822460, longitude: 9.810604 },
      { latitude: 48.822623, longitude: 9.810972 },
      { latitude: 48.822732, longitude: 9.810882 },
      { latitude: 48.822777, longitude: 9.811203 },
      { latitude: 48.822719, longitude: 9.811358 },
      { latitude: 48.822817, longitude: 9.811549 },
      { latitude: 48.822809, longitude: 9.811631 },
      { latitude: 48.822705, longitude: 9.811665 },
      { latitude: 48.822729, longitude: 9.811704 },
      { latitude: 48.822795, longitude: 9.811724 },
    ],
  },
]

export const DEFAULT_TRAIL_DETECTION_OPTIONS: TrailDetectionOptions = {
  maxAccuracyM: 25,
  minStartSpeedMs: 2.5,
  minStartDisplacementM: 10,
  minStartSamples: 3,
  directionToleranceDeg: 75,
  sampleWindowMs: 9000,
}

export function trailRulesToLines(rules: TrailRuleLike[]): TrailLine[] {
  const lines = rules
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      id: rule.lineId,
      name: rule.name,
      startRadiusM: rule.startRadiusM,
      finishRadiusM: rule.finishRadiusM,
      points: [
        { latitude: rule.startLat, longitude: rule.startLon },
        { latitude: rule.finishLat, longitude: rule.finishLon },
      ],
    }))

  return lines.length > 0 ? lines : TRAIL_LINES
}

export const initialTrailDetectionState: TrailDetectionState = {
  status: 'waiting_for_gps',
  activeLineId: null,
  startedAtMs: null,
  finishedAtMs: null,
  samples: [],
  confidence: 0,
  reason: 'GPS noch nicht bereit',
}

const earthRadiusM = 6371000

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI
}

export function distanceMeters(a: TrailPoint, b: TrailPoint): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * earthRadiusM * Math.asin(Math.sqrt(h))
}

export function bearingDegrees(a: TrailPoint, b: TrailPoint): number {
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function angleDeltaDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180)
}

function startBearing(line: TrailLine): number {
  return bearingDegrees(line.points[0], line.points[Math.min(3, line.points.length - 1)])
}

function confidence(parts: number[]): number {
  return Math.max(0, Math.min(0.99, parts.reduce((sum, part) => sum + part, 0) / parts.length))
}

export function updateTrailDetection(
  state: TrailDetectionState,
  sample: LocationSample,
  options: TrailDetectionOptions = DEFAULT_TRAIL_DETECTION_OPTIONS,
  lines: TrailLine[] = TRAIL_LINES,
): TrailDetectionState {
  const samples = [...state.samples, sample].filter(
    (item) => sample.timestampMs - item.timestampMs <= options.sampleWindowMs,
  )

  if (sample.accuracyM !== null && sample.accuracyM > options.maxAccuracyM) {
    return {
      ...state,
      status: 'low_accuracy',
      samples,
      confidence: 0,
      reason: `GPS zu ungenau (${Math.round(sample.accuracyM)}m)`,
    }
  }

  if (state.status === 'running' && state.activeLineId) {
    const line = lines.find((item) => item.id === state.activeLineId)
    const finish = line?.points[line.points.length - 1]
    if (line && finish && distanceMeters(sample, finish) <= line.finishRadiusM) {
      return {
        ...state,
        status: 'finished',
        finishedAtMs: sample.timestampMs,
        samples,
        confidence: 0.95,
        reason: `${line.name} Ziel erkannt`,
      }
    }

    return {
      ...state,
      samples,
      confidence: 0.9,
      reason: `${line?.name ?? 'Trail'} läuft`,
    }
  }

  const candidate = lines
    .map((line) => ({ line, distance: distanceMeters(sample, line.points[0]) }))
    .filter(({ line, distance }) => distance <= line.startRadiusM)
    .sort((a, b) => a.distance - b.distance)[0]

  if (!candidate) {
    return {
      ...state,
      status: 'waiting_for_gps',
      activeLineId: null,
      samples,
      confidence: 0,
      reason: 'Nicht in einer Einstiegszone',
    }
  }

  const first = samples[0]
  const displacementM = distanceMeters(first, sample)
  const movementBearing = bearingDegrees(first, sample)
  const expectedBearing = startBearing(candidate.line)
  const directionDelta = angleDeltaDeg(movementBearing, expectedBearing)
  const speedMs = sample.speedMs ?? displacementM / Math.max((sample.timestampMs - first.timestampMs) / 1000, 1)

  if (samples.length < options.minStartSamples) {
    return {
      ...state,
      status: 'near_entrance',
      activeLineId: candidate.line.id,
      samples,
      confidence: 0.25,
      reason: `${candidate.line.name} Einstieg, sammle Samples`,
    }
  }

  if (speedMs < options.minStartSpeedMs || displacementM < options.minStartDisplacementM) {
    return {
      ...state,
      status: 'too_slow',
      activeLineId: candidate.line.id,
      samples,
      confidence: confidence([speedMs / options.minStartSpeedMs, displacementM / options.minStartDisplacementM]),
      reason: `${candidate.line.name}: noch zu langsam / zu wenig Bewegung`,
    }
  }

  if (directionDelta > options.directionToleranceDeg) {
    return {
      ...state,
      status: 'wrong_direction',
      activeLineId: candidate.line.id,
      samples,
      confidence: Math.max(0.1, 1 - directionDelta / 180),
      reason: `${candidate.line.name}: Richtung passt nicht`,
    }
  }

  return {
    status: 'running',
    activeLineId: candidate.line.id,
    startedAtMs: sample.timestampMs,
    finishedAtMs: null,
    samples,
    confidence: confidence([
      1 - candidate.distance / candidate.line.startRadiusM,
      speedMs / (options.minStartSpeedMs * 2),
      1 - directionDelta / options.directionToleranceDeg,
    ]),
    reason: `${candidate.line.name} Start erkannt`,
  }
}
