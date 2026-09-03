import { planOpenSync } from '../src/lib/sync/autoSyncPlan.ts'

const cases = [
  [{ cloudExportedAt: null, lastLocalUploadAt: null, localSessionCount: 0 }, 'none'],
  [{ cloudExportedAt: null, lastLocalUploadAt: null, localSessionCount: 2 }, 'upload'],
  [{ cloudExportedAt: 100, lastLocalUploadAt: null, localSessionCount: 0 }, 'restore'],
  [{ cloudExportedAt: 100, lastLocalUploadAt: null, localSessionCount: 1 }, 'merge'],
  [{ cloudExportedAt: 200, lastLocalUploadAt: 100, localSessionCount: 0 }, 'restore'],
  [{ cloudExportedAt: 200, lastLocalUploadAt: 100, localSessionCount: 3 }, 'merge'],
  [{ cloudExportedAt: 100, lastLocalUploadAt: 200, localSessionCount: 3 }, 'none'],
  [{ cloudExportedAt: 100, lastLocalUploadAt: 100, localSessionCount: 3 }, 'none'],
]

let failed = 0
for (const [opts, expected] of cases) {
  const actual = planOpenSync(opts)
  if (actual !== expected) {
    failed += 1
    console.error(`FAIL ${JSON.stringify(opts)} => ${actual}, expected ${expected}`)
  }
}
if (failed) process.exitCode = 1
else console.log(`ok ${cases.length} cases`)
