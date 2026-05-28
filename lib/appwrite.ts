import 'react-native-url-polyfill/auto'
import { Client, Account, Databases, Teams, Functions, ID, Permission, Role, Query } from 'appwrite'

const endpoint  = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT  ?? 'http://localhost/v1'
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? 'demo'

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)

export const account   = new Account(client)
export const databases = new Databases(client)
export const teams     = new Teams(client)
export const functions = new Functions(client)

export const APP_ACTIONS_FN_ID = process.env.EXPO_PUBLIC_APP_ACTIONS_FN_ID ?? 'app-actions'

// Invokes the privileged server-side function (profile init, approval, XP, fires).
// Sensitive fields (approved/isAdmin/xp/level/fireCount) are only writable here.
export async function callAction<T = any>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const exec = await functions.createExecution(
    APP_ACTIONS_FN_ID,
    JSON.stringify({ action, ...params }),
    false,
  )
  let body: any
  try {
    body = JSON.parse(exec.responseBody || '{}')
  } catch {
    throw new Error('Ungültige Antwort vom Server')
  }
  if (!body.ok) throw new Error(body.error ?? 'Server-Aktion fehlgeschlagen')
  return body as T
}

export const DB_ID           = process.env.EXPO_PUBLIC_DB_ID           ?? ''
export const PROFILES_ID     = process.env.EXPO_PUBLIC_PROFILES_ID     ?? ''
export const BIKE_CONFIGS_ID = process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID ?? ''
export const SESSIONS_ID     = process.env.EXPO_PUBLIC_SESSIONS_ID     ?? ''
export const RUNS_ID         = process.env.EXPO_PUBLIC_RUNS_ID         ?? ''
export const CLIP_POSTS_ID   = process.env.EXPO_PUBLIC_CLIP_POSTS_ID   ?? ''
export const TRAIL_RULES_ID    = process.env.EXPO_PUBLIC_TRAIL_RULES_ID    ?? 'trail_rules'
export const TRAIL_FEATURES_ID = process.env.EXPO_PUBLIC_TRAIL_FEATURES_ID ?? 'trail_features'

export const IS_DEMO = !process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT

export { ID, Permission, Role, Query }
