/**
 * Run before deploying to verify all required env vars are set.
 * Usage: npx tsx scripts/check-env.ts
 */

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
  'NEXT_PUBLIC_APP_URL',
]

const WARN_IF_MISSING = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
]

let failed = false

console.log('Checking environment variables…\n')

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`  ✗ MISSING: ${key}`)
    failed = true
  } else {
    console.log(`  ✓ ${key}`)
  }
}

for (const key of WARN_IF_MISSING) {
  if (!process.env[key]) {
    console.warn(`  ⚠ not set (Stripe deferred): ${key}`)
  } else {
    console.log(`  ✓ ${key}`)
  }
}

// Extra guard: service role key must NOT start with NEXT_PUBLIC_
// (this checks env var naming, not the value itself)
if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n  ✗ SECURITY: SUPABASE_SERVICE_ROLE_KEY is accidentally exposed as NEXT_PUBLIC_')
  failed = true
}

if (failed) {
  console.error('\nFailed. Set the missing variables before deploying.\n')
  process.exit(1)
} else {
  console.log('\nAll required env vars present.\n')
}
