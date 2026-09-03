export type OpenSyncPlan = 'none' | 'upload' | 'restore' | 'merge'

/** Decide what auto-sync should do when the app opens (never mid-session). */
export function planOpenSync(opts: {
  cloudExportedAt: number | null
  lastLocalUploadAt: number | null
  localSessionCount: number
}): OpenSyncPlan {
  const { cloudExportedAt, lastLocalUploadAt, localSessionCount } = opts

  if (cloudExportedAt == null) {
    return localSessionCount > 0 ? 'upload' : 'none'
  }
  if (lastLocalUploadAt == null || cloudExportedAt > lastLocalUploadAt) {
    return localSessionCount > 0 ? 'merge' : 'restore'
  }
  return 'none'
}
