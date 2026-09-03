import type { Exercise, SetLog } from '../db/types'

export interface ProgressionResult {
  /** True if the last session's sets earned a weight bump. */
  triggered: boolean
  /** Weight to suggest next time, only meaningful when triggered. */
  nextWeight: number | null
}

/**
 * Double progression: if every set of the last session at this gym hit
 * at least repTarget reps at the same weight, the next session should
 * suggest weight + increment. Otherwise no change — last session's
 * weight/reps carry forward as-is (handled by `computePrefill`).
 *
 * Bodyweight exercises never get a weight bump (spec: "pre-fill last reps;
 * no weight suggestion") — only reps carry forward, so this always
 * reports not-triggered for them.
 *
 * `lastPerf` must already be scoped to one exercise at one gym (i.e. the
 * output of `getLastPerformance`) — progression is per-gym by design.
 */
export function evaluateProgression(
  exercise: Exercise,
  lastPerf: SetLog[],
): ProgressionResult {
  if (exercise.bodyweight || lastPerf.length === 0) {
    return { triggered: false, nextWeight: null }
  }

  const allHitTarget = lastPerf.every((s) => s.reps >= exercise.repTarget)
  const weights = new Set(lastPerf.map((s) => s.weight))
  const singleWeight = weights.size === 1
  const [weight] = weights

  if (allHitTarget && singleWeight && weight != null) {
    return { triggered: true, nextWeight: weight + exercise.weightIncrement }
  }
  return { triggered: false, nextWeight: null }
}
