#!/usr/bin/env node
// ─── Vollständiges Appwrite-Setup für MOE MOEA Trails ─────────────────────────
// Idempotent: kann beliebig oft ausgeführt werden (erstellt nur was fehlt).
// Deckt alles ab: Datenbank, alle Collections, alle Felder, alle Indizes.

const fs = require('node:fs')
const path = require('node:path')

// ── Konfiguration aus .env.local oder Umgebungsvariablen ─────────────────────

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
      if (!match) return env
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
      return env
    }, {})
}

function loadMcpEnv() {
  const mcpPath = path.join(process.cwd(), '.mcp.json')
  if (!fs.existsSync(mcpPath)) return {}
  const config = JSON.parse(fs.readFileSync(mcpPath, 'utf8'))
  return config.mcpServers?.appwrite?.env ?? {}
}

const localEnv = readDotEnv(path.join(process.cwd(), '.env.local'))
const mcpEnv   = loadMcpEnv()

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   ?? localEnv.EXPO_PUBLIC_APPWRITE_ENDPOINT   ?? mcpEnv.APPWRITE_ENDPOINT
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? localEnv.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? mcpEnv.APPWRITE_PROJECT_ID
const API_KEY    = process.env.APPWRITE_KEY ?? process.env.APPWRITE_API_KEY ?? localEnv.APPWRITE_KEY ?? localEnv.APPWRITE_API_KEY ?? mcpEnv.APPWRITE_API_KEY
const DB_ID      = process.env.APPWRITE_DB_ID      ?? localEnv.EXPO_PUBLIC_DB_ID               ?? mcpEnv.APPWRITE_DATABASE_ID ?? 'trails-db'

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Fehlende Konfiguration — benötigt: Endpoint, Project-ID und API-Key.')
  console.error('Entweder als Umgebungsvariable oder in .env.local setzen.')
  process.exit(1)
}

const headers = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key':     API_KEY,
  'Content-Type':       'application/json',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── HTTP-Helfer ───────────────────────────────────────────────────────────────

