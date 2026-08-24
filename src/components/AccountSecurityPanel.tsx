import {
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useState } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import {
  getAccountSecurityEvents,
  getAccountSecurityStatus,
  revokeOtherAccountSessions,
  type AccountSecurityEvent,
  type AccountSecurityStatus,
} from '../lib/queries/accountSecurity'
import { supabase } from '../lib/supabase/client'

type PendingEnrollment = {
  factorId: string
  qrCode: string
  secret: string
}

function safeError(error: unknown) {
  if (error instanceof Error && error.message.includes('MFA')) {
    return 'Authenticator verification is unavailable. Check the Supabase MFA configuration.'
  }
  return 'The account security request could not be completed. Please try again.'
}

function formatDate(value: string | null) {
  if (!value) return 'Not yet'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AccountSecurityPanel() {
  const { session, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<AccountSecurityStatus | null>(null)
  const [events, setEvents] = useState<AccountSecurityEvent[]>([])
  const [pending, setPending] = useState<PendingEnrollment | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) {
      setStatus(null)
      setEvents([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const nextStatus = await getAccountSecurityStatus()
      setStatus(nextStatus)
      setEvents(await getAccountSecurityEvents())
    } catch (loadError) {
      setError(safeError(loadError))
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}#account-security` },
    })
    setLoading(false)

    if (signInError) {
      setError('The secure sign-in link could not be sent. Please check the address and try again.')
      return
    }

    setMessage('Secure sign-in link sent. Check your email to continue.')
  }

  const beginEnrollment = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { data: existing } = await supabase.auth.mfa.listFactors()
      for (const factor of existing?.all ?? []) {
        if (factor.factor_type === 'totp' && factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'TradePulse Authenticator',
      })

      if (enrollError) throw enrollError
      setPending({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      })
    } catch (enrollError) {
      setError(safeError(enrollError))
    } finally {
      setLoading(false)
    }
  }

  const cancelEnrollment = async () => {
    if (!pending) return
    setLoading(true)
    await supabase.auth.mfa.unenroll({ factorId: pending.factorId })
    setPending(null)
    setVerificationCode('')
    setLoading(false)
  }

  const verifyEnrollment = async (event: FormEvent) => {
    event.preventDefault()
    if (!pending || !/^\d{6}$/.test(verificationCode)) {
      setError('Enter the six-digit code from your authenticator app.')
      return
    }

    setLoading(true)
    setError(null)
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pending.factorId,
      code: verificationCode,
    })

    if (verifyError) {
      setLoading(false)
      setError('That code was not accepted. Use the latest code and try again.')
      return
    }

    setPending(null)
    setVerificationCode('')
    setMessage('Authenticator verification is now enabled. Other sessions were signed out automatically.')
    await refresh()
    setLoading(false)
  }

  const removeFactor = async (factorId: string) => {
    if (!window.confirm('Remove authenticator verification from this account?')) return
    setLoading(true)
    setError(null)
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId })

    if (removeError) {
      setLoading(false)
      setError('Authenticator verification could not be removed from this verified session.')
      return
    }

    setMessage('Authenticator verification was removed.')
    await refresh()
    setLoading(false)
  }

  const revokeOthers = async () => {
    if (!window.confirm('Sign out every other TradePulse AI session and keep this one active?')) return
    setLoading(true)
    setError(null)
    try {
      const result = await revokeOtherAccountSessions()
      setMessage(result.warning ?? 'Every other signed-in session was revoked.')
      await refresh()
    } catch (revokeError) {
      setError(safeError(revokeError))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <section className="panel account-security-panel" role="status">
        <LoaderCircle className="spinning" size={22} /> Checking account security…
      </section>
    )
  }

  if (!session) {
    return (
      <section className="panel account-security-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Account protection · Phase 4K</p>
            <h2>Security Center</h2>
          </div>
          <span className="status-badge"><LockKeyhole size={14} /> Private</span>
        </div>
        <p className="panel-description">
          Sign in with a passwordless email link to manage authenticator verification,
          protect enrolled sessions, and review your private security history.
        </p>
        <form className="account-security-signin" onSubmit={sendMagicLink}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? <LoaderCircle className="spinning" size={16} /> : <LogIn size={16} />}
            Send secure link
          </button>
        </form>
        {error ? <div className="error-message" role="alert">{error}</div> : null}
        {message ? <div className="success-message" role="status">{message}</div> : null}
      </section>
    )
  }

  const posture = status?.posture
  const protectedSession = posture?.securityState === 'verified'

  return (
    <section className="panel account-security-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Account protection · Phase 4K</p>
          <h2>Security Center</h2>
        </div>
        <span className={`status-badge ${protectedSession ? 'active' : 'sandbox'}`}>
          {protectedSession ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {protectedSession ? 'AAL2 verified' : 'Standard session'}
        </span>
      </div>

      <div className="account-security-identity">
        <div>
          <small>Signed in account</small>
          <strong>{session.user.email ?? 'Verified customer'}</strong>
        </div>
        <button type="button" className="secondary-button" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? 'spinning' : ''} size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="error-message" role="alert">{error}</div> : null}
      {message ? <div className="success-message" role="status">{message}</div> : null}

      <div className="account-security-grid">
        <article>
          <Fingerprint size={22} />
          <div>
            <span>Authenticator verification</span>
            <strong>{posture?.verifiedFactorCount ? 'Enabled' : 'Not enabled'}</strong>
            <small>
              {posture?.verifiedFactorCount
                ? 'Enrolled sessions must complete step-up verification.'
                : 'Optional until you enroll; passwordless sign-in remains available.'}
            </small>
          </div>
        </article>
        <article>
          <KeyRound size={22} />
          <div>
            <span>Current assurance</span>
            <strong>{posture?.currentAssuranceLevel?.toUpperCase() ?? 'Checking'}</strong>
            <small>Last successful step-up: {formatDate(posture?.lastStepUpAt ?? null)}</small>
          </div>
        </article>
        <article>
          <Smartphone size={22} />
          <div>
            <span>Session control</span>
            <strong>Current device active</strong>
            <small>Revoke other sessions without interrupting this one.</small>
          </div>
        </article>
      </div>

      {pending ? (
        <form className="mfa-enrollment" onSubmit={verifyEnrollment}>
          <div>
            <p className="eyebrow">Authenticator enrollment</p>
            <h3>Scan and verify</h3>
            <p>Scan this QR code with a TOTP authenticator, then enter its current code.</p>
            <img src={pending.qrCode} alt="TradePulse AI authenticator enrollment QR code" />
          </div>
          <div className="mfa-enrollment-controls">
            <label>
              Manual setup key
              <code>{pending.secret}</code>
            </label>
            <label>
              Six-digit code
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </label>
            <div className="account-security-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                <ShieldCheck size={16} /> Verify and enable
              </button>
              <button type="button" className="secondary-button" onClick={() => void cancelEnrollment()} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="account-security-actions">
          {status?.factors.length ? status.factors.map((factor) => (
            <button
              type="button"
              className="secondary-button danger-outline"
              key={factor.id}
              onClick={() => void removeFactor(factor.id)}
              disabled={loading}
            >
              <Fingerprint size={16} /> Remove {factor.friendlyName}
            </button>
          )) : (
            <button type="button" className="primary-button" onClick={() => void beginEnrollment()} disabled={loading}>
              <Fingerprint size={16} /> Enable authenticator verification
            </button>
          )}
          <button type="button" className="secondary-button" onClick={() => void revokeOthers()} disabled={loading}>
            <LogOut size={16} /> Sign out other sessions
          </button>
          <button type="button" className="secondary-button" onClick={() => void supabase.auth.signOut({ scope: 'local' })} disabled={loading}>
            <LogOut size={16} /> Sign out this device
          </button>
        </div>
      )}

      <div className="account-security-history">
        <div>
          <p className="eyebrow">Private security history</p>
          <h3>Recent verified changes</h3>
        </div>
        {events.length ? (
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <ShieldCheck size={16} />
                <div>
                  <strong>{event.summary}</strong>
                  <small>{formatDate(event.occurredAt)}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="account-security-empty">Security history appears after the first synchronized account check.</p>
        )}
      </div>

      <p className="account-security-privacy">
        TradePulse stores only sanitized posture and event evidence. Authenticator secrets,
        one-time codes, access tokens, IP addresses and device fingerprints are never copied
        into application tables or logs.
      </p>
    </section>
  )
}
