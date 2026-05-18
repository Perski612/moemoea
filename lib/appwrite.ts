import 'react-native-url-polyfill/auto'
import { Client, Account, Databases, Teams, ID, Permission, Role, Query } from 'appwrite'

const endpoint  = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT  ?? 'http://localhost/v1'
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? 'demo'

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)

export const account   = new Account(client)
export const databases = new Databases(client)
export const teams     = new Teams(client)

export const DB_ID           = process.env.EXPO_PUBLIC_DB_ID           ?? ''
export const PROFILES_ID     = process.env.EXPO_PUBLIC_PROFILES_ID     ?? ''
export const BIKE_CONFIGS_ID = process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID ?? ''
export const SESSIONS_ID     = process.env.EXPO_PUBLIC_SESSIONS_ID     ?? ''
export const RUNS_ID         = process.env.EXPO_PUBLIC_RUNS_ID         ?? ''
export const CLIP_POSTS_ID   = process.env.EXPO_PUBLIC_CLIP_POSTS_ID   ?? ''

export const IS_DEMO = !process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT

export { ID, Permission, Role, Query }
