import { KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import { supabase } from '../lib/supabase/client'

type GateState =
  | { status: 'checking' }
  | { status: 'ready' }
  | { status: 'challenge'; factorId: string }
  | { status: 'unavailable'; message: string }

export function MfaGate({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const [gate, setGate] = useState<GateState>({ status: 'checking' })
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const evaluate = useCallback(async () => {
    if (!session) {
      setGate({ status: 'ready' })
      return
    }

    setGate({ status: 'checking' })
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (assuranceError) {
      setGate({
        status: 'unavailable',
        message: 'We could not verify this session securely. Please sign in again.',
      })
      return
    }

    if (!(assurance.currentLevel === 'aal1' && assurance.nextLevel === 'aal2')) {
      setGate({ status: 'ready' })
      return
    }

    const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors()
    const factor = factorData?.all.find(
      (item) => item.status === 'verified' && item.factor_type === 'totp',
    )

    if (factorError || !factor) {
      setGate({
        status: 'unavailable',
        message: 'The enrolled authenticator could not be loaded. Please sign in again.',
      })
      return
    }

    setGate({ status: 'challenge', factorId: factor.id })
  }, [session])

  useEffect(() => {
    if (authLoading) return
    void evaluate()
  }, [authLoading, evaluate])

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (gate.status !== 'challenge' || !/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.')
      return
    }

    setSubmitting(true)
    setError(null)
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: gate.factorId,
      code,
    })

    if (verifyError) {
      setSubmitting(false)
      setError('That verification code was not accepted. Please try the latest code.')
      return
    }

    setCode('')
    await evaluate()
    setSubmitting(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setGate({ status: 'ready' })
  }

  if (authLoading || gate.status === 'checking') {
    return (
      <div className="mfa-gate" role="status">
        <LoaderCircle className="spinning" size={28} />
        <strong>Checking account protection</strong>
        <span>Your session is being verified before private tools load.</span>
      </div>
    )
  }

  if (gate.status === 'ready') {
    return <>{children}</>
  }

  return (
    <main className="mfa-gate">
      <div className="mfa-gate-card">
        <div className="mfa-gate-icon">
          {gate.status === 'challenge' ? <KeyRound size={26} /> : <ShieldCheck size={26} />}
        </div>
        <p className="eyebrow">Account protection · Phase 4K</p>
        <h1>Confirm it’s really you</h1>
        <p>
          {gate.status === 'challenge'
            ? 'This account uses authenticator verification. Enter the current code to continue.'
            : gate.message}
        </p>

        {gate.status === 'challenge' ? (
          <form onSubmit={verify} className="mfa-challenge-form">
            <label>
              Authenticator code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
              />
            </label>
            {error ? <div className="error-message" role="alert">{error}</div> : null}
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? <LoaderCircle className="spinning" size={16} /> : <ShieldCheck size={16} />}
              Verify session
            </button>
          </form>
        ) : null}

        <button type="button" className="secondary-button" onClick={() => void signOut()}>
          <LogOut size={16} /> Sign out this device
        </button>
      </div>
    </main>
  )
}
