import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '../supabase/client'
import { authRedirectUrl } from './redirectUrl'

interface AuthContextValue {
  ready: boolean
  cloudEnabled: boolean
  session: Session | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const supabase = getSupabase()

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }

    let cancelled = false
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) {
          setSession(data.session)
          setReady(true)
        }
      })
      .catch((err) => {
        console.error('LiftLog: getSession failed', err)
        if (!cancelled) setReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      cloudEnabled: supabase !== null,
      session,
      async signInWithGoogle() {
        if (!supabase) throw new Error('Cloud is not configured on this device.')
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: authRedirectUrl(window.location.origin, import.meta.env.BASE_URL),
          },
        })
        if (error) throw error
      },
      async signOut() {
        if (!supabase) return
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [ready, session, supabase],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
