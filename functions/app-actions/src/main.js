import { Client, Databases, Teams, Query, ID, Permission, Role } from 'node-appwrite'

// ── Config (function variables; sensible defaults match the app) ───────────────
const DB_ID          = process.env.APPWRITE_DB_ID          ?? 'trails-db'
const PROFILES_ID    = process.env.APPWRITE_PROFILES_ID    ?? 'profiles'
const RUNS_ID        = process.env.APPWRITE_RUNS_ID        ?? 'runs'
const CLIP_POSTS_ID  = process.env.APPWRITE_CLIP_POSTS_ID  ?? 'clip_posts'
const FIRES_ID       = process.env.APPWRITE_FIRES_ID       ?? 'fires'
const ADMINS_TEAM_ID = process.env.APPWRITE_ADMINS_TEAM_ID ?? 'admins'

// Authoritative shop catalog — must match constants/shopItems.ts
const ITEM_PRICES = {
  fox_gabel_orange:    150,
  fox_gabel_schwarz:   120,
  fox_air:             100,
  fox_coil:            130,
  rockshox_pike_red:   140,
  rockshox_pike_silver: 130,
  rockshox_pike_black: 120,
  rockshox_zeb_red:    160,
}

// ── XP math — authoritative copy of lib/xp.ts (keep in sync) ───────────────────
function getLevelFromXp(xp) {
  return Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2)
}

function sensorXp(airtime, gforce) {
  const airtimeTp = Math.floor(Math.pow(Math.max(0, airtime), 1.5) * 3)
  const gforceTp = Math.floor(Math.pow(Math.max(0, gforce - 2.0), 2) * 4)
  return airtimeTp + gforceTp
}

