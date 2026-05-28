# Phase 1 Deployment Handoff

All code changes for items **1.1 – 1.4** are complete and passing `npx tsc --noEmit` + all
modified test suites. Follow these steps to go live against your Appwrite project.

---

## Prerequisites

- Appwrite Console access + an API key with `databases.*`, `functions.*`, `teams.read` scopes
- Node 20+ locally
- Appwrite CLI (`npm i -g appwrite-cli` or `npx appwrite`)

---

## Step 1 — Add env vars to `.env.local`

```
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
EXPO_PUBLIC_DB_ID=trails-db
EXPO_PUBLIC_APP_ACTIONS_FN_ID=app-actions
```

The last variable tells `lib/appwrite.ts` which Function to call via `callAction()`.

---

## Step 2 — Run backend setup (collections + permissions)

> **Test project first.** Point at a throwaway project, confirm nothing breaks, then run
> against production.

```bash
# Set creds for the script (or put them in .env.local)
export APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
export APPWRITE_PROJECT_ID=<your-project-id>
export APPWRITE_KEY=<api-key>

npm run backend:setup
```

What this does:
- Sets `profiles` to `documentSecurity: true`, permissions `['read("any")']` — removes the
  collection-level `update("users")` that allowed privilege escalation.
- Adds `xpAwarded` (bool, default `false`) attribute to `runs` collection.
- Creates the new `fires` collection with `documentSecurity: true`, unique index
  `by_user_post`, and key index `by_post`.

---

## Step 3 — Migrate existing profile documents (one-time)

Existing profile docs were created with per-document `write(user:self)` grants. The collection
permission change alone doesn't strip those; this script does.

```bash
npm run migrate:profiles
```

Idempotent — safe to run more than once. Output shows each locked document ID.

---

## Step 4 — Deploy the `app-actions` Appwrite Function

### 4a. Create the function in the Console

1. Go to **Functions → Create Function**
2. Runtime: **Node.js 21.0** (or latest LTS Node available)
3. Name: `app-actions`, ID: `app-actions` (must match `EXPO_PUBLIC_APP_ACTIONS_FN_ID`)
4. Execution: **Any** (clients call it via SDK)
5. Timeout: **15 s**

### 4b. Set environment variables on the function

| Key | Value |
|-----|-------|
| `APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | your project ID |
| `APPWRITE_API_KEY` | API key with `databases.*`, `teams.read` |
| `DB_ID` | `trails-db` |
| `PROFILES_ID` | `profiles` |
| `RUNS_ID` | `runs` |
| `SESSIONS_ID` | `sessions` |
| `CLIP_POSTS_ID` | `clip_posts` |
| `FIRES_ID` | `fires` |
| `ADMINS_TEAM_ID` | ID of the team whose members can approve users |

### 4c. Deploy via CLI

```bash
cd functions/app-actions
npm install          # installs node-appwrite
cd ../..

npx appwrite login
npx appwrite deploy function --functionId app-actions
```

Or zip-deploy manually:
```bash
cd functions/app-actions
zip -r ../app-actions.zip .
```
Upload `functions/app-actions.zip` in the Console → Functions → app-actions → Deploy.

---

## Step 5 — Create the `admins` team

If it doesn't exist yet:

1. Console → **Auth → Teams → Create Team**
2. Name it anything (e.g. `Admins`), note the auto-generated **Team ID**
3. Set `ADMINS_TEAM_ID` on the Function (Step 4b) to that ID
4. Add admin users to the team via Console or the admin CLI script

---

## Step 6 — Smoke test

### 6.1 Privilege-escalation check (must fail)

From a Node scratch script logged in as a regular (non-admin) user:

```js
import { Client, Databases } from 'appwrite'
const client = new Client().setEndpoint('...').setProject('...')
// set session cookie / JWT for a normal user
const db = new Databases(client)
await db.updateDocument('trails-db', 'profiles', '<myUserId>', { isAdmin: true })
// → must throw 401/403
```

### 6.2 Fire feature (no cross-user write error)

Log in as user A. Fire a clip post owned by user B. Verify:
- `fireCount` increments in the UI
- Re-firing toggles it off (count decrements)
- Two rapid fires don't double-count

### 6.3 XP flow

Complete a sensor run → save → check that `xp`/`level` on the profile update after
`claimPendingXp` is called (currently triggered after run save in sensor.tsx).

### 6.4 Speed & distance

Save a sensor run with GPS active. Verify `maxSpeed > 0` and `distance > 0` on the saved run
and that it appears on the speed leaderboard.

---

## Known pre-existing test failures (not caused by Phase 1)

| Suite | Test | Root cause |
|-------|------|-----------|
| `useRunStore` | `createSession` | Mock missing `documents` stub |
| `useRunStore` | `createRun` | Mock return value ordering bug |
| `PixelAvatar` | snapshot | Snapshot outdated against current component |

These were failing before any Phase 1 changes and are safe to fix separately.

---

## Files changed in Phase 1

```
functions/app-actions/package.json          new — Function manifest
functions/app-actions/src/main.js           new — all privileged actions
lib/appwrite.ts                             added Functions client + callAction()
app/(auth)/register.tsx                     profile creation → callAction('initProfile')
stores/useProfileStore.ts                   addPendingXp → awardRunXp(runId)
stores/useFeedStore.ts                      toggleFire → callAction('toggleFire')
app/(app)/(tabs)/sensor.tsx                 real GPS speed/distance; awardRunXp after save
app/(app)/admin/index.tsx                   approveUser → callAction('approveUser')
scripts/setup-backend-collections.js        profiles lockdown + fires collection + xpAwarded
scripts/migrate-profile-permissions.js      new — one-time migration for existing profile docs
types/index.ts                              Run.xpAwarded?: boolean
package.json                                migrate:profiles script
__tests__/stores/useFeedStore.test.ts       toggleFire tests rewritten for callAction
__tests__/stores/useProfileStore.test.ts    callAction added to mock
```
