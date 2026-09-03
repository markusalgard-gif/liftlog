import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './config'

let client: SupabaseClient | null | undefined

/**
 * Returns a Supabase client when env is configured, otherwise null.
 * Missing keys must not break the app — local logging stays the default.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client

  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  if (!isSupabaseConfigured(url, anonKey)) {
    client = null
    return client
  }

  try {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (err) {
    console.error('LiftLog: could not start Supabase client', err)
    client = null
  }
  return client
}

export function isCloudEnabled(): boolean {
  return getSupabase() !== null
}