async function req(method, route, body) {
  const res  = await fetch(`${ENDPOINT}${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err    = new Error(data?.message ?? `${method} ${route} → HTTP ${res.status}`)
    err.status   = res.status
    err.appwrite = data
    throw err
  }
  return data
}

async function exists404(route) {
  try {
    await req('GET', route)
    return true
  } catch (e) {
    if (e.status === 404) return false
    throw e
  }
}

// ── Datenbank ─────────────────────────────────────────────────────────────────

async function ensureDatabase() {
  if (await exists404(`/databases/${DB_ID}`)) {
    console.log(`✓ database: ${DB_ID}`)
    return
  }
  await req('POST', '/databases', { databaseId: DB_ID, name: 'Trails DB' })
  console.log(`+ database created: ${DB_ID}`)
  await sleep(800)
}

// ── Collection ────────────────────────────────────────────────────────────────

async function ensureCollection(id, name, permissions) {
  if (await exists404(`/databases/${DB_ID}/collections/${id}`)) {
    // Permissions immer aktualisieren (idempotent)
    await req('PUT', `/databases/${DB_ID}/collections/${id}`, {
      name,
      permissions,
      documentSecurity: true,
      enabled: true,
    })
    console.log(`✓ ${id}`)
  } else {
    await req('POST', `/databases/${DB_ID}/collections`, {
      collectionId: id,
      name,
      permissions,
      documentSecurity: true,
    })
    console.log(`+ ${id} erstellt`)
    await sleep(600)
  }
}

// ── Attribute ─────────────────────────────────────────────────────────────────

async function getAttributes(collectionId) {
  const data = await req('GET', `/databases/${DB_ID}/collections/${collectionId}/attributes?limit=100`)
  return data.attributes ?? []
}

async function waitForAttribute(collectionId, key) {
  for (let i = 0; i < 24; i++) {
    const attrs = await getAttributes(collectionId)
    if (attrs.find((a) => a.key === key)?.status === 'available') return
    await sleep(750)
  }
  throw new Error(`Attribut ${collectionId}.${key} wurde nicht verfügbar`)
}

async function ensureAttr(collectionId, type, payload) {
  const attrs = await getAttributes(collectionId)
  if (attrs.some((a) => a.key === payload.key)) {
    process.stdout.write(`  ✓ ${payload.key}\n`)
    return
  }
  await req('POST', `/databases/${DB_ID}/collections/${collectionId}/attributes/${type}`, payload)
  process.stdout.write(`  + ${payload.key}\n`)
  await waitForAttribute(collectionId, payload.key)
}

// ── Indizes ───────────────────────────────────────────────────────────────────

async function getIndexes(collectionId) {
  const data = await req('GET', `/databases/${DB_ID}/collections/${collectionId}/indexes?limit=100`)
  return data.indexes ?? []
}

async function ensureIndex(collectionId, payload) {
  const indexes = await getIndexes(collectionId)
  if (indexes.some((i) => i.key === payload.key)) {
    process.stdout.write(`  ✓ idx:${payload.key}\n`)
    return
  }
  await req('POST', `/databases/${DB_ID}/collections/${collectionId}/indexes`, payload)
  process.stdout.write(`  + idx:${payload.key}\n`)
  await sleep(600)
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── profiles ──────────────────────────────────────────────────────────────────
// Schreibzugriff NUR über app-actions Function (API-Key).
// Clients lesen nur (für Leaderboards und Profilseiten).

async function setupProfiles() {
  await ensureCollection('profiles', 'profiles', [
    'read("any")',
    // Kein create("users") — initProfile läuft serverseitig via API-Key
  ])

  // Identität
  await ensureAttr('profiles', 'string',  { key: 'userId',   size: 36,  required: true })
  await ensureAttr('profiles', 'string',  { key: 'username', size: 64,  required: true })
  await ensureAttr('profiles', 'string',  { key: 'team',     size: 64,  required: false, default: 'Solo' })

  // Progression
  await ensureAttr('profiles', 'integer', { key: 'xp',        required: false, min: 0, max: 9999999, default: 0 })
  await ensureAttr('profiles', 'integer', { key: 'pendingXp', required: false, min: 0, max: 999999,  default: 0 })
  await ensureAttr('profiles', 'integer', { key: 'level',     required: false, min: 1, max: 9999,    default: 1 })
  await ensureAttr('profiles', 'enum',    { key: 'tier', elements: ['rookie', 'veteran', 'legend'], required: false, default: 'rookie' })

  // Münzen & Shop
  await ensureAttr('profiles', 'integer', { key: 'coins',        required: false, min: 0, max: 9999999, default: 0 })
  await ensureAttr('profiles', 'integer', { key: 'pendingCoins', required: false, min: 0, max: 999999,  default: 0 })
  await ensureAttr('profiles', 'string',  { key: 'ownedParts', size: 64, required: false, array: true })

  // Rechte
  await ensureAttr('profiles', 'boolean', { key: 'approved', required: false, default: false })
  await ensureAttr('profiles', 'boolean', { key: 'isAdmin',  required: false, default: false })

  await ensureIndex('profiles', { key: 'by_xp',    type: 'key', attributes: ['xp'],    orders: ['DESC'] })
  await ensureIndex('profiles', { key: 'by_level',  type: 'key', attributes: ['level'], orders: ['DESC'] })
  await ensureIndex('profiles', { key: 'by_userId', type: 'key', attributes: ['userId'], orders: ['ASC'] })
}

// ── bike_configs ──────────────────────────────────────────────────────────────
// User schreibt direkt (Bike-Aussehen). Nur kosmetische Daten.
// ownedParts und equippedFork/Shock werden vom Client gesetzt (nur visuell),
// der Kauf läuft aber serverseitig über purchaseItem.

async function setupBikeConfigs() {
  await ensureCollection('bike_configs', 'bike_configs', [
    'create("users")',
    'read("any")',
  ])

  // Basis
  await ensureAttr('bike_configs', 'string', { key: 'userId', size: 36, required: true })

  // Bike-Typ & Technik
  await ensureAttr('bike_configs', 'enum',   { key: 'bikeType',   elements: ['hardtail', 'enduro', 'downhill'], required: false, default: 'hardtail' })
  await ensureAttr('bike_configs', 'enum',   { key: 'suspension', elements: ['air', 'coil'],                    required: false, default: 'air' })
  await ensureAttr('bike_configs', 'enum',   { key: 'material',   elements: ['alu', 'carbon'],                  required: false, default: 'alu' })
  await ensureAttr('bike_configs', 'string', { key: 'bikeColor',  size: 16, required: false, default: '#1a1a1a' })
  await ensureAttr('bike_configs', 'string', { key: 'marke',      size: 64, required: false })
  await ensureAttr('bike_configs', 'string', { key: 'modell',     size: 64, required: false })
  await ensureAttr('bike_configs', 'string', { key: 'federweg_v', size: 8,  required: false })
  await ensureAttr('bike_configs', 'string', { key: 'federweg_h', size: 8,  required: false })

  // Fahrer-Optik
  await ensureAttr('bike_configs', 'string', { key: 'jerseyJ',    size: 16, required: false, default: '#e8e4dc' })
  await ensureAttr('bike_configs', 'string', { key: 'jerseyD',    size: 16, required: false, default: '#9a9890' })
  await ensureAttr('bike_configs', 'string', { key: 'hairColor',  size: 16, required: false, default: '#1a1210' })
  await ensureAttr('bike_configs', 'string', { key: 'skinColor',  size: 16, required: false, default: '#d4a574' })
  await ensureAttr('bike_configs', 'string', { key: 'eyeColor',   size: 16, required: false, default: '#99EA57' })
  await ensureAttr('bike_configs', 'string', { key: 'shirtColor', size: 16, required: false, default: '#e8e4dc' })
  await ensureAttr('bike_configs', 'string', { key: 'pantsColor', size: 16, required: false, default: '#9a9890' })
  await ensureAttr('bike_configs', 'enum',   { key: 'hairStyle',  elements: ['short', 'long', 'curly'], required: false, default: 'short' })

  // Avatar
  await ensureAttr('bike_configs', 'string', { key: 'avatarPresetId', size: 64,  required: false, default: 'messy_green' })
  await ensureAttr('bike_configs', 'string', { key: 'avatarUrl',      size: 512, required: false })

  // Ausgerüstete Parts (Händler)
  await ensureAttr('bike_configs', 'string', { key: 'equippedFork',  size: 64, required: false })
  await ensureAttr('bike_configs', 'string', { key: 'equippedShock', size: 64, required: false })
}

// ── sessions ──────────────────────────────────────────────────────────────────
// Eine Session pro User pro Tag. Gruppiert Runs.

async function setupSessions() {
  await ensureCollection('sessions', 'sessions', [
    'create("users")',
    'read("any")',
  ])

  await ensureAttr('sessions', 'string', { key: 'userId',  size: 36, required: true })
  await ensureAttr('sessions', 'string', { key: 'date',    size: 10, required: true })
  await ensureAttr('sessions', 'string', { key: 'trailId', size: 36, required: false, default: 'moe-moea' })

  await ensureIndex('sessions', { key: 'by_user_date', type: 'key', attributes: ['userId', 'date'], orders: ['ASC', 'DESC'] })
}

// ── runs ──────────────────────────────────────────────────────────────────────
// Einzelne Fahrten mit Zeiten, Sensor-Werten, Distanz.

async function setupRuns() {
  await ensureCollection('runs', 'runs', [
    'create("users")',
    'read("any")',
  ])

  await ensureAttr('runs', 'string',   { key: 'sessionId',  size: 36, required: true })
  await ensureAttr('runs', 'string',   { key: 'userId',     size: 36, required: true })
  await ensureAttr('runs', 'string',   { key: 'username',   size: 64, required: true })
  await ensureAttr('runs', 'enum',     { key: 'tier', elements: ['rookie', 'veteran', 'legend'], required: true })
  await ensureAttr('runs', 'datetime', { key: 'startedAt',  required: true })
  await ensureAttr('runs', 'float',    { key: 'totalTime',  required: true,  min: 0 })
  await ensureAttr('runs', 'float',    { key: 'p1Time',     required: false, min: 0 })
  await ensureAttr('runs', 'float',    { key: 'p2Time',     required: false, min: 0 })
  await ensureAttr('runs', 'float',    { key: 'maxAirtime', required: true,  min: 0 })
  await ensureAttr('runs', 'float',    { key: 'maxSpeed',   required: true,  min: 0 })
  await ensureAttr('runs', 'float',    { key: 'maxGForce',  required: true,  min: 0 })
  await ensureAttr('runs', 'float',    { key: 'distance',   required: true,  min: 0 })
  await ensureAttr('runs', 'enum',     { key: 'dataSource', elements: ['phone', 'external'], required: true })
  // Replay-Guard: verhindert doppelte XP-Vergabe für denselben Run
  await ensureAttr('runs', 'boolean',  { key: 'xpAwarded',  required: false, default: false })

  const runIndexes = [
    { key: 'by_user',    attributes: ['userId'],     orders: ['ASC'] },
    { key: 'by_session', attributes: ['sessionId'],  orders: ['ASC'] },
    { key: 'by_started', attributes: ['startedAt'],  orders: ['DESC'] },
    { key: 'by_airtime', attributes: ['maxAirtime'], orders: ['DESC'] },
    { key: 'by_speed',   attributes: ['maxSpeed'],   orders: ['DESC'] },
    { key: 'by_gforce',  attributes: ['maxGForce'],  orders: ['DESC'] },
    { key: 'by_time',    attributes: ['totalTime'],  orders: ['ASC'] },
    { key: 'by_p1',      attributes: ['p1Time'],     orders: ['ASC'] },
    { key: 'by_p2',      attributes: ['p2Time'],     orders: ['ASC'] },
  ]
  for (const idx of runIndexes) await ensureIndex('runs', { type: 'key', ...idx })
}

// ── clip_posts ────────────────────────────────────────────────────────────────
// Social-Feed: Video-Posts mit Fire-Reaktionen.

async function setupClipPosts() {
  await ensureCollection('clip_posts', 'clip_posts', [
    'create("users")',
    'read("any")',
  ])

  await ensureAttr('clip_posts', 'string',  { key: 'userId',       size: 36, required: true })
  await ensureAttr('clip_posts', 'string',  { key: 'username',     size: 64, required: true })
  await ensureAttr('clip_posts', 'enum',    { key: 'tier', elements: ['rookie', 'veteran', 'legend'], required: true })
  await ensureAttr('clip_posts', 'string',  { key: 'runId',        size: 36, required: false })
  await ensureAttr('clip_posts', 'string',  { key: 'contestMonth', size: 7,  required: true })
  await ensureAttr('clip_posts', 'boolean', { key: 'verified',     required: false, default: false })
  await ensureAttr('clip_posts', 'integer', { key: 'fireCount',    required: false, min: 0, default: 0 })
  await ensureAttr('clip_posts', 'string',  { key: 'firedBy',      size: 36, required: false, array: true })

  await ensureIndex('clip_posts', { key: 'by_contest', type: 'key', attributes: ['contestMonth', 'fireCount'], orders: ['DESC', 'DESC'] })
  await ensureIndex('clip_posts', { key: 'by_user',    type: 'key', attributes: ['userId'],                    orders: ['ASC'] })
}

// ── fires ─────────────────────────────────────────────────────────────────────
// Eine Zeile pro (userId, postId) — Quelle der Wahrheit für Fire-Counts.
// Kein Client-Zugriff: wird ausschließlich von app-actions (API-Key) verwaltet.

async function setupFires() {
  await ensureCollection('fires', 'fires', [
    // Bewusst keine Client-Permissions — nur Function-API-Key schreibt hier
  ])

  await ensureAttr('fires', 'string', { key: 'userId', size: 36, required: true })
  await ensureAttr('fires', 'string', { key: 'postId', size: 36, required: true })

  await ensureIndex('fires', { key: 'by_user_post', type: 'unique', attributes: ['userId', 'postId'], orders: ['ASC', 'ASC'] })
  await ensureIndex('fires', { key: 'by_post',      type: 'key',    attributes: ['postId'],            orders: ['ASC'] })
}

// ── trail_rules ───────────────────────────────────────────────────────────────
// Definiert Start/Ziel-Koordinaten und Toleranzen für P1 und P2.
// Admin schreibt, alle lesen.

async function setupTrailRules() {
  await ensureCollection('trail_rules', 'trail_rules', [
    'create("users")',
    'read("any")',
  ])

  await ensureAttr('trail_rules', 'enum',    { key: 'lineId',                elements: ['p1', 'p2'], required: true })
  await ensureAttr('trail_rules', 'string',  { key: 'name',                  size: 32, required: true })
  await ensureAttr('trail_rules', 'boolean', { key: 'enabled',               required: true })
  await ensureAttr('trail_rules', 'float',   { key: 'startLat',              required: true })
  await ensureAttr('trail_rules', 'float',   { key: 'startLon',              required: true })
  await ensureAttr('trail_rules', 'float',   { key: 'finishLat',             required: true })
  await ensureAttr('trail_rules', 'float',   { key: 'finishLon',             required: true })
  await ensureAttr('trail_rules', 'float',   { key: 'startRadiusM',          required: true, min: 5,  max: 200 })
  await ensureAttr('trail_rules', 'float',   { key: 'finishRadiusM',         required: true, min: 5,  max: 200 })
  await ensureAttr('trail_rules', 'float',   { key: 'minStartSpeedMs',       required: true, min: 0,  max: 20 })
  await ensureAttr('trail_rules', 'float',   { key: 'directionToleranceDeg', required: true, min: 10, max: 180 })
  await ensureAttr('trail_rules', 'string',  { key: 'testSamples',           size: 12000, required: false, default: '[]' })
  await ensureAttr('trail_rules', 'string',  { key: 'updatedBy',             size: 36, required: true })

  await ensureIndex('trail_rules', { key: 'by_line', type: 'unique', attributes: ['lineId'], orders: ['ASC'] })
}

// ── trail_features ────────────────────────────────────────────────────────────
// Sprünge, Drops, Kurven etc. auf dem Trail — für Map-Overlay.

async function setupTrailFeatures() {
  await ensureCollection('trail_features', 'trail_features', [
    'create("users")',
    'read("any")',
  ])

  await ensureAttr('trail_features', 'enum',   { key: 'type', elements: ['jump', 'sender', 'drop', 'corner', 'berm', 'rock_garden'], required: true })
  await ensureAttr('trail_features', 'string', { key: 'name',      size: 64, required: true })
  await ensureAttr('trail_features', 'float',  { key: 'latitude',  required: true })
  await ensureAttr('trail_features', 'float',  { key: 'longitude', required: true })
  await ensureAttr('trail_features', 'enum',   { key: 'lineId', elements: ['p1', 'p2'], required: false })
  await ensureAttr('trail_features', 'string', { key: 'createdBy', size: 36, required: true })

  await ensureIndex('trail_features', { key: 'by_line', type: 'key', attributes: ['lineId'], orders: ['ASC'] })
  await ensureIndex('trail_features', { key: 'by_type', type: 'key', attributes: ['type'],   orders: ['ASC'] })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('MOE MOEA Trails — Appwrite Setup')
  console.log(`Endpoint:  ${ENDPOINT}`)
  console.log(`Project:   ${PROJECT_ID}`)
  console.log(`Datenbank: ${DB_ID}`)
  console.log('─'.repeat(48))

  await ensureDatabase()
  console.log()

  console.log('→ profiles')
  await setupProfiles()
  console.log()

  console.log('→ bike_configs')
  await setupBikeConfigs()
  console.log()

  console.log('→ sessions')
  await setupSessions()
  console.log()

  console.log('→ runs')
  await setupRuns()
  console.log()

  console.log('→ clip_posts')
  await setupClipPosts()
  console.log()

  console.log('→ fires')
  await setupFires()
  console.log()

  console.log('→ trail_rules')
  await setupTrailRules()
  console.log()

  console.log('→ trail_features')
  await setupTrailFeatures()
  console.log()

  console.log('─'.repeat(48))
  console.log('✓ Setup abgeschlossen.')
  console.log()
  console.log('Nächste Schritte:')
  console.log('  1. app-actions Function deployen (functions/app-actions/)')
  console.log('  2. Function-Env-Vars setzen (APPWRITE_DB_ID, APPWRITE_API_KEY, ...)')
  console.log('  3. .env.local mit EXPO_PUBLIC_* Variablen befüllen')
  console.log('  4. npx expo start')
}

main().catch((err) => {
  console.error()
  console.error('Setup fehlgeschlagen:', err.message)
  if (err.appwrite) console.error('Appwrite-Fehler:', JSON.stringify(err.appwrite, null, 2))
  process.exit(1)
})
