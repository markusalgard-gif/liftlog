import { v4 as uuid } from 'uuid'
import type { Exercise, Template } from './types'

/**
 * Only used internally by `db.ts`'s one-time `populate` seed. This value is
 * regenerated on every module evaluation (every page load), so app code must
 * NEVER import this to identify "the main gym" after seeding — the real,
 * persisted id lives in `appState.currentGymId` (or query `db.gyms`).
 */
export const MAIN_GYM_ID = uuid()

/**
 * Reference/starting weight or reps seeded at Main Gym so pre-fill works
 * from session one. Weighted exercises seed a `weight`; bodyweight
 * exercises seed only `reps` (weight stays null).
 */
export interface SeedExercise extends Exercise {
  seedReps?: number
  seedWeight?: number
}

let sortOrder = 0
const next = () => sortOrder++

function ex(partial: {
  name: string
  category: Exercise['category']
  formCue: string
  failureRule?: Exercise['failureRule']
  repTarget?: number
  weightIncrement?: number
  bodyweight?: boolean
  supersetPartnerId?: string
  seedReps?: number
  seedWeight?: number
}): SeedExercise {
  return {
    id: uuid(),
    name: partial.name,
    category: partial.category,
    formCue: partial.formCue,
    failureRule: partial.failureRule ?? 'never',
    setStructure: 'straight',
    supersetPartnerId: partial.supersetPartnerId,
    repTarget: partial.repTarget ?? 10,
    weightIncrement: partial.weightIncrement ?? 2.5,
    bodyweight: partial.bodyweight ?? false,
    archived: false,
    sortOrder: next(),
    seedReps: partial.seedReps,
    seedWeight: partial.seedWeight,
  }
}

// ---- LOWER (blue) ----
export const rdl = ex({
  name: 'RDL',
  category: 'lower',
  formCue: 'hips back, bar on thighs, flat back',
})
export const dbBulgarianSplitSquat = ex({
  name: 'DB Bulgarian split squat',
  category: 'lower',
  formCue: 'rear foot elevated, torso upright, weight = per-hand DB',
})
export const barbellSquat = ex({
  name: 'Barbell Squat',
  category: 'lower',
  formCue: 'brace core, knees track toes, full depth',
})
export const animalLegPress = ex({
  name: 'Animal Leg Press',
  category: 'lower',
  formCue: 'feet shoulder width, drive through heels',
  seedReps: 8,
  seedWeight: 50,
})
export const hipThrust = ex({
  name: 'Hip thrust',
  category: 'lower',
  formCue: 'chin tucked, drive hips up, squeeze glutes at top',
  seedReps: 10,
  seedWeight: 40,
})
export const legExtension = ex({
  name: 'Leg Extension',
  category: 'lower',
  formCue: 'controlled tempo, squeeze quads at top',
})
export const singleLegBroadJump = ex({
  name: 'Single leg broad jump',
  category: 'lower',
  formCue: 'stick the landing, reset between reps',
  failureRule: 'never',
  bodyweight: true,
})
export const standingCalfRaises = ex({
  name: 'Standing calf raises',
  category: 'lower',
  formCue: 'full stretch at bottom, pause at top',
  repTarget: 15,
})

// ---- PULL (pink) ----
export const cableFacePulls = ex({
  name: 'Cable face pulls',
  category: 'pull',
  formCue: 'elbows high, squeeze shoulder blades',
  repTarget: 15,
  weightIncrement: 1,
  seedReps: 15,
  seedWeight: 35,
})
export const pullUps = ex({
  name: 'Pull ups',
  category: 'pull',
  formCue: 'full hang to chin over bar',
  bodyweight: true,
})
export const inclineBicepCurls = ex({
  name: 'Incline Bicep Curls',
  category: 'pull',
  formCue: 'per-hand DB, elbows fixed, full stretch',
  weightIncrement: 1,
})
export const inclineHammerCurls = ex({
  name: 'Incline Hammer Curls',
  category: 'pull',
  formCue: 'per-hand DB, neutral grip, no swinging',
  failureRule: 'lastSetOnly',
  weightIncrement: 1,
  seedReps: 12,
  seedWeight: 7.5,
})
export const dbLatRows = ex({
  name: 'DB Lat Rows',
  category: 'pull',
  formCue: 'per-hand DB, pull elbow to hip, squeeze lat',
  weightIncrement: 1,
})
export const latPulldowns = ex({
  name: 'Lat Pulldowns',
  category: 'pull',
  formCue: 'lead with elbows, chest up',
  weightIncrement: 2.5,
  seedReps: 10,
  seedWeight: 55,
})
export const animalTBarRow = ex({
  name: 'Animal T-bar row',
  category: 'pull',
  formCue: 'flat back, row to sternum',
  weightIncrement: 2.5,
  seedReps: 10,
  seedWeight: 30,
})

