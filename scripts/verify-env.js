// scripts/verify-env.js — fail fast if Vite envs are missing
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
const missing = required.filter(k => !process.env[k] || !String(process.env[k]).trim())
if (missing.length) {
  console.error('❌ Missing required environment variables:', missing.join(', '))
  process.exit(1)
} else {
  console.log('✅ Env OK')
}
