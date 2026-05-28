#!/usr/bin/env node
// ─── app-actions Function deployen ────────────────────────────────────────────
// Legt die Function in Appwrite an (falls nicht vorhanden),
// packt den Code als tar.gz und lädt ihn als aktives Deployment hoch.

const fs    = require('node:fs')
const path  = require('node:path')
const zlib  = require('node:zlib')

// ── Konfiguration ─────────────────────────────────────────────────────────────

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
  const p = path.join(process.cwd(), '.mcp.json')
  if (!fs.existsSync(p)) return {}
  return JSON.parse(fs.readFileSync(p, 'utf8')).mcpServers?.appwrite?.env ?? {}
}

const localEnv = readDotEnv(path.join(process.cwd(), '.env.local'))
const mcpEnv   = loadMcpEnv()

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   ?? localEnv.EXPO_PUBLIC_APPWRITE_ENDPOINT   ?? mcpEnv.APPWRITE_ENDPOINT
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? localEnv.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? mcpEnv.APPWRITE_PROJECT_ID
const API_KEY    = process.env.APPWRITE_KEY ?? process.env.APPWRITE_API_KEY ?? localEnv.APPWRITE_KEY ?? localEnv.APPWRITE_API_KEY ?? mcpEnv.APPWRITE_API_KEY
const DB_ID      = process.env.APPWRITE_DB_ID ?? localEnv.EXPO_PUBLIC_DB_ID ?? 'trails-db'

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Fehlende Konfiguration — benötigt: Endpoint, Project-ID und API-Key.')
  process.exit(1)
}

const FUNCTION_ID  = 'app-actions'
const FUNCTION_DIR = path.join(process.cwd(), 'functions', 'app-actions')
const RUNTIME      = 'node-22'
const ENTRYPOINT   = 'src/main.js'
const BUILD_CMD    = 'npm install'
const TIMEOUT      = 15

const jsonHeaders = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key':     API_KEY,
  'Content-Type':       'application/json',
}

// ── HTTP-Helfer ───────────────────────────────────────────────────────────────

async function req(method, route, body) {
  const res  = await fetch(`${ENDPOINT}${route}`, {
    method,
    headers: jsonHeaders,
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
  try { await req('GET', route); return true }
  catch (e) { if (e.status === 404) return false; throw e }
}

// ── tar.gz erstellen (pure Node.js, kein externes tar nötig) ─────────────────

function tarHeader(name, size, isDir = false) {
  const buf  = Buffer.alloc(512)
  const mode = isDir ? '0755' : '0644'
  const type = isDir ? '5'    : '0'
  const mtime = Math.floor(Date.now() / 1000)

  buf.write(name.slice(0, 99),              0,   'utf8')
  buf.write(mode.padStart(7, '0') + '\0',   100, 'utf8')
  buf.write('0000000\0',                    108, 'utf8')  // uid
  buf.write('0000000\0',                    116, 'utf8')  // gid
  buf.write(size.toString(8).padStart(11, '0') + ' ', 124, 'utf8')
  buf.write(mtime.toString(8).padStart(11, '0') + ' ', 136, 'utf8')
  buf.write(type,                           156, 'utf8')
  buf.write('ustar\0',                      257, 'utf8')
  buf.write('00',                           263, 'utf8')

  // checksum: alle Bytes summieren (checksum-Feld = 8 Leerzeichen)
  let sum = 8 * 32
  for (let i = 0; i < 512; i++) {
    if (i < 148 || i >= 156) sum += buf[i]
  }
  buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'utf8')
  return buf
}

function collectFiles(dir, base = dir) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel  = path.relative(base, full).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      result.push({ rel: rel + '/', full, isDir: true })
      result.push(...collectFiles(full, base))
    } else {
      result.push({ rel, full, isDir: false })
    }
  }
  return result
}

function buildTar() {
  const tarPath = path.join(FUNCTION_DIR, '..', 'deploy.tar.gz')
  const files   = collectFiles(FUNCTION_DIR)
  const chunks  = []

  for (const { rel, full, isDir } of files) {
    if (isDir) {
      chunks.push(tarHeader(rel, 0, true))
    } else {
      const content = fs.readFileSync(full)
      chunks.push(tarHeader(rel, content.length))
      chunks.push(content)
      const pad = (512 - (content.length % 512)) % 512
      if (pad) chunks.push(Buffer.alloc(pad))
    }
  }

  chunks.push(Buffer.alloc(1024)) // end-of-archive

  const tar  = Buffer.concat(chunks)
  const gz   = zlib.gzipSync(tar)
  fs.writeFileSync(tarPath, gz)

  const sizeMb = (gz.length / 1024).toFixed(1)
  console.log(`  ${files.filter(f => !f.isDir).length} Dateien, ${sizeMb} KB`)
  return tarPath
}

// ── Function anlegen ──────────────────────────────────────────────────────────

async function ensureFunction() {
  if (await exists404(`/functions/${FUNCTION_ID}`)) {
    console.log(`✓ Function existiert: ${FUNCTION_ID}`)
    return
  }

  await req('POST', '/functions', {
    functionId: FUNCTION_ID,
    name:       'app-actions',
    runtime:    RUNTIME,
    entrypoint: ENTRYPOINT,
    commands:   BUILD_CMD,
    timeout:    TIMEOUT,
    execute:    ['users'],   // eingeloggte User dürfen die Function aufrufen
  })
  console.log(`+ Function angelegt: ${FUNCTION_ID}`)
}

