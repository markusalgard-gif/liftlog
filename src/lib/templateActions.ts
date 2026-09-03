import { db } from '../db/db'

export async function renameTemplate(templateId: string, name: string): Promise<void> {
  await db.templates.update(templateId, { name })
}

export async function setTemplateExercises(
  templateId: string,
  exerciseIds: string[],
): Promise<void> {
  await db.templates.update(templateId, { exerciseIds })
}

export async function addExerciseToTemplate(
  templateId: string,
  exerciseId: string,
): Promise<void> {
  const template = await db.templates.get(templateId)
  if (!template || template.exerciseIds.includes(exerciseId)) return
  await db.templates.update(templateId, {
    exerciseIds: [...template.exerciseIds, exerciseId],
  })
}

export async function removeExerciseFromTemplate(
  templateId: string,
  exerciseId: string,
): Promise<void> {
  const template = await db.templates.get(templateId)
  if (!template) return
  await db.templates.update(templateId, {
    exerciseIds: template.exerciseIds.filter((id) => id !== exerciseId),
  })
}
