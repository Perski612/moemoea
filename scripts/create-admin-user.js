#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

function loadMcpEnv() {
  const mcpPath = path.join(process.cwd(), '.mcp.json')
  if (!fs.existsSync(mcpPath)) return {}

  const config = JSON.parse(fs.readFileSync(mcpPath, 'utf8'))
  return config.mcpServers?.appwrite?.env ?? {}
}

const mcpEnv = loadMcpEnv()

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? mcpEnv.APPWRITE_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1'
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? mcpEnv.APPWRITE_PROJECT_ID ?? '6a032a7a002bf847e2cb'
const DB_ID = process.env.APPWRITE_DB_ID ?? process.env.EXPO_PUBLIC_DB_ID ?? mcpEnv.APPWRITE_DATABASE_ID ?? 'trails-db'
const PROFILES_ID = process.env.APPWRITE_PROFILES_ID ?? process.env.EXPO_PUBLIC_PROFILES_ID ?? 'profiles'
const ADMINS_TEAM_ID = process.env.APPWRITE_ADMINS_TEAM_ID ?? 'admins'

const API_KEY = process.env.APPWRITE_KEY ?? process.env.APPWRITE_API_KEY ?? mcpEnv.APPWRITE_API_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'Hendrik'
const ADMIN_TEAM = process.env.ADMIN_TEAM ?? 'MOE MOEA Crew'

if (!API_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required env vars.')
  console.error('Usage:')
  console.error('  ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create')
  console.error('  APPWRITE_KEY is optional when .mcp.json contains APPWRITE_API_KEY.')
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
    const error = new Error(data?.message ?? `${method} ${path} failed`)
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

async function findUserByEmail(email) {
  const data = await req('GET', `/users?search=${encodeURIComponent(email)}`)
  return data.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
}

function profilePermissions(userId) {
  return [
    `read("user:${userId}")`,
    `update("user:${userId}")`,
    `delete("user:${userId}")`,
    `read("team:${ADMINS_TEAM_ID}")`,
    `update("team:${ADMINS_TEAM_ID}")`,
  ]
}

async function createOrGetUser() {
  const existing = await findUserByEmail(ADMIN_EMAIL)
  if (existing) {
    await req('PATCH', `/users/${existing.$id}/password`, { password: ADMIN_PASSWORD })
    return existing
  }

  return req('POST', '/users', {
    userId: 'unique()',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: ADMIN_USERNAME,
  })
}

async function upsertAdminProfile(user) {
  const payload = {
    userId: user.$id,
    username: ADMIN_USERNAME,
    team: ADMIN_TEAM,
    xp: 0,
    level: 1,
    approved: true,
    isAdmin: true,
    tier: 'rookie',
  }

  const writeProfile = async (data) => {
    try {
      await req('POST', `/databases/${DB_ID}/collections/${PROFILES_ID}/documents`, {
        documentId: user.$id,
        data,
        permissions: profilePermissions(user.$id),
      })
    } catch (error) {
      if (error.status !== 409) throw error
      await req('PATCH', `/databases/${DB_ID}/collections/${PROFILES_ID}/documents/${user.$id}`, {
        data,
        permissions: profilePermissions(user.$id),
      })
    }
  }

  try {
    await writeProfile(payload)
  } catch (error) {
    if (!String(error.message).includes('tier')) throw error
    const { tier, ...payloadWithoutTier } = payload
    await writeProfile(payloadWithoutTier)
  }
}

async function addToAdminsTeam(user) {
  try {
    await req('POST', `/teams/${ADMINS_TEAM_ID}/memberships`, {
      userId: user.$id,
      roles: ['admin'],
    })
  } catch (error) {
    if (error.status === 409) return
    throw error
  }
}

async function main() {
  const user = await createOrGetUser()
  await upsertAdminProfile(user)
  await addToAdminsTeam(user)

  console.log('Admin user is ready.')
  console.log(`User ID: ${user.$id}`)
  console.log(`Email: ${user.email}`)
}

main().catch((error) => {
  console.error('Failed to create admin user.')
  console.error(error.message)
  process.exit(1)
})