// ---- PUSH (green) ----
export const tricepPushdowns = ex({
  name: 'Tricep Pushdowns',
  category: 'push',
  formCue: 'elbows pinned, full extension',
  failureRule: 'lastSetOnly',
  repTarget: 15,
  seedReps: 15,
  seedWeight: 50,
})
export const benchPress = ex({
  name: 'Bench Press',
  category: 'push',
  formCue: 'bar to chest, drive feet, elbows ~45°',
  repTarget: 8,
  seedReps: 5,
  seedWeight: 65,
})
export const inclineBench = ex({
  name: 'Incline bench',
  category: 'push',
  formCue: 'bar to upper chest, controlled descent',
})
export const dbInclineBench = ex({
  name: 'DB incline bench',
  category: 'push',
  formCue: 'per-hand DB, full stretch at bottom',
  weightIncrement: 1,
  seedReps: 10,
  seedWeight: 20,
})
export const cableLatRaises = ex({
  name: 'Cable Lat raises',
  category: 'push',
  formCue: 'lead with elbow, controlled tempo',
  failureRule: 'lastSetOnly',
  repTarget: 15,
  weightIncrement: 1,
  seedReps: 15,
  seedWeight: 12.5,
})
export const pushUps = ex({
  name: 'Push ups',
  category: 'push',
  formCue: 'straight line hips to shoulders, full lockout',
  bodyweight: true,
})
export const dbOverheadPress = ex({
  name: 'DB Overhead Press',
  category: 'push',
  formCue: 'per-hand DB, brace core, full lockout overhead',
  repTarget: 12,
  seedReps: 12,
  seedWeight: 15,
})

// ---- CORE / NECK (yellow) ----
export const legRaise = ex({
  name: 'Leg Raise',
  category: 'core',
  formCue: 'lower back flat, controlled tempo, no swinging',
  bodyweight: true,
})
export const palloffPress = ex({
  name: 'Palloff Press',
  category: 'core',
  formCue: 'resist rotation, press straight out and back',
  failureRule: 'lastSetOnly',
  repTarget: 15,
  seedReps: 15,
  seedWeight: 30,
})
export const sideCrunch = ex({
  name: 'Side crunch',
  category: 'core',
  formCue: 'controlled tempo, squeeze obliques',
  bodyweight: true,
})
export const explosiveSitup = ex({
  name: 'Explosive situp',
  category: 'core',
  formCue: 'explode up, controlled descent',
  bodyweight: true,
})
export const abRollout = ex({
  name: 'Ab rollout',
  category: 'core',
  formCue: 'brace core, flat back, roll out to full stretch',
  repTarget: 8,
  bodyweight: true,
})
export const fourSideNeckRaise = ex({
  name: '4 side neck raise',
  category: 'neck',
  formCue: 'slow and controlled through all 4 directions',
  failureRule: 'lastSetOnly',
  repTarget: 15,
  weightIncrement: 1,
  seedReps: 15,
  seedWeight: 2.5,
})

export const SEED_EXERCISES: SeedExercise[] = [
  rdl,
  dbBulgarianSplitSquat,
  barbellSquat,
  animalLegPress,
  hipThrust,
  legExtension,
  singleLegBroadJump,
  standingCalfRaises,
  cableFacePulls,
  pullUps,
  inclineBicepCurls,
  inclineHammerCurls,
  dbLatRows,
  latPulldowns,
  animalTBarRow,
  tricepPushdowns,
  benchPress,
  inclineBench,
  dbInclineBench,
  cableLatRaises,
  pushUps,
  dbOverheadPress,
  legRaise,
  palloffPress,
  sideCrunch,
  explosiveSitup,
  abRollout,
  fourSideNeckRaise,
]

export const SEED_TEMPLATES: Template[] = [
  {
    id: 'A',
    name: 'A — Squat + Push',
    exerciseIds: [
      barbellSquat.id,
      legExtension.id,
      benchPress.id,
      dbOverheadPress.id,
      tricepPushdowns.id,
      palloffPress.id,
    ],
  },
  {
    id: 'B',
    name: 'B — Hinge + Pull',
    exerciseIds: [
      rdl.id,
      hipThrust.id,
      latPulldowns.id,
      animalTBarRow.id,
      cableFacePulls.id,
      legRaise.id,
      abRollout.id,
    ],
  },
  {
    id: 'C',
    name: 'C — Single-leg + Push',
    exerciseIds: [
      dbBulgarianSplitSquat.id,
      singleLegBroadJump.id,
      dbInclineBench.id,
      pushUps.id,
      cableLatRaises.id,
      explosiveSitup.id,
      fourSideNeckRaise.id,
    ],
  },
  {
    id: 'D',
    name: 'D — Mixed + Arms',
    exerciseIds: [
      animalLegPress.id,
      standingCalfRaises.id,
      pullUps.id,
      dbLatRows.id,
      inclineBicepCurls.id,
      inclineHammerCurls.id,
      sideCrunch.id,
    ],
  },
]
