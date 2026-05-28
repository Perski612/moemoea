import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Accelerometer, Gyroscope } from 'expo-sensors'
import * as Location from 'expo-location'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '@/components/ui/AppHeader'
import { GlassBackground } from '@/components/ui/GlassBackground'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useRunStore } from '@/stores/useRunStore'
import {
  distanceMeters,
  initialTrailDetectionState,
  trailRulesToLines,
  updateTrailDetection,
  type TrailDetectionState,
  type TrailPoint,
} from '@/lib/trailDetection'
import { useTrailRulesStore } from '@/stores/useTrailRulesStore'
import { TpRewardModal, type TpBreakdown } from '@/components/TpRewardModal'
import { Colors, Fonts, Radius } from '@/constants/theme'
import { useTheme } from '@/hooks/useTheme'

type SensorVector = {
  x: number
  y: number
  z: number
}

type SensorSubscription = {
  remove: () => void
}

type EventKind = 'Airtime' | 'Roots' | 'Corner' | 'Impact'

type DetectedEvent = {
  id: string
  kind: EventKind
  confidence: number
  detail: string
  at: string
}

const emptyVector: SensorVector = { x: 0, y: 0, z: 0 }
const sampleMs = 50
const airtimeThresholdG = 0.45
const minAirtimeMs = 110
const landingSpikeG = 1.6
const landingWindowMs = 500
const rootJerkThreshold = 8
const rootWindowMs = 900
const cornerGyroThreshold = 1
const cornerMinMs = 500

function vectorMagnitude({ x, y, z }: SensorVector) {
  return Math.sqrt(x * x + y * y + z * z)
}

function fmt(value: number, digits = 2) {
  return value.toFixed(digits)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function confidenceLabel(value: number) {
  return `${Math.round(value * 100)}%`
}

function todayId() {
  return new Date().toISOString().slice(0, 10)
}

function ValueTile({ label, value, unit, highlight = false }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <View style={[styles.tile, highlight && styles.tileHighlight]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, highlight && styles.highlightText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45}>
        {value}
      </Text>
      <Text style={styles.tileUnit}>{unit}</Text>
    </View>
  )
}

function EventRow({ event }: { event: DetectedEvent }) {
  const color = {
    Airtime: Colors.accent,
    Roots: '#fbbf24',
    Corner: '#60a5fa',
    Impact: Colors.accentRed,
  }[event.kind]

  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventDot, { backgroundColor: color }]} />
      <View style={styles.eventTextWrap}>
        <Text style={styles.eventKind}>{event.kind}</Text>
        <Text style={styles.eventDetail}>{event.detail}</Text>
      </View>
      <View style={styles.eventMeta}>
        <Text style={[styles.eventConfidence, { color }]}>{confidenceLabel(event.confidence)}</Text>
        <Text style={styles.eventTime}>{event.at}</Text>
      </View>
    </View>
  )
}

function AxisRows({ title, value, unit }: { title: string; value: SensorVector; unit: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {(['x', 'y', 'z'] as const).map((axis) => (
        <View key={axis} style={styles.axisRow}>
          <Text style={styles.axisName}>{axis.toUpperCase()}</Text>
          <View style={styles.axisBarTrack}>
            <View
              style={[
                styles.axisBarFill,
                {
                  width: `${Math.min(Math.abs(value[axis]) / 4, 1) * 100}%`,
                  backgroundColor: value[axis] >= 0 ? Colors.accent : Colors.accentRed,
                },
              ]}
            />
          </View>
          <Text style={styles.axisValue}>
            {fmt(value[axis], 3)} {unit}
          </Text>
        </View>
      ))}
    </View>
  )
}

