import { db } from '../db/db'
import { clearBackupMarkers } from './backup'
import { deleteCloudSnapshot, unlinkUser } from './sync/snapshotSync'

/** Removes logged workouts only. Seed last-performance rows, library,
 *  gyms, and templates stay so pre-fill still works on session one. */
export async function resetWorkoutHistory(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.sessions,
      db.setLogs,
      db.bodyweightEntries,
      db.footballSessions,
      db.appState,
    ],
    async () => {
      await db.sessions.clear()
      await db.setLogs.where('sessionId').notEqual('seed').delete()
      await db.bodyweightEntries.clear()
      await db.footballSessions.clear()
      const state = await db.appState.get('singleton')
      if (state) {
        delete state.activeSessionId
        await db.appState.put(state)
      }
    },
  )
  clearBackupMarkers()
  unlinkUser()
  try {
    await deleteCloudSnapshot()
  } catch (err) {
    console.error('LiftLog: could not delete cloud snapshot during reset', err)
  }
}
