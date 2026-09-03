import { v4 as uuid } from 'uuid'
import { db } from '../db/db'
import { todayISO } from './format'

/** Start a session (template or freestyle) and make it the active one. */
export async function startSession(templateId?: string): Promise<void> {
  const appState = await db.appState.get('singleton')
  if (!appState) throw new Error('appState missing — db not seeded?')

  const template = templateId ? await db.templates.get(templateId) : undefined

  const sessionId = uuid()
  await db.sessions.add({
    id: sessionId,
    date: todayISO(),
    gymId: appState.currentGymId,
    templateId,
    exerciseIds: template ? [...template.exerciseIds] : [],
    startedAt: Date.now(),
  })
  await db.appState.update('singleton', { activeSessionId: sessionId })
}

/** Write one set. Called on slot tap — must be instant and unconditional. */
export async function logSet(params: {
  sessionId: string
  exerciseId: string
  gymId: string
  setNumber: number
  weight: number | null
  reps: number
}): Promise<void> {
  await db.setLogs.add({
    id: uuid(),
    ...params,
    loggedAt: Date.now(),
  })
}

export async function updateSet(
  logId: string,
  changes: { weight?: number | null; reps?: number },
): Promise<void> {
  await db.setLogs.update(logId, changes)
}

export async function deleteSet(logId: string): Promise<void> {
  await db.setLogs.delete(logId)
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
): Promise<void> {
  const session = await db.sessions.get(sessionId)
  if (!session || session.exerciseIds.includes(exerciseId)) return
  await db.sessions.update(sessionId, {
    exerciseIds: [...session.exerciseIds, exerciseId],
  })
}

/** Removes from today's session only — logged sets and the library are untouched. */
export async function removeExerciseFromSession(
  sessionId: string,
  exerciseId: string,
): Promise<void> {
  const session = await db.sessions.get(sessionId)
  if (!session) return
  await db.sessions.update(sessionId, {
    exerciseIds: session.exerciseIds.filter((id) => id !== exerciseId),
  })
}

export async function reorderSessionExercises(
  sessionId: string,
  exerciseIds: string[],
): Promise<void> {
  await db.sessions.update(sessionId, { exerciseIds })
}

export async function updateSessionNote(sessionId: string, note: string): Promise<void> {
  await db.sessions.update(sessionId, { note })
}

export async function finishSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { finishedAt: Date.now() })
  await db.appState.update('singleton', { activeSessionId: undefined })
}

export async function setCurrentGym(gymId: string): Promise<void> {
  await db.appState.update('singleton', { currentGymId: gymId })
}
