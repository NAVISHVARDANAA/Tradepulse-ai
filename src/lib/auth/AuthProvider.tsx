import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../supabase/client'
import {
  bootstrapAuthSession,
  scrollToAuthReturnTarget,
} from './browserCallback'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let active = true

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (nextSession) setError(null)
      setLoading(false)
    })

    void bootstrapAuthSession()
      .then((result) => {
        if (!active) return
        setSession(result.session)
        setError(result.error)
        setLoading(false)
        scrollToAuthReturnTarget()
      })
      .catch(() => {
        if (!active) return
        setSession(null)
        setError('Your secure session could not be restored. Please sign in again.')
        setLoading(false)
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ session, loading, error, clearError }),
    [clearError, error, loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return value
}
