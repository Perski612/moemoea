import {
  DEFAULT_TRAIL_DETECTION_OPTIONS,
  TRAIL_LINES,
  bearingDegrees,
  distanceMeters,
  initialTrailDetectionState,
  updateTrailDetection,
  type LocationSample,
  type TrailPoint,
} from '@/lib/trailDetection'

function moveFrom(point: TrailPoint, bearingDeg: number, distanceM: number): TrailPoint {
  const radiusM = 6371000
  const bearing = (bearingDeg * Math.PI) / 180
  const lat1 = (point.latitude * Math.PI) / 180
  const lon1 = (point.longitude * Math.PI) / 180
  const angularDistance = distanceM / radiusM

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  )
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
  )

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  }
}

function sample(point: TrailPoint, timestampMs: number, speedMs = 3.5): LocationSample {
  return {
    ...point,
    accuracyM: 8,
    speedMs,
    timestampMs,
  }
}

describe('trailDetection', () => {
  it('starts when rider leaves an entrance in the trail direction', () => {
    const line = TRAIL_LINES[0]
    const bearing = bearingDegrees(line.points[0], line.points[3])
    let state = initialTrailDetectionState

    state = updateTrailDetection(state, sample(line.points[0], 1000))
    state = updateTrailDetection(state, sample(moveFrom(line.points[0], bearing, 6), 2500))
    state = updateTrailDetection(state, sample(moveFrom(line.points[0], bearing, 16), 4200))

    expect(state.status).toBe('running')
    expect(state.activeLineId).toBe('p1')
    expect(state.startedAtMs).toBe(4200)
  })

  it('does not start when GPS accuracy is poor', () => {
    const line = TRAIL_LINES[0]
    const state = updateTrailDetection(initialTrailDetectionState, {
      ...line.points[0],
      accuracyM: DEFAULT_TRAIL_DETECTION_OPTIONS.maxAccuracyM + 20,
      speedMs: 4,
      timestampMs: 1000,
    })

    expect(state.status).toBe('low_accuracy')
  })

  it('does not start when movement points away from the trail', () => {
    const line = TRAIL_LINES[0]
    const bearing = (bearingDegrees(line.points[0], line.points[3]) + 180) % 360
    let state = initialTrailDetectionState

    state = updateTrailDetection(state, sample(line.points[0], 1000))
    state = updateTrailDetection(state, sample(moveFrom(line.points[0], bearing, 8), 2500))
    state = updateTrailDetection(state, sample(moveFrom(line.points[0], bearing, 18), 4200))

    expect(state.status).toBe('wrong_direction')
  })

  it('finishes a running line near the line end', () => {
    const line = TRAIL_LINES[1]
    const finish = line.points[line.points.length - 1]
    const state = updateTrailDetection(
      {
        ...initialTrailDetectionState,
        status: 'running',
        activeLineId: line.id,
        startedAtMs: 1000,
      },
      sample(finish, 90000),
    )

    expect(state.status).toBe('finished')
    expect(state.finishedAtMs).toBe(90000)
  })

  it('calculates useful distances for gate tuning', () => {
    expect(distanceMeters(TRAIL_LINES[0].points[0], TRAIL_LINES[0].points[1])).toBeGreaterThan(6)
  })
})
