import { authRedirectUrl } from '../src/lib/auth/redirectUrl.ts'

const cases = [
  ['http://localhost:5173', '/liftlog/', 'http://localhost:5173/liftlog/'],
  ['http://localhost:5173/', '/liftlog/', 'http://localhost:5173/liftlog/'],
  ['http://localhost:5173', '/liftlog', 'http://localhost:5173/liftlog/'],
  [
    'https://markusalgard-gif.github.io',
    '/liftlog/',
    'https://markusalgard-gif.github.io/liftlog/',
  ],
]

let failed = 0
for (const [origin, base, expected] of cases) {
  const actual = authRedirectUrl(origin, base)
  if (actual !== expected) {
    failed += 1
    console.error(`FAIL authRedirectUrl(${origin}, ${base}) => ${actual}, expected ${expected}`)
  }
}

if (failed > 0) process.exitCode = 1
else console.log(`ok ${cases.length} cases`)