function calculateRunXp(run, pbs, isFirstRunOfDay) {
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

// ── Helpers ────────────────────────────────────────────────────────────────────
async function isAdmin(teams, userId) {
  try {
    const memberships = await teams.listMemberships(ADMINS_TEAM_ID, [
      Query.equal('userId', userId),
      Query.limit(1),
    ])
    return memberships.memberships.some((m) => m.confirm)
  } catch {
    return false
  }
}

async function computePbFlags(databases, run) {
  const res = await databases.listDocuments(DB_ID, RUNS_ID, [
    Query.equal('userId', run.userId),
    Query.limit(200),
  ])
  const others = res.documents.filter((r) => r.$id !== run.$id)

  const minOf = (vals) => (vals.length ? Math.min(...vals) : null)
  const maxOf = (vals) => (vals.length ? Math.max(...vals) : null)

  const bestTotal = minOf(others.map((r) => r.totalTime).filter((v) => v != null))
  const bestP1    = minOf(others.map((r) => r.p1Time).filter((v) => v != null))
  const bestP2    = minOf(others.map((r) => r.p2Time).filter((v) => v != null))
  const bestAir   = maxOf(others.map((r) => r.maxAirtime).filter((v) => v != null))
  const bestSpeed = maxOf(others.map((r) => r.maxSpeed).filter((v) => v != null))

  return {
    totalTime:  run.totalTime != null && (bestTotal === null || run.totalTime < bestTotal),
    p1Time:     run.p1Time   != null && (bestP1 === null || run.p1Time < bestP1),
    p2Time:     run.p2Time   != null && (bestP2 === null || run.p2Time < bestP2),
    maxAirtime: run.maxAirtime > 0   && (bestAir === null || run.maxAirtime > bestAir),
    maxSpeed:   run.maxSpeed   > 0   && (bestSpeed === null || run.maxSpeed > bestSpeed),
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────
async function initProfile(databases, userId, payload) {
  try {
    const existing = await databases.getDocument(DB_ID, PROFILES_ID, userId)
    return { profile: existing, created: false }
  } catch {
    // not found → create below
  }

  const username = String(payload.username ?? '').slice(0, 64)
  const team = String(payload.team ?? 'Solo').slice(0, 64)
  if (!username) throw new Error('username required')

  const profile = await databases.createDocument(
    DB_ID,
    PROFILES_ID,
    userId,
    {
      userId,
      username,
      team,
      xp: 0,
      pendingXp: 0,
      level: 1,
      coins: 0,
      pendingCoins: 0,
      ownedParts: [],
      approved: false,
      isAdmin: false,
      tier: 'rookie',
    },
    // Readable by everyone (leaderboards); writable only via this function's API key.
    [Permission.read(Role.any())],
  )
  return { profile, created: true }
}

async function approveUser(databases, teams, callerId, payload) {
  if (!(await isAdmin(teams, callerId))) throw new Error('not authorized')
  const targetId = String(payload.userId ?? '')
  if (!targetId) throw new Error('userId required')
  const profile = await databases.updateDocument(DB_ID, PROFILES_ID, targetId, { approved: true })
  return { profile }
}

async function addPendingXp(databases, callerId, payload) {
  const runId = String(payload.runId ?? '')
  if (!runId) throw new Error('runId required')

  const run = await databases.getDocument(DB_ID, RUNS_ID, runId)
  if (run.userId !== callerId) throw new Error('not your run')
  if (run.xpAwarded) return { total: 0, base: 0, sensor: 0, pb: 0, daily: 0, alreadyAwarded: true }

  const sessionRuns = await databases.listDocuments(DB_ID, RUNS_ID, [
    Query.equal('sessionId', run.sessionId),
    Query.limit(2),
  ])
  const isFirstRunOfDay = sessionRuns.total <= 1

  const pbFlags = await computePbFlags(databases, run)
  const breakdown = calculateRunXp(run, pbFlags, isFirstRunOfDay)

  await databases.updateDocument(DB_ID, RUNS_ID, runId, { xpAwarded: true })

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, callerId)
  const newPending = (profile.pendingXp ?? 0) + breakdown.total
  // Coins are awarded 1:1 with XP
  const newPendingCoins = (profile.pendingCoins ?? 0) + breakdown.total
  await databases.updateDocument(DB_ID, PROFILES_ID, callerId, {
    pendingXp: newPending,
    pendingCoins: newPendingCoins,
  })

  return { ...breakdown, pendingXp: newPending, pendingCoins: newPendingCoins }
}

async function claimXp(databases, callerId) {
  const profile = await databases.getDocument(DB_ID, PROFILES_ID, callerId)
  const claimed = profile.pendingXp ?? 0
  const coinsClaimed = profile.pendingCoins ?? 0

  if (claimed <= 0 && coinsClaimed <= 0) {
    return { claimed: 0, levelUps: 0, xp: profile.xp, level: profile.level, coins: profile.coins ?? 0 }
  }

  const oldLevel = profile.level
  const newXp = profile.xp + claimed
  const newLevel = getLevelFromXp(newXp)
  const newCoins = (profile.coins ?? 0) + coinsClaimed

  await databases.updateDocument(DB_ID, PROFILES_ID, callerId, {
    xp: newXp,
    level: newLevel,
    pendingXp: 0,
    coins: newCoins,
    pendingCoins: 0,
  })
  return { claimed, levelUps: newLevel - oldLevel, xp: newXp, level: newLevel, coins: newCoins }
}

async function purchaseItem(databases, callerId, payload) {
  const itemId = String(payload.itemId ?? '')
  const price = ITEM_PRICES[itemId]
  if (price === undefined) throw new Error('Unbekannter Artikel')

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, callerId)
  const coins = profile.coins ?? 0
  if (coins < price) throw new Error('Nicht genug Münzen')

  const ownedParts = profile.ownedParts ?? []
  if (ownedParts.includes(itemId)) throw new Error('Artikel bereits gekauft')

  const newCoins = coins - price
  const newOwned = [...ownedParts, itemId]

  await databases.updateDocument(DB_ID, PROFILES_ID, callerId, {
    coins: newCoins,
    ownedParts: newOwned,
  })

  return { coins: newCoins, ownedParts: newOwned }
}

async function createClipPost(databases, callerId, payload) {
  const videoUrl = String(payload.videoUrl ?? '')
  if (!videoUrl) throw new Error('videoUrl required')

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, callerId)
  const contestMonth = new Date().toISOString().slice(0, 7)

  const post = await databases.createDocument(
    DB_ID, CLIP_POSTS_ID, ID.unique(),
    {
      userId: callerId,
      username: profile.username,
      tier: profile.tier ?? 'rookie',
      runId: payload.runId ?? null,
      contestMonth,
      verified: false,
      fireCount: 0,
      firedBy: [],
      videoUrl,
    },
    [Permission.read(Role.any()), Permission.write(Role.user(callerId))],
  )
  return { post }
}