// ── Deployment hochladen ──────────────────────────────────────────────────────

async function uploadDeployment(tarPath) {
  console.log('  Lade Deployment hoch …')

  const fileBytes = fs.readFileSync(tarPath)
  const formData  = new FormData()
  formData.append('entrypoint', ENTRYPOINT)
  formData.append('commands',   BUILD_CMD)
  formData.append('activate',   'true')
  formData.append(
    'code',
    new Blob([fileBytes], { type: 'application/gzip' }),
    'code.tar.gz',
  )

  const res = await fetch(`${ENDPOINT}/functions/${FUNCTION_ID}/deployments`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key':     API_KEY,
      // Content-Type wird von fetch automatisch auf multipart/form-data gesetzt
    },
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err    = new Error(data?.message ?? `Deployment-Upload fehlgeschlagen (HTTP ${res.status})`)
    err.appwrite = data
    throw err
  }

  console.log(`+ Deployment hochgeladen: ${data.$id}`)
  return data.$id
}

// ── Function-Variablen setzen ─────────────────────────────────────────────────
// APPWRITE_FUNCTION_API_ENDPOINT und APPWRITE_FUNCTION_PROJECT_ID werden
// von der Appwrite-Runtime automatisch injiziert — nicht nötig sie zu setzen.
// Hier nur die App-spezifischen Werte.

async function setVariables() {
  const vars = {
    APPWRITE_API_KEY:        API_KEY,   // eigener Key mit vollen Scopes (documents.write etc.)
    APPWRITE_DB_ID:          DB_ID,
    APPWRITE_PROFILES_ID:    'profiles',
    APPWRITE_RUNS_ID:        'runs',
    APPWRITE_CLIP_POSTS_ID:  'clip_posts',
    APPWRITE_FIRES_ID:       'fires',
    APPWRITE_ADMINS_TEAM_ID: 'admins',
  }

  // Bestehende Variablen laden und als Map key → $id speichern
  const res = await req('GET', `/functions/${FUNCTION_ID}/variables?limit=100`)
  const existingById = Object.fromEntries(
    (res.variables ?? []).filter((v) => v.$id).map((v) => [v.key, v.$id])
  )

  for (const [key, value] of Object.entries(vars)) {
    const varId = existingById[key]
    if (varId) {
      await req('PUT', `/functions/${FUNCTION_ID}/variables/${varId}`, { key, value, secret: false })
      console.log(`  ✓ ${key}`)
    } else {
      // Appwrite 1.9+ erwartet eine variableId im Body
      const newId = key.toLowerCase().replace(/_/g, '-').slice(0, 36)
      await req('POST', `/functions/${FUNCTION_ID}/variables`, { variableId: newId, key, value, secret: false })
      console.log(`  + ${key}`)
    }
  }
}

// ── Deployment-Status abwarten ────────────────────────────────────────────────

async function waitForBuild(deploymentId) {
  console.log('  Warte auf Build …')
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  for (let i = 0; i < 40; i++) {
    const fn   = await req('GET', `/functions/${FUNCTION_ID}`)
    const dep  = await req('GET', `/functions/${FUNCTION_ID}/deployments/${deploymentId}`)
    const status = dep.status

    process.stdout.write(`  Status: ${status}\r`)

    if (status === 'ready') {
      console.log(`\n  ✓ Build abgeschlossen`)
      return
    }
    if (status === 'failed') {
      console.error('\n  Build-Log:')
      console.error(dep.buildLogs ?? '(kein Log)')
      throw new Error('Build fehlgeschlagen')
    }
    await sleep(3000)
  }
  throw new Error('Build-Timeout — überprüfe das Appwrite-Dashboard')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('MOE MOEA Trails — app-actions Function deployen')
  console.log(`Endpoint: ${ENDPOINT}`)
  console.log(`Project:  ${PROJECT_ID}`)
  console.log(`Runtime:  ${RUNTIME}`)
  console.log('─'.repeat(48))

  console.log('\n→ Function')
  await ensureFunction()

  console.log('\n→ Archiv')
  const tarPath = buildTar()

  console.log('\n→ Deployment')
  const deploymentId = await uploadDeployment(tarPath)

  console.log('\n→ Variablen')
  await setVariables()

  console.log('\n→ Build-Status')
  await waitForBuild(deploymentId)

  // Aufräumen
  fs.rmSync(tarPath, { force: true })

  console.log('\n' + '─'.repeat(48))
  console.log('✓ Function erfolgreich deployed!')
  console.log()
  console.log('Teste im Appwrite-Dashboard:')
  console.log(`  ${ENDPOINT.replace('/v1', '')}/console/project-${PROJECT_ID}/functions`)
}

main().catch((err) => {
  console.error('\nDeploy fehlgeschlagen:', err.message)
  if (err.appwrite) console.error('Appwrite:', JSON.stringify(err.appwrite, null, 2))
  process.exit(1)
})
