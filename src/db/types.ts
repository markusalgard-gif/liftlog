export type ExerciseCategory = 'lower' | 'pull' | 'push' | 'core' | 'neck'
export type FailureRule = 'never' | 'lastSetOnly' | 'allSets'
export type SetStructure = 'straight' | 'superset'

export interface Gym {
  id: string
  name: string
  createdAt: number
}

/** Global exercise definitions (name, category, cues, rules). */
export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  formCue: string
  failureRule: FailureRule
  setStructure: SetStructure
  supersetPartnerId?: string
  repTarget: number
  weightIncrement: number
  bodyweight: boolean
  archived: boolean
  sortOrder: number
}

/** Which exercises are active at which gym, with per-gym overrides. */
export interface GymExercise {
  id: string
  gymId: string
  exerciseId: string
  enabled: boolean
  weightOverride?: number
}

export interface Session {
  id: string
  date: string
  gymId: string
  templateId?: string
  /** Snapshot of exercise order for THIS session (copied from template at
   *  start; freestyle starts empty). Deviations edit this, never the template. */
  exerciseIds: string[]
  note?: string
  startedAt: number
  finishedAt?: number
}

/** One row per logged set — the atomic unit. */
export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  gymId: string
  setNumber: number
  weight: number | null
  reps: number
  loggedAt: number
}

export interface Template {
  id: string
  name: string
  exerciseIds: string[]
}

export interface BodyweightEntry {
  id: string
  date: string
  kg: number
}

export type FootballSessionType = 'training' | 'match'

export interface FootballSession {
  id: string
  date: string
  type: FootballSessionType
  note?: string
}

/** Single-row table for zero-friction resume. */
export interface AppState {
  id: 'singleton'
  currentGymId: string
  activeSessionId?: string
}
