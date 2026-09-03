import type { Exercise, SetLog } from '../db/types'
import { evaluateProgression } from './progression'

export interface SlotPrefill {
  weight: number | null
  reps: number
}

/**
 * What each set slot suggests before it's logged.
 *
 * - History exists and double progression triggered (all sets hit
 *   repTarget at the same weight) → weight + increment, reps = repTarget.
 * - History exists, no progression → that set's last weight/reps (falling
 *   back to the last available set if fewer were done last time).
 * - No history → per-gym weight override (if any) × repTarget.
 * - Bodyweight → weight always null; only reps ever carry forward/progress.
 */
export function computePrefill(
  exercise: Exercise,
  lastPerf: SetLog[],
  weightOverride: number | undefined,
  setNumber: number,
): SlotPrefill {
  const progression = evaluateProgression(exercise, lastPerf)
  if (progression.triggered) {
    return { weight: progression.nextWeight, reps: exercise.repTarget }
  }

  const fromHistory =
    lastPerf.find((s) => s.setNumber === setNumber) ?? lastPerf[lastPerf.length - 1]

  if (fromHistory) {
    return {
      weight: exercise.bodyweight ? null : fromHistory.weight,
      reps: fromHistory.reps,
    }
  }

  return {
    weight: exercise.bodyweight ? null : (weightOverride ?? null),
    reps: exercise.repTarget,
  }
}
