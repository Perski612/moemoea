#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

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
const mcpEnv = loadMcpEnv()

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? localEnv.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? mcpEnv.APPWRITE_ENDPOINT
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? localEnv.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? mcpEnv.APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_KEY ?? process.env.APPWRITE_API_KEY ?? mcpEnv.APPWRITE_API_KEY
const DB_ID = process.env.APPWRITE_DB_ID ?? localEnv.EXPO_PUBLIC_DB_ID ?? mcpEnv.APPWRITE_DATABASE_ID ?? 'trails-db'

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Missing Appwrite config. Need endpoint, project ID, and API key.')
  process.exit(1)
}

const headers = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function req(method, route, body) {
  const res = await fetch(`${ENDPOINT}${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data?.message ?? `${method} ${route} failed`)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

async function getCollections() {
  const data = await req('GET', `/databases/${DB_ID}/collections?limit=100`)
  return data.collections ?? []
}

async function ensureCollection(collectionId, name) {
  const collections = await getCollections()
  if (collections.some((collection) => collection.$id === collectionId)) {
    console.log(`✓ collection exists: ${collectionId}`)
    await ensureCollectionPermissions(collectionId, name)
    return
  }

  await req('POST', `/databases/${DB_ID}/collections`, {
    collectionId,
    name,
    permissions: ['create("users")', 'read("any")'],
    documentSecurity: true,
  })
  console.log(`+ collection created: ${collectionId}`)
  await sleep(600)
}

async function ensureCollectionPermissions(collectionId, name) {
  const collection = await req('GET', `/databases/${DB_ID}/collections/${collectionId}`)
  const permissions = new Set(collection.$permissions ?? [])
  permissions.add('create("users")')
  permissions.add('read("any")')

  await req('PUT', `/databases/${DB_ID}/collections/${collectionId}`, {
    name: collection.name ?? name,
    permissions: Array.from(permissions),
    documentSecurity: true,
    enabled: collection.enabled ?? true,
  })
}

async function getAttributes(collectionId) {
  const data = await req('GET', `/databases/${DB_ID}/collections/${collectionId}/attributes?limit=100`)
  return data.attributes ?? []
}

async function waitForAttribute(collectionId, key) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const attributes = await getAttributes(collectionId)
    const attribute = attributes.find((item) => item.key === key)
    if (attribute?.status === 'available') return
    await sleep(750)
  }
}

async function ensureAttribute(collectionId, type, payload) {
  const attributes = await getAttributes(collectionId)
  if (attributes.some((attribute) => attribute.key === payload.key)) {
    console.log(`  ✓ attr exists: ${collectionId}.${payload.key}`)
    return
  }

  await req('POST', `/databases/${DB_ID}/collections/${collectionId}/attributes/${type}`, payload)
  console.log(`  + attr created: ${collectionId}.${payload.key}`)
  await waitForAttribute(collectionId, payload.key)
}

async function getIndexes(collectionId) {
  const data = await req('GET', `/databases/${DB_ID}/collections/${collectionId}/indexes?limit=100`)
  return data.indexes ?? []
}

async function ensureIndex(collectionId, payload) {
  const indexes = await getIndexes(collectionId)
  if (indexes.some((index) => index.key === payload.key)) {
    console.log(`  ✓ index exists: ${collectionId}.${payload.key}`)
    return
  }

  await req('POST', `/databases/${DB_ID}/collections/${collectionId}/indexes`, payload)
  console.log(`  + index created: ${collectionId}.${payload.key}`)
  await sleep(600)
}

async function ensureProfileTier() {
  await ensureProfilePermissions()
  await ensureAttribute('profiles', 'integer', {
    key: 'pendingXp',
    required: false,
    default: 0,
    min: 0,
    max: 999999,
  })
  await ensureAttribute('profiles', 'enum', {
    key: 'tier',
    elements: ['rookie', 'veteran', 'legend'],
    required: false,
    default: 'rookie',
  })
}

async function ensureProfilePermissions() {
  const collection = await req('GET', `/databases/${DB_ID}/collections/profiles`)
  const permissions = new Set(collection.$permissions ?? [])
  permissions.add('create("users")')
  permissions.add('read("any")')
  permissions.add('update("users")')
  permissions.add('update("team:admins")')

  await req('PUT', `/databases/${DB_ID}/collections/profiles`, {
    name: collection.name ?? 'profiles',
    permissions: Array.from(permissions),
    documentSecurity: false,
    enabled: collection.enabled ?? true,
  })
}

async function ensureBikeConfigDetails() {
  await ensureCollectionPermissions('bike_configs', 'bike_configs')

  const colorAttrs = [
    ['hairColor', '#1a1210'],
    ['skinColor', '#d4a574'],
    ['eyeColor', '#99EA57'],
    ['shirtColor', '#e8e4dc'],
    ['pantsColor', '#9a9890'],
  ]

  for (const [key, defaultColor] of colorAttrs) {
    await ensureAttribute('bike_configs', 'string', {
      key,
      size: 16,
      required: false,
      default: defaultColor,
    })
  }

  await ensureAttribute('bike_configs', 'enum', {
    key: 'hairStyle',
    elements: ['short', 'long', 'curly'],
    required: false,
    default: 'short',
  })

  await ensureAttribute('bike_configs', 'string', {
    key: 'avatarPresetId',
    size: 64,
    required: false,
    default: 'messy_green',
  })

  await ensureAttribute('bike_configs', 'string', {
    key: 'avatarUrl',
    size: 512,
    required: false,
  })
}

async function setupSessions() {
  await ensureCollection('sessions', 'sessions')
  await ensureAttribute('sessions', 'string', { key: 'userId', size: 36, required: true })
  await ensureAttribute('sessions', 'string', { key: 'date', size: 10, required: true })
  await ensureAttribute('sessions', 'string', { key: 'trailId', size: 36, required: false, default: 'moe-moea' })
  await ensureIndex('sessions', {
    key: 'by_user_date',
    type: 'key',
    attributes: ['userId', 'date'],
    orders: ['ASC', 'DESC'],
  })
}

async function setupRuns() {
  await ensureCollection('runs', 'runs')
  await ensureAttribute('runs', 'string', { key: 'sessionId', size: 36, required: true })
  await ensureAttribute('runs', 'string', { key: 'userId', size: 36, required: true })
  await ensureAttribute('runs', 'string', { key: 'username', size: 64, required: true })
  await ensureAttribute('runs', 'enum', { key: 'tier', elements: ['rookie', 'veteran', 'legend'], required: true })
  await ensureAttribute('runs', 'datetime', { key: 'startedAt', required: true })
  await ensureAttribute('runs', 'float', { key: 'totalTime', required: true, min: 0 })
  await ensureAttribute('runs', 'float', { key: 'p1Time', required: false, min: 0 })
  await ensureAttribute('runs', 'float', { key: 'p2Time', required: false, min: 0 })
  await ensureAttribute('runs', 'float', { key: 'maxAirtime', required: true, min: 0 })
  await ensureAttribute('runs', 'float', { key: 'maxSpeed', required: true, min: 0 })
  await ensureAttribute('runs', 'float', { key: 'maxGForce', required: true, min: 0 })
  await ensureAttribute('runs', 'float', { key: 'distance', required: true, min: 0 })
  await ensureAttribute('runs', 'enum', { key: 'dataSource', elements: ['phone', 'external'], required: true })

  const indexes = [
    { key: 'by_user', attributes: ['userId'], orders: ['ASC'] },
    { key: 'by_session', attributes: ['sessionId'], orders: ['ASC'] },
    { key: 'by_started', attributes: ['startedAt'], orders: ['DESC'] },
    { key: 'by_airtime', attributes: ['maxAirtime'], orders: ['DESC'] },
    { key: 'by_speed', attributes: ['maxSpeed'], orders: ['DESC'] },
    { key: 'by_gforce', attributes: ['maxGForce'], orders: ['DESC'] },
    { key: 'by_time', attributes: ['totalTime'], orders: ['ASC'] },
    { key: 'by_p1', attributes: ['p1Time'], orders: ['ASC'] },
    { key: 'by_p2', attributes: ['p2Time'], orders: ['ASC'] },
  ]

  for (const index of indexes) {
    await ensureIndex('runs', { type: 'key', ...index })
  }
}

async function setupClipPosts() {
  await ensureCollection('clip_posts', 'clip_posts')
  await ensureAttribute('clip_posts', 'string', { key: 'userId', size: 36, required: true })
  await ensureAttribute('clip_posts', 'string', { key: 'username', size: 64, required: true })
  await ensureAttribute('clip_posts', 'enum', { key: 'tier', elements: ['rookie', 'veteran', 'legend'], required: true })
  await ensureAttribute('clip_posts', 'string', { key: 'runId', size: 36, required: false })
  await ensureAttribute('clip_posts', 'string', { key: 'contestMonth', size: 7, required: true })
  await ensureAttribute('clip_posts', 'boolean', { key: 'verified', required: false, default: false })
  await ensureAttribute('clip_posts', 'integer', { key: 'fireCount', required: false, min: 0, default: 0 })
  await ensureAttribute('clip_posts', 'string', { key: 'firedBy', size: 36, required: false, array: true })

  await ensureIndex('clip_posts', {
    key: 'by_contest',
    type: 'key',
    attributes: ['contestMonth', 'fireCount'],
    orders: ['DESC', 'DESC'],
  })
  await ensureIndex('clip_posts', {
    key: 'by_user',
    type: 'key',
    attributes: ['userId'],
    orders: ['ASC'],
  })
}

async function setupTrailRules() {
  await ensureCollection('trail_rules', 'trail_rules')
  await ensureAttribute('trail_rules', 'enum', { key: 'lineId', elements: ['p1', 'p2'], required: true })
  await ensureAttribute('trail_rules', 'string', { key: 'name', size: 32, required: true })
  await ensureAttribute('trail_rules', 'boolean', { key: 'enabled', required: true })
  await ensureAttribute('trail_rules', 'float', { key: 'startLat', required: true })
  await ensureAttribute('trail_rules', 'float', { key: 'startLon', required: true })
  await ensureAttribute('trail_rules', 'float', { key: 'finishLat', required: true })
  await ensureAttribute('trail_rules', 'float', { key: 'finishLon', required: true })
  await ensureAttribute('trail_rules', 'float', { key: 'startRadiusM', required: true, min: 5, max: 200 })
  await ensureAttribute('trail_rules', 'float', { key: 'finishRadiusM', required: true, min: 5, max: 200 })
  await ensureAttribute('trail_rules', 'float', { key: 'minStartSpeedMs', required: true, min: 0, max: 20 })
  await ensureAttribute('trail_rules', 'float', { key: 'directionToleranceDeg', required: true, min: 10, max: 180 })
  await ensureAttribute('trail_rules', 'string', { key: 'testSamples', size: 12000, required: false, default: '[]' })
  await ensureAttribute('trail_rules', 'string', { key: 'updatedBy', size: 36, required: true })

  await ensureIndex('trail_rules', {
    key: 'by_line',
    type: 'unique',
    attributes: ['lineId'],
    orders: ['ASC'],
  })
}

async function main() {
  console.log('Setting up Appwrite backend collections...')
  console.log(`Project: ${PROJECT_ID}`)
  console.log(`Database: ${DB_ID}`)

  await ensureProfileTier()
  await ensureBikeConfigDetails()
  await setupSessions()
  await setupRuns()
  await setupClipPosts()
  await setupTrailRules()

  console.log('Backend collections are ready.')
}

main().catch((error) => {
  console.error('Backend setup failed.')
  console.error(error.message)
  process.exit(1)
})
