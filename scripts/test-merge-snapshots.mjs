import { mergeSnapshots, rowTimestamp } from '../src/lib/sync/mergeSnapshots.ts'

function emptyData() {
  return {
    gyms: [],
    exercises: [],
    gymExercises: [],
    sessions: [],
    setLogs: [],
    templates: [],
    bodyweightEntries: [],
    footballSessions: [],
    appState: [],
  }
}

const local = {
  version: 1,
  exportedAt: 100,
  data: {
    ...emptyData(),
    sessions: [{ id: 's-local', startedAt: 50 }],
    setLogs: [
      { id: 'set-1', loggedAt: 200, reps: 8 },
      { id: 'set-only-local', loggedAt: 10, reps: 1 },
    ],
    appState: [{ id: 'singleton', currentGymId: 'local-gym' }],
  },
}

const cloud = {
  version: 1,
  exportedAt: 90,
  data: {
    ...emptyData(),
    sessions: [{ id: 's-cloud', startedAt: 40 }],
    setLogs: [
      { id: 'set-1', loggedAt: 100, reps: 5 },
      { id: 'set-only-cloud', loggedAt: 10, reps: 2 },
    ],
    appState: [{ id: 'singleton', currentGymId: 'cloud-gym' }],
  },
}

const merged = mergeSnapshots(local, cloud)
const sets = Object.fromEntries(merged.data.setLogs.map((r) => [r.id, r.reps]))
const sessionIds = merged.data.sessions.map((s) => s.id).sort()

const cases = [
  [sets['set-1'] === 8, 'newer local set wins'],
  [sets['set-only-local'] === 1, 'local-only row kept'],
  [sets['set-only-cloud'] === 2, 'cloud-only row kept'],
  [sessionIds.join(',') === 's-cloud,s-local', 'sessions unioned'],
  [merged.data.appState[0].currentGymId === 'local-gym', 'appState stays local'],
  [rowTimestamp({ loggedAt: 9 }, 'setLogs') === 9, 'setLogs timestamp'],
]

let failed = 0
for (const [ok, label] of cases) {
  if (!ok) {
    failed += 1
    console.error(`FAIL ${label}`)
  }
}
if (failed) process.exitCode = 1
else console.log(`ok ${cases.length} cases`)
