import { isSupabaseConfigured } from '../src/lib/supabase/config.ts'

const cases = [
  [undefined, undefined, false],
  ['', '', false],
  ['  ', '  ', false],
  ['https://example.supabase.co', undefined, false],
  [undefined, 'anon', false],
  ['https://example.supabase.co', '', false],
  ['https://example.supabase.co', '  ', false],
  ['https://example.supabase.co', 'anon-key', true],
  [' https://example.supabase.co ', ' anon-key ', true],
]

let failed = 0
for (const [url, key, expected] of cases) {
  const actual = isSupabaseConfigured(url, key)
  if (actual !== expected) {
    failed += 1
    console.error(`FAIL isSupabaseConfigured(${JSON.stringify(url)}, ${JSON.stringify(key)}) => ${actual}, expected ${expected}`)
  }
}

if (failed > 0) {
  process.exitCode = 1
} else {
  console.log(`ok ${cases.length} cases`)
}
