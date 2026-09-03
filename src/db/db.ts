import { v4 as uuid } from 'uuid'
import Dexie, { type EntityTable } from 'dexie'
import type {
  AppState,
  BodyweightEntry,
  Exercise,
  FootballSession,
  Gym,
  GymExercise,
  Session,
  SetLog,
  Template,
} from './types'
import { MAIN_GYM_ID, SEED_EXERCISES, SEED_TEMPLATES } from './seedData'

export class LiftLogDB extends Dexie {
  gyms!: EntityTable<Gym, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  gymExercises!: EntityTable<GymExercise, 'id'>
  sessions!: EntityTable<Session, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>
  templates!: EntityTable<Template, 'id'>
  bodyweightEntries!: EntityTable<BodyweightEntry, 'id'>
  footballSessions!: EntityTable<FootballSession, 'id'>
  appState!: EntityTable<AppState, 'id'>

  constructor() {
    super('liftlog')

    this.version(1).stores({
      gyms: 'id, name, createdAt',
      // `archived` is intentionally NOT indexed: IndexedDB can't use
      // booleans as index keys, so a boolean index silently matches
      // nothing — always filter archived exercises in JS instead.
      exercises: 'id, category, sortOrder',
      gymExercises: 'id, gymId, exerciseId, [gymId+exerciseId]',
      sessions: 'id, date, gymId, templateId, finishedAt',
      // Compound index [exerciseId+gymId+loggedAt] is the key query the whole
      // app hinges on: "last performance of exercise X at gym Y".
      setLogs: 'id, sessionId, exerciseId, gymId, [exerciseId+gymId+loggedAt]',
      templates: 'id',
      bodyweightEntries: 'id, date',
      footballSessions: 'id, date',
      appState: 'id',
    })

    // Fires exactly once, the first time this database is ever created on
    // this device — the idiomatic Dexie way to seed data. Avoids the race
    // condition of an app-level "if empty, seed" effect (which double-fires
    // under React StrictMode and causes duplicate-key ConstraintErrors).
    this.on('populate', () => this.seed())
  }

  private async seed() {
    const now = Date.now()

    await this.gyms.add({
      id: MAIN_GYM_ID,
      name: 'Main Gym',
      createdAt: now,
    })

    for (const seedExercise of SEED_EXERCISES) {
      const { seedReps, seedWeight, ...exercise } = seedExercise
      await this.exercises.add(exercise)

      await this.gymExercises.add({
        id: uuid(),
        gymId: MAIN_GYM_ID,
        exerciseId: exercise.id,
        enabled: true,
      })

      // Seed a reference "last performance" so pre-fill works from session one.
      if (seedReps != null) {
        const seedTimestamp = now - 24 * 60 * 60 * 1000 // yesterday
        for (let setNumber = 1; setNumber <= 3; setNumber++) {
          await this.setLogs.add({
            id: uuid(),
            sessionId: 'seed',
            exerciseId: exercise.id,
            gymId: MAIN_GYM_ID,
            setNumber,
            weight: seedWeight ?? null,
            reps: seedReps,
            loggedAt: seedTimestamp + setNumber,
          })
        }
      }
    }

    for (const template of SEED_TEMPLATES) {
      await this.templates.add(template)
    }

    await this.appState.add({
      id: 'singleton',
      currentGymId: MAIN_GYM_ID,
    })
  }
}

export const db = new LiftLogDB()
