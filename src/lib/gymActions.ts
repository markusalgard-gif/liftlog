import { v4 as uuid } from 'uuid'
import { db } from '../db/db'

/**
 * New gyms start as a full copy of the default library — customisation is
 * subtractive, not additive from zero, per spec. Every currently-existing,
 * non-archived exercise is enabled at the new gym immediately.
 */
export async function createGym(name: string): Promise<string> {
  const id = uuid()
  await db.gyms.add({ id, name, createdAt: Date.now() })

  const exercises = await db.exercises.toArray()
  await db.gymExercises.bulkAdd(
    exercises
      .filter((e) => !e.archived)
      .map((e) => ({
        id: uuid(),
        gymId: id,
        exerciseId: e.id,
        enabled: true,
      })),
  )

  return id
}

export async function renameGym(gymId: string, name: string): Promise<void> {
  await db.gyms.update(gymId, { name })
}
