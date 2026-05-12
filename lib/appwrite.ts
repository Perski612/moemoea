import 'react-native-url-polyfill/auto'
import { Client, Account, Databases, Teams, ID, Permission, Role, Query } from 'appwrite'

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)

export const account   = new Account(client)
export const databases = new Databases(client)
export const teams     = new Teams(client)

export const DB_ID           = process.env.EXPO_PUBLIC_DB_ID!
export const PROFILES_ID     = process.env.EXPO_PUBLIC_PROFILES_ID!
export const BIKE_CONFIGS_ID = process.env.EXPO_PUBLIC_BIKE_CONFIGS_ID!

export { ID, Permission, Role, Query }
