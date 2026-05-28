#!/usr/bin/env node
// Einmalig ausführen: APPWRITE_KEY=xxx node scripts/setup-appwrite.js
// Danach API Key in Appwrite Console widerrufen!

const ENDPOINT   = 'https://fra.cloud.appwrite.io/v1'
const PROJECT_ID = '6a032a7a002bf847e2cb'
const API_KEY    = process.env.APPWRITE_KEY

if (!API_KEY) {
  console.error('Fehler: APPWRITE_KEY env var fehlt')
  console.error('Aufruf: APPWRITE_KEY=dein_key node scripts/setup-appwrite.js')
  process.exit(1)
}

const headers = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json',
}

async function req(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 409) {
      console.log(`  ⚠️  Existiert bereits, überspringe: ${path}`)
      return data
    }
    throw new Error(`${method} ${path} → ${res.status}: ${data?.message ?? 'Unbekannt'}`)
  }
  return data
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

async function setup() {
  console.log('🏔️  MOE MOEA Trails — Appwrite Setup\n')

  // ── 1. Datenbank ───────────────────────────────────────────
  console.log('1. Datenbank anlegen...')
  await req('POST', '/databases', { databaseId: 'trails-db', name: 'trails-db' })
  console.log('   ✓ trails-db\n')

  // ── 2. Collection: profiles ────────────────────────────────
  console.log('2. Collection: profiles')
  await req('POST', '/databases/trails-db/collections', {
    collectionId: 'profiles',
    name: 'profiles',
    documentSecurity: true,
  })

  const profileAttrs = [
    ['string',  { key: 'userId',   size: 255, required: true }],
    ['string',  { key: 'username', size: 64,  required: true }],
    ['string',  { key: 'team',     size: 128, required: true }],
    ['integer', { key: 'xp',       required: false, default: 0,     min: 0, max: 999999 }],
    ['integer', { key: 'level',    required: false, default: 1,     min: 1, max: 999 }],
    ['boolean', { key: 'approved', required: false, default: false }],
    ['boolean', { key: 'isAdmin',  required: false, default: false }],
  ]

  for (const [type, attr] of profileAttrs) {
    await req('POST', `/databases/trails-db/collections/profiles/attributes/${type}`, attr)
    console.log(`   ✓ ${attr.key} (${type})`)
    await delay(600)
  }

  // Index braucht einen Moment bis Attribute bereit sind
  console.log('   Warte auf Attribute...')
  await delay(2000)

  await req('POST', '/databases/trails-db/collections/profiles/indexes', {
    key: 'userId_index',
    type: 'key',
    attributes: ['userId'],
    orders: ['ASC'],
  })
  console.log('   ✓ Index: userId_index\n')

  // ── 3. Collection: bike_configs ────────────────────────────
  console.log('3. Collection: bike_configs')
  await req('POST', '/databases/trails-db/collections', {
    collectionId: 'bike_configs',
    name: 'bike_configs',
    documentSecurity: true,
  })

  const bikeAttrs = [
    ['string', { key: 'userId',     size: 255, required: true }],
    ['enum',   { key: 'bikeType',   elements: ['hardtail', 'fully'], required: false, default: 'hardtail' }],
    ['enum',   { key: 'suspension', elements: ['air', 'coil'],       required: false, default: 'air' }],
    ['enum',   { key: 'material',   elements: ['alu', 'carbon'],     required: false, default: 'alu' }],
    ['string', { key: 'bikeColor',  size: 16,  required: false, default: '#1a1a1a' }],
    ['string', { key: 'jerseyJ',    size: 16,  required: false, default: '#e8e4dc' }],
    ['string', { key: 'jerseyD',    size: 16,  required: false, default: '#9a9890' }],
  ]

  for (const [type, attr] of bikeAttrs) {
    await req('POST', `/databases/trails-db/collections/bike_configs/attributes/${type}`, attr)
    console.log(`   ✓ ${attr.key} (${type})`)
    await delay(600)
  }
  console.log()

  // ── 4. Team: admins ────────────────────────────────────────
  console.log('4. Team: admins')
  await req('POST', '/teams', { teamId: 'admins', name: 'admins' })
  console.log('   ✓ Team admins\n')

  console.log('✅ Setup abgeschlossen!\n')
  console.log('Nächste Schritte:')
  console.log('  1. ⚠️  API Key in Appwrite Console widerrufen (API Keys → setup-key → Revoke)')
  console.log('  2. Appwrite Console → Auth → Teams → admins → Members → deinen Account hinzufügen')
  console.log('  3. Sag Bescheid → dann startet Task 2 (Expo Init)')
}

setup().catch(err => {
  console.error('\n❌ Fehler:', err.message)
  process.exit(1)
})
