import { LogIn, LogOut, UserRound } from 'lucide-react'

import { useAuth } from '../lib/auth/AuthProvider'
import { supabase } from '../lib/supabase/client'

export function AccountMenu() {
  const { session, loading } = useAuth()

  if (loading) return <span className="account-menu loading" role="status">Account…</span>
  if (!session) {
    return (
      <a className="account-menu" href="#account-security">
        <LogIn size={15} /> <span>Sign in</span>
      </a>
    )
  }

  return (
    <details className="account-menu signed-in">
      <summary aria-label="Open account menu">
        <UserRound size={15} />
        <span>{session.user.email?.split('@')[0] ?? 'Account'}</span>
      </summary>
      <div className="account-menu-popover">
        <small>Signed in securely</small>
        <strong>{session.user.email ?? 'Verified account'}</strong>
        <a href="#agentic-ai">My AI workspace</a>
        <a href="#account-security">Security settings</a>
        <button type="button" onClick={() => void supabase.auth.signOut({ scope: 'local' })}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </details>
  )
}