async function deleteClipPost(databases, callerId, payload) {
  const postId = String(payload.postId ?? '')
  if (!postId) throw new Error('postId required')

  const post = await databases.getDocument(DB_ID, CLIP_POSTS_ID, postId)
  if (post.userId !== callerId) throw new Error('not authorized')

  await databases.deleteDocument(DB_ID, CLIP_POSTS_ID, postId)
  return { deleted: postId }
}

async function reactToClip(databases, callerId, payload) {
  const postId = String(payload.postId ?? '')
  const emoji  = String(payload.emoji  ?? '')
  if (!postId || !emoji) throw new Error('postId and emoji required')

  const post = await databases.getDocument(DB_ID, CLIP_POSTS_ID, postId)
  let reactions = {}
  try { reactions = JSON.parse(post.reactions || '{}') } catch {}

  const users = reactions[emoji] ?? []
  if (users.includes(callerId)) {
    const next = users.filter(id => id !== callerId)
    if (next.length) reactions[emoji] = next
    else delete reactions[emoji]
  } else {
    reactions[emoji] = [...users, callerId]
  }

  await databases.updateDocument(DB_ID, CLIP_POSTS_ID, postId, {
    reactions: JSON.stringify(reactions),
  })
  return { reactions }
}

async function toggleFire(databases, callerId, payload) {
  const postId = String(payload.postId ?? '')
  if (!postId) throw new Error('postId required')

  const mine = await databases.listDocuments(DB_ID, FIRES_ID, [
    Query.equal('userId', callerId),
    Query.equal('postId', postId),
    Query.limit(1),
  ])

  if (mine.documents[0]) {
    await databases.deleteDocument(DB_ID, FIRES_ID, mine.documents[0].$id)
  } else {
    await databases.createDocument(DB_ID, FIRES_ID, ID.unique(), { userId: callerId, postId }, [])
  }

  // Rebuild the denormalized count + firedBy from the source of truth (self-healing).
  const all = await databases.listDocuments(DB_ID, FIRES_ID, [
    Query.equal('postId', postId),
    Query.limit(100),
  ])
  const firedBy = all.documents.map((d) => d.userId)
  await databases.updateDocument(DB_ID, CLIP_POSTS_ID, postId, {
    fireCount: all.total,
    firedBy,
  })

  return { postId, fireCount: all.total, fired: firedBy.includes(callerId), firedBy }
}

// ── Entry point ────────────────────────────────────────────────────────────────
export default async ({ req, res, error }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID
  // Eigener Key mit vollen Scopes hat Vorrang vor dem eingeschränkten Appwrite-internen Key
  const apiKey = process.env.APPWRITE_API_KEY || req.headers['x-appwrite-key']
  const callerId = req.headers['x-appwrite-user-id']

  if (!callerId) return res.json({ ok: false, error: 'unauthenticated' }, 401)
  if (!apiKey) return res.json({ ok: false, error: 'server misconfigured: no API key' }, 500)

  let payload = {}
  try {
    payload = req.bodyJson ?? (req.body ? JSON.parse(req.body) : {})
  } catch {
    return res.json({ ok: false, error: 'invalid JSON body' }, 400)
  }

  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey)
  const databases = new Databases(client)
  const teams = new Teams(client)

  try {
    switch (payload.action) {
      case 'initProfile':
        return res.json({ ok: true, ...(await initProfile(databases, callerId, payload)) })
      case 'approveUser':
        return res.json({ ok: true, ...(await approveUser(databases, teams, callerId, payload)) })
      case 'addPendingXp':
        return res.json({ ok: true, ...(await addPendingXp(databases, callerId, payload)) })
      case 'claimXp':
        return res.json({ ok: true, ...(await claimXp(databases, callerId)) })
      case 'deleteClipPost':
        return res.json({ ok: true, ...(await deleteClipPost(databases, callerId, payload)) })
      case 'reactToClip':
        return res.json({ ok: true, ...(await reactToClip(databases, callerId, payload)) })
      case 'toggleFire':
        return res.json({ ok: true, ...(await toggleFire(databases, callerId, payload)) })
      case 'createClipPost':
        return res.json({ ok: true, ...(await createClipPost(databases, callerId, payload)) })
      case 'purchaseItem':
        return res.json({ ok: true, ...(await purchaseItem(databases, callerId, payload)) })
      default:
        return res.json({ ok: false, error: `unknown action: ${payload.action}` }, 400)
    }
  } catch (err) {
    error(`action ${payload.action} failed: ${err.message}`)
    return res.json({ ok: false, error: err.message }, 400)
  }
}
