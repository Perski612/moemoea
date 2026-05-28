#!/usr/bin/env node

// One-time migration: strip per-document write grants from existing `profiles` docs.
// Before the security fix, registration created profile docs with write(user:self),
// which (combined with documentSecurity) let users edit their own approved/isAdmin/xp.
// This resets every profile doc to read-only-by-anyone so writes only flow through
// the app-actions function (API key). Safe to run repeatedly (idempotent).

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
const PROFILES_ID = process.env.APPWRITE_PROFILES_ID ?? localEnv.EXPO_PUBLIC_PROFILES_ID ?? 'profiles'

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Missing Appwrite config. Need endpoint, project ID, and API key.')
  process.exit(1)
}

const headers = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json',
}

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
    throw error
  }
  return data
}

async function main() {
  let offset = 0
  let migrated = 0
  const lockedPermissions = ['read("any")']

  for (;;) {
    const queries = [JSON.stringify({ method: 'limit', values: [100] }), JSON.stringify({ method: 'offset', values: [offset] })]
    const search = `queries[]=${encodeURIComponent(queries[0])}&queries[]=${encodeURIComponent(queries[1])}`
    const page = await req('GET', `/databases/${DB_ID}/collections/${PROFILES_ID}/documents?${search}`)
    const docs = page.documents ?? []
    if (docs.length === 0) break

    for (const doc of docs) {
      await req('PATCH', `/databases/${DB_ID}/collections/${PROFILES_ID}/documents/${doc.$id}`, {
        permissions: lockedPermissions,
      })
      migrated += 1
      console.log(`  locked: ${doc.$id} (${doc.username ?? '—'})`)
    }

    offset += docs.length
    if (docs.length < 100) break
  }

  console.log(`Done. ${migrated} profile document(s) locked to read-only.`)
}

main().catch((error) => {
  console.error('Migration failed.')
  console.error(error.message)
  process.exit(1)
})
