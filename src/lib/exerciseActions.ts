import { v4 as uuid } from 'uuid'
import { db } from '../db/db'
import type { Exercise } from '../db/types'

export interface NewExerciseInput {
  name: string
  category: Exercise['category']
  formCue: string
  failureRule: Exercise['failureRule']
  repTarget: number
  weightIncrement: number
  bodyweight: boolean
  supersetPartnerId?: string
}

/** Smart defaults so "+ New exercise" is fillable in well under 15 seconds. */
export function defaultNewExercise(category: Exercise['category']): NewExerciseInput {
  return {
    name: '',
    category,
    formCue: '',
    failureRule: 'never',
    repTarget: 10,
    weightIncrement: category === 'lower' ? 2.5 : 1,
    bodyweight: false,
  }
}

/** New exercises join the global library and are enabled at `enableAtGymId` only. */
export async function createExercise(
  input: NewExerciseInput,
  enableAtGymId: string,
): Promise<string> {
  const maxSortOrder = await db.exercises.orderBy('sortOrder').last()
  const id = uuid()

  await db.exercises.add({
    id,
    name: input.name,
    category: input.category,
    formCue: input.formCue,
    failureRule: input.failureRule,
    setStructure: input.supersetPartnerId ? 'superset' : 'straight',
    supersetPartnerId: input.supersetPartnerId,
    repTarget: input.repTarget,
    weightIncrement: input.weightIncrement,
    bodyweight: input.bodyweight,
    archived: false,
    sortOrder: (maxSortOrder?.sortOrder ?? 0) + 1,
  })

  await db.gymExercises.add({
    id: uuid(),
    gymId: enableAtGymId,
    exerciseId: id,
    enabled: true,
  })

  return id
}

export async function updateExercise(
  exerciseId: string,
  changes: Partial<Omit<Exercise, 'id'>>,
): Promise<void> {
  await db.exercises.update(exerciseId, changes)
}

export async function setArchived(exerciseId: string, archived: boolean): Promise<void> {
  await db.exercises.update(exerciseId, { archived })
}

/** Move within its category by swapping sortOrder with the adjacent exercise. */
export async function moveExerciseInCategory(
  exerciseId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) return
  const siblings = (await db.exercises.where('category').equals(exercise.category).toArray())
    .filter((e) => !e.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const index = siblings.findIndex((e) => e.id === exerciseId)
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) return

  const other = siblings[swapIndex]
  await db.exercises.update(exercise.id, { sortOrder: other.sortOrder })
  await db.exercises.update(other.id, { sortOrder: exercise.sortOrder })
}

export async function setGymExerciseEnabled(
  gymId: string,
  exerciseId: string,
  enabled: boolean,
): Promise<void> {
  const existing = await db.gymExercises
    .where('[gymId+exerciseId]')
    .equals([gymId, exerciseId])
    .first()
  if (existing) {
    await db.gymExercises.update(existing.id, { enabled })
  } else {
    await db.gymExercises.add({ id: uuid(), gymId, exerciseId, enabled })
  }
}

export async function setGymExerciseOverride(
  gymId: string,
  exerciseId: string,
  weightOverride: number | undefined,
): Promise<void> {
  const existing = await db.gymExercises
    .where('[gymId+exerciseId]')
    .equals([gymId, exerciseId])
    .first()
  if (existing) {
    await db.gymExercises.update(existing.id, { weightOverride })
  } else {
    await db.gymExercises.add({
      id: uuid(),
      gymId,
      exerciseId,
      enabled: true,
      weightOverride,
    })
  }
}