export default function SensorScreen() {
  useTheme()
  const queryClient = useQueryClient()
  const session = useAuthStore((state) => state.session)
  const profile = useProfileStore((state) => state.profile)
  const awardRunXp = useProfileStore((state) => state.awardRunXp)
  const createSession = useRunStore((state) => state.createSession)
  const createRun = useRunStore((state) => state.createRun)
  const fetchTrailRules = useTrailRulesStore((state) => state.fetchRules)
  const trailRules = useTrailRulesStore((state) => state.rules)

  const [running, setRunning] = useState(false)
  const [accelerometer, setAccelerometer] = useState<SensorVector>(emptyVector)
  const [gyroscope, setGyroscope] = useState<SensorVector>(emptyVector)
  const [jerk, setJerk] = useState(0)
  const [maxG, setMaxG] = useState(0)
  const [maxRotation, setMaxRotation] = useState(0)
  const [airtimeMs, setAirtimeMs] = useState(0)
  const [lastAirStart, setLastAirStart] = useState<number | null>(null)
  const [activeCandidate, setActiveCandidate] = useState('Idle')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [events, setEvents] = useState<DetectedEvent[]>([])
  const [tpModal, setTpModal] = useState<TpBreakdown | null>(null)
  const [autoArmed, setAutoArmed] = useState(false)
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [trailState, setTrailState] = useState<TrailDetectionState>(initialTrailDetectionState)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0)
  const [distanceM, setDistanceM] = useState(0)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)

  const accelerometerSubscription = useRef<SensorSubscription | null>(null)
  const gyroscopeSubscription = useRef<SensorSubscription | null>(null)
  const locationSubscription = useRef<Location.LocationSubscription | null>(null)
  const runningRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)
  const trailRulesRef = useRef(trailRules)
  const lastGpsPoint = useRef<TrailPoint | null>(null)
  const latestGyro = useRef<SensorVector>(emptyVector)
  const previousG = useRef(0)
  const previousAt = useRef<number | null>(null)
  const lowGStart = useRef<number | null>(null)
  const pendingLanding = useRef<{ until: number; durationMs: number } | null>(null)
  const rootHits = useRef<number[]>([])
  const cornerStart = useRef<number | null>(null)
  const eventCooldownUntil = useRef<Record<EventKind, number>>({
    Airtime: 0,
    Roots: 0,
    Corner: 0,
    Impact: 0,
  })

  const gForce = useMemo(() => vectorMagnitude(accelerometer), [accelerometer])
  const rotationRate = useMemo(() => vectorMagnitude(gyroscope), [gyroscope])

  useEffect(() => {
    runningRef.current = running
  }, [running])

  useEffect(() => {
    startedAtRef.current = startedAt
  }, [startedAt])

  useEffect(() => {
    trailRulesRef.current = trailRules
  }, [trailRules])

  const pushEvent = (kind: EventKind, confidence: number, detail: string, now: number, cooldownMs = 900) => {
    if (now < eventCooldownUntil.current[kind]) return

    eventCooldownUntil.current[kind] = now + cooldownMs
    setEvents((current) => [
      {
        id: `${kind}-${now}`,
        kind,
        confidence: clamp(confidence, 0.05, 0.99),
        detail,
        at: new Date(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
      ...current,
    ].slice(0, 12))
  }

  const handleAccelerometer = (sample: SensorVector) => {
    const now = Date.now()
    const nextG = vectorMagnitude(sample)
    const gyroMag = vectorMagnitude(latestGyro.current)
    const previousTime = previousAt.current
    const dt = previousTime === null ? sampleMs / 1000 : Math.max((now - previousTime) / 1000, 0.001)
    const nextJerk = Math.abs(nextG - previousG.current) / dt

    setAccelerometer(sample)
    setJerk(nextJerk)
    setMaxG((current) => Math.max(current, nextG))

    if (nextG < airtimeThresholdG) {
      if (lowGStart.current === null) lowGStart.current = now
      setLastAirStart(lowGStart.current)
      setActiveCandidate('possible airtime')
    } else {
      if (lowGStart.current !== null) {
        const durationMs = now - lowGStart.current
        if (durationMs >= minAirtimeMs) {
          pendingLanding.current = { until: now + landingWindowMs, durationMs }
        }
        lowGStart.current = null
        setLastAirStart(null)
      }
    }

    if (pendingLanding.current && now <= pendingLanding.current.until && nextG >= landingSpikeG) {
      const durationMs = pendingLanding.current.durationMs
      setAirtimeMs((current) => Math.max(current, durationMs))
      pushEvent(
        'Airtime',
        0.45 + durationMs / 500 + (nextG - landingSpikeG) / 4,
        `${Math.round(durationMs)}ms low-g, landing ${fmt(nextG, 1)}g`,
        now,
        1200,
      )
      pendingLanding.current = null
    }

    if (pendingLanding.current && now > pendingLanding.current.until) {
      pendingLanding.current = null
    }

    if (nextJerk > rootJerkThreshold && nextG > 0.55) {
      rootHits.current = [...rootHits.current, now].filter((hitAt) => now - hitAt <= rootWindowMs)
    } else {
      rootHits.current = rootHits.current.filter((hitAt) => now - hitAt <= rootWindowMs)
    }

    if (rootHits.current.length >= 6 && nextG > airtimeThresholdG) {
      pushEvent(
        'Roots',
        0.35 + rootHits.current.length / 14 + nextJerk / 60,
        `${rootHits.current.length} hits, jerk ${fmt(nextJerk, 1)}g/s`,
        now,
        1300,
      )
      setActiveCandidate('roots / chatter')
    }

    const cornerLike = gyroMag > cornerGyroThreshold && nextG > 0.75 && nextG < 1.8 && nextJerk < 5
    if (cornerLike) {
      if (cornerStart.current === null) cornerStart.current = now
      const durationMs = now - cornerStart.current
      setActiveCandidate('possible corner')
      if (durationMs >= cornerMinMs) {
        pushEvent(
          'Corner',
          0.3 + durationMs / 1800 + gyroMag / 8,
          `${Math.round(durationMs)}ms gyro, ${fmt(gyroMag, 1)}rad/s`,
          now,
          1800,
        )
      }
    } else {
      cornerStart.current = null
    }

    if (nextG >= 2.3 && nextJerk > 10) {
      pushEvent('Impact', 0.4 + (nextG - 2.3) / 3, `${fmt(nextG, 1)}g spike`, now, 800)
    }

    if (nextG >= airtimeThresholdG && rootHits.current.length < 6 && !cornerLike) {
      setActiveCandidate(nextJerk > 5 ? 'impact / shake' : 'tracking')
    }

    previousG.current = nextG
    previousAt.current = now
  }

  const handleGyroscope = (sample: SensorVector) => {
    const gyroMag = vectorMagnitude(sample)
    latestGyro.current = sample
    setMaxRotation((current) => Math.max(current, gyroMag))
    setGyroscope(sample)
  }

  const toggleRunning = () => {
    setRunning((current) => {
      const next = !current
      if (next && startedAt === null) {
        setStartedAt(Date.now())
        setLastSavedAt(null)
      }
      return next
    })
  }

  const toggleAutoArmed = async () => {
    if (autoArmed) {
      setAutoArmed(false)
      return
    }

    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') {
      setLocationPermission('denied')
      Alert.alert('Standort fehlt', 'Für Auto-Erkennung braucht die App Standortzugriff.')
      return
    }

    setLocationPermission('granted')
    setTrailState(initialTrailDetectionState)
    await fetchTrailRules().catch(() => [])
    setAutoArmed(true)
  }

  useEffect(() => {
    if (!running) {
      accelerometerSubscription.current?.remove()
      gyroscopeSubscription.current?.remove()
      accelerometerSubscription.current = null
      gyroscopeSubscription.current = null
      return
    }

    Accelerometer.setUpdateInterval(sampleMs)
    Gyroscope.setUpdateInterval(sampleMs)

    accelerometerSubscription.current = Accelerometer.addListener(handleAccelerometer)
    gyroscopeSubscription.current = Gyroscope.addListener(handleGyroscope)

    return () => {
      accelerometerSubscription.current?.remove()
      gyroscopeSubscription.current?.remove()
      accelerometerSubscription.current = null
      gyroscopeSubscription.current = null
    }
  }, [running])

  useEffect(() => {
    if (!autoArmed) {
      locationSubscription.current?.remove()
      locationSubscription.current = null
      return
    }

    let cancelled = false

    async function watchTrail() {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 1000,
        },
        (location) => {
          if (cancelled) return

          const sample = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracyM: location.coords.accuracy,
            speedMs: location.coords.speed,
            timestampMs: location.timestamp,
          }

          const point: TrailPoint = { latitude: sample.latitude, longitude: sample.longitude }
          const currentSpeedKmh = Math.max(0, (location.coords.speed ?? 0) * 3.6)

          setGpsAccuracy(location.coords.accuracy)
          setSpeedKmh(currentSpeedKmh)

          // Accumulate distance + track top speed only while a run is being recorded.
          if (runningRef.current) {
            if (lastGpsPoint.current) {
              setDistanceM((current) => current + distanceMeters(lastGpsPoint.current!, point))
            }
            setMaxSpeedKmh((current) => Math.max(current, currentSpeedKmh))
          }
          lastGpsPoint.current = point

          setTrailState((current) => {
            const next = updateTrailDetection(current, sample, undefined, trailRulesToLines(trailRulesRef.current))

            if (next.status === 'running' && !runningRef.current) {
              runningRef.current = true
              const startMs = next.startedAtMs ?? Date.now()
              startedAtRef.current = startMs
              setStartedAt(startMs)
              setLastSavedAt(null)
              setRunning(true)
              // Fresh distance/speed accounting from the moment the run begins.
              lastGpsPoint.current = point
              setDistanceM(0)
              setMaxSpeedKmh(0)
            }

            if (next.status === 'finished' && runningRef.current) {
              runningRef.current = false
              setRunning(false)
              setAutoArmed(false)
            }

            return next
          })
        },
      )
    }

    watchTrail().catch((error: any) => {
      setAutoArmed(false)
      Alert.alert('GPS fehlgeschlagen', error?.message ?? 'Standort konnte nicht gestartet werden.')
    })

    return () => {
      cancelled = true
      locationSubscription.current?.remove()
      locationSubscription.current = null
    }
  }, [autoArmed])

  const reset = () => {
    setAccelerometer(emptyVector)
    setGyroscope(emptyVector)
    setMaxG(0)
    setMaxRotation(0)
    setAirtimeMs(0)
    setLastAirStart(null)
    setJerk(0)
    setActiveCandidate('Idle')
    setStartedAt(null)
    setLastSavedAt(null)
    setEvents([])
    setTrailState(initialTrailDetectionState)
    setSpeedKmh(0)
    setMaxSpeedKmh(0)
    setDistanceM(0)
    setGpsAccuracy(null)
    lastGpsPoint.current = null
    latestGyro.current = emptyVector
    previousG.current = 0
    previousAt.current = null
    lowGStart.current = null
    pendingLanding.current = null
    rootHits.current = []
    cornerStart.current = null
  }

  const currentAirMs = lastAirStart === null ? 0 : Date.now() - lastAirStart
  const bestAirMs = Math.max(airtimeMs, currentAirMs)
  const elapsedSeconds = startedAt === null ? 0 : Math.max((Date.now() - startedAt) / 1000, 0)
  const canSave = Boolean(session?.userId && profile && startedAt && !running && elapsedSeconds > 0)

  const saveTestRun = async () => {
    if (!session?.userId || !profile || !startedAt) {
      Alert.alert('Nicht bereit', 'Du musst eingeloggt sein und eine Aufnahme gestartet haben.')
      return
    }

    setSaving(true)
    try {
      const airtime    = Number((bestAirMs / 1000).toFixed(3))
      const gforce     = Number(maxG.toFixed(3))
      const totalTime  = Number(elapsedSeconds.toFixed(2))
      const topSpeed   = Number(maxSpeedKmh.toFixed(2))
      const distance   = Number(distanceM.toFixed(1))

      const createdSession = await createSession(session.userId, todayId())

      const run = await createRun({
        sessionId: createdSession.$id,
        userId: session.userId,
        username: profile.username,
        tier: profile.tier ?? 'rookie',
        startedAt: new Date(startedAt).toISOString(),
        totalTime,
        p1Time: null,
        p2Time: null,
        maxAirtime: airtime,
        maxSpeed: topSpeed,
        maxGForce: gforce,
        distance,
        dataSource: 'phone',
      })

      // XP (incl. PB + first-run-of-day bonuses) is computed and awarded server-side.
      const breakdown = await awardRunXp(run.$id)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['monthly-streak'] }),
      ])

      setLastSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      if (breakdown) {
        const { total, base, sensor, pb, daily } = breakdown
        setTpModal({ total, base, sensor, pb, daily })
      }
    } catch (error: any) {
      Alert.alert('Speichern fehlgeschlagen', error?.message ?? 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassBackground>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LIVE SENSOR TEST</Text>
          <Text style={styles.title}>Handywerte</Text>
          <Text style={styles.sub}>
            Accelerometer ist in g, Gyro in rad/s. Handy fest am Bike oder Körper befestigen.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.primaryButton, running && styles.stopButton]} onPress={toggleRunning}>
              <Text style={styles.primaryButtonText}>{running ? 'Stop' : 'Start'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.autoButton, autoArmed && styles.autoButtonActive]}
            onPress={toggleAutoArmed}
          >
            <Text style={[styles.autoButtonText, autoArmed && styles.autoButtonTextActive]}>
              {autoArmed ? 'Auto-Erkennung aktiv' : 'Auto-Erkennung scharfstellen'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (!canSave || saving) && styles.disabledButton]}
            onPress={saveTestRun}
            disabled={!canSave || saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Speichert...' : 'Test-Run speichern'}</Text>
          </TouchableOpacity>
          <Text style={styles.saveHint}>
            {lastSavedAt ? `Zuletzt gespeichert: ${lastSavedAt}` : 'Starten, bewegen, stoppen, dann speichern.'}
          </Text>
        </View>

        <View style={styles.grid}>
          <ValueTile label="LIVE G" value={fmt(gForce)} unit="g" highlight />
          <ValueTile label="MAX G" value={fmt(maxG)} unit="g" />
          <ValueTile label="AIRTIME" value={fmt(bestAirMs / 1000)} unit="s" />
          <ValueTile label="ROTATION" value={fmt(rotationRate)} unit="rad/s" />
          <ValueTile label="JERK" value={fmt(jerk, 1)} unit="g/s" />
          <ValueTile label="MAX ROT" value={fmt(maxRotation)} unit="rad/s" />
          <ValueTile label="GPS SPEED" value={fmt(speedKmh, 1)} unit="km/h" />
          <ValueTile label="MAX SPEED" value={fmt(maxSpeedKmh, 1)} unit="km/h" />
          <ValueTile label="DISTANZ" value={fmt(distanceM, 0)} unit="m" />
          <ValueTile label="GPS ACC" value={gpsAccuracy === null ? '—' : fmt(gpsAccuracy, 0)} unit="m" />
          <ValueTile label="DAUER" value={fmt(elapsedSeconds, 1)} unit="s" />
          <ValueTile label="STATE" value={activeCandidate} unit="debug" highlight />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Trail Auto-Erkennung</Text>
            <Text style={styles.panelSub}>{trailState.activeLineId?.toUpperCase() ?? '—'}</Text>
          </View>
          <Text style={styles.detectorStatus}>{trailState.status}</Text>
          <Text style={styles.emptyText}>{trailState.reason}</Text>
          <Text style={styles.saveHint}>
            Permission: {locationPermission} · Confidence: {Math.round(trailState.confidence * 100)}%
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Event Candidates</Text>
            <Text style={styles.panelSub}>{events.length} Treffer</Text>
          </View>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>Start drücken und Handy bewegen.</Text>
          ) : (
            events.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </View>

        <AxisRows title="Accelerometer" value={accelerometer} unit="g" />
        <AxisRows title="Gyroscope" value={gyroscope} unit="rad/s" />

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Für MTB später wichtig</Text>
          <Text style={styles.noteText}>
            Airtime braucht jetzt low-g unter {airtimeThresholdG}g plus Landing-Spike über {landingSpikeG}g.
            Wurzeln laufen über Jerk-Cluster. Kurven laufen über längere Gyro-Bewegung.
          </Text>
        </View>
      </ScrollView>

      {tpModal && (
        <TpRewardModal
          visible={Boolean(tpModal)}
          breakdown={tpModal}
          onDismiss={() => setTpModal(null)}
        />
      )}
    </GlassBackground>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  hero: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    padding: 16,
  },
  eyebrow: {
    fontFamily: Fonts.bodyBd,
    fontSize: 10,
    letterSpacing: 1.6,
    color: Colors.accent,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 38,
    letterSpacing: 2,
    color: Colors.text,
    marginTop: 4,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.muted,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: Colors.accentRed,
  },
  primaryButtonText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 14,
    color: '#111',
    textTransform: 'uppercase',
  },
  secondaryButton: {
    width: 104,
    height: 46,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 14,
    color: Colors.text,
    textTransform: 'uppercase',
  },
  autoButton: {
    height: 42,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Colors.accent}44`,
    backgroundColor: `${Colors.accent}0d`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  autoButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}22`,
  },
  autoButtonText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 12,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  autoButtonTextActive: {
    color: Colors.text,
  },
  saveButton: {
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontFamily: Fonts.bodyBd,
    fontSize: 13,
    color: Colors.bgDeep,
    textTransform: 'uppercase',
  },
  saveHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.dim,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileHighlight: {
    borderColor: `${Colors.accent}55`,
    backgroundColor: `${Colors.accent}10`,
  },
  tileLabel: {
    fontFamily: Fonts.bodyBd,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.muted,
  },
  tileValue: {
    fontFamily: Fonts.monoBd,
    fontSize: 28,
    color: Colors.text,
  },
  highlightText: {
    color: Colors.accent,
  },
  tileUnit: {
    fontFamily: Fonts.bodyBd,
    fontSize: 11,
    color: Colors.dim,
  },
  panel: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    padding: 14,
    gap: 12,
  },
  panelTitle: {
    fontFamily: Fonts.bodyBd,
    fontSize: 14,
    color: Colors.text,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.dim,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  detectorStatus: {
    fontFamily: Fonts.monoBd,
    fontSize: 18,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  eventRow: {
    minHeight: 54,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
  },
  eventDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  eventTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  eventKind: {
    fontFamily: Fonts.bodyBd,
    fontSize: 13,
    color: Colors.text,
  },
  eventDetail: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  eventMeta: {
    width: 58,
    alignItems: 'flex-end',
  },
  eventConfidence: {
    fontFamily: Fonts.monoBd,
    fontSize: 12,
  },
  eventTime: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.dim,
    marginTop: 2,
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  axisName: {
    width: 18,
    fontFamily: Fonts.monoBd,
    fontSize: 12,
    color: Colors.muted,
  },
  axisBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  axisBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  axisValue: {
    width: 94,
    textAlign: 'right',
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.text,
  },
  note: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.accent}33`,
    backgroundColor: `${Colors.accent}0d`,
    padding: 14,
  },
  noteTitle: {
    fontFamily: Fonts.bodyBd,
    fontSize: 13,
    color: Colors.accent,
    marginBottom: 6,
  },
  noteText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.muted,
  },
})
