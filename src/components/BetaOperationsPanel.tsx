import {
  BellRing,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Headphones,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import {
  getAccountSecurityStatus,
  type AccountSecurityStatus,
} from '../lib/queries/accountSecurity'
import {
  getExperiencePreferences,
  type ExperiencePreferences,
} from '../lib/queries/customerExperience'
import {
  getSupportRequests,
  type SupportRequest,
} from '../lib/queries/customerSupport'
import {
  getNotificationPreferences,
  type NotificationPreferences,
} from '../lib/queries/dataTrustNotifications'

type Snapshot = {
  profile: ExperiencePreferences | null
  security: AccountSecurityStatus | null
  notifications: NotificationPreferences | null
  support: SupportRequest[] | null
  failed: string[]
}

const emptySnapshot: Snapshot = {
  profile: null,
  security: null,
  notifications: null,
  support: null,
  failed: [],
}

const journey = [
  {
    label: 'Learn the boundaries',
    detail: 'Complete the guided tour and Academy lessons before testing research or simulation tools.',
    href: '#academy',
    action: 'Open Academy',
    icon: GraduationCap,
  },
  {
    label: 'Set your experience',
    detail: 'Choose locale, time zone, density and accessibility preferences for consistent reporting.',
    href: '#customer-experience',
    action: 'Set preferences',
    icon: SlidersHorizontal,
  },
  {
    label: 'Choose notifications',
    detail: 'Control research, incident and product-update categories. Alerts never authorize a trade.',
    href: '#data-trust',
    action: 'Review notifications',
    icon: BellRing,
  },
  {
    label: 'Protect the account',
    detail: 'Review sessions and optionally add authenticator verification from the Security Center.',
    href: '#account-security',
    action: 'Open Security Center',
    icon: ShieldCheck,
  },
  {
    label: 'Share beta evidence',
    detail: 'Send private feedback or support requests without including credentials or payment details.',
    href: '#customer-support',
    action: 'Open support',
    icon: Headphones,
  },
  {
    label: 'Run approved pilot missions',
    detail: 'If assigned to an active cohort, accept the pilot agreement and complete the bounded evaluation plan.',
    href: '#approved-pilot',
    action: 'Open pilot workspace',
    icon: CheckCircle2,
  },
]

export function BetaOperationsPanel() {
  const { session, loading: authLoading } = useAuth()
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const results = await Promise.allSettled([
      getExperiencePreferences(),
      getAccountSecurityStatus(),
      getNotificationPreferences(),
      getSupportRequests(),
    ])
    const failed = ['profile', 'security', 'notifications', 'support']
      .filter((_, index) => results[index].status === 'rejected')
    setSnapshot({
      profile: results[0].status === 'fulfilled' ? results[0].value : null,
      security: results[1].status === 'fulfilled' ? results[1].value : null,
      notifications: results[2].status === 'fulfilled' ? results[2].value : null,
      support: results[3].status === 'fulfilled' ? results[3].value : null,
      failed,
    })
    setLoading(false)
  }, [session])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const checks = useMemo(() => {
    const profileComplete = Boolean(
      snapshot.profile?.displayName.trim() &&
      snapshot.profile.locale &&
      snapshot.profile.timeZone,
    )
    return [
      {
        label: 'Invite-only identity',
        ready: Boolean(session),
        detail: session?.user.email ?? 'Approved identity required',
      },
      {
        label: 'Experience profile',
        ready: profileComplete,
        detail: snapshot.failed.includes('profile')
          ? 'Private profile check needs attention'
          : profileComplete ? 'Locale, time zone and display name recorded' : 'Complete your experience preferences',
      },
      {
        label: 'Notification controls',
        ready: Boolean(snapshot.notifications),
        detail: snapshot.failed.includes('notifications')
          ? 'Preference check needs attention'
          : snapshot.notifications?.externalDeliveryEnabled
            ? 'Approved external delivery is active' : 'Private preferences available; external delivery remains locked',
      },
      {
        label: 'Private support route',
        ready: Boolean(snapshot.support),
        detail: snapshot.failed.includes('support')
          ? 'Support history check needs attention'
          : `${snapshot.support?.length ?? 0} recent request${snapshot.support?.length === 1 ? '' : 's'}`,
      },
    ]
  }, [session, snapshot])

  if (authLoading) {
    return <div className="beta-operations-loading" role="status"><LoaderCircle className="spinning" size={18} /> Checking approved beta access…</div>
  }

  if (!session) {
    return <section className="panel beta-operations-panel">
      <div className="panel-header"><div><p className="eyebrow">Beta operations · Phase 5E</p><h2>Approved beta access required</h2></div><span className="status-badge"><ShieldCheck size={14} /> Invite-only</span></div>
      <p className="panel-description">This workspace reads private onboarding, security, notification and support controls for approved testers. It never approves or creates users.</p>
      <div className="beta-guest-boundary">
        <ShieldCheck size={22} />
        <div><strong>Pre-provisioned accounts only</strong><span>Use the exact email approved by the controlled-beta owner.</span></div>
        <a className="secondary-button" href="#account-security">Open secure sign-in</a>
      </div>
      <div className="beta-hard-locks" aria-label="Controlled beta hard locks"><span>Live execution locked</span><span>Payments locked</span><span>Checkout locked</span></div>
    </section>
  }

  const readyCount = checks.filter((check) => check.ready).length
  const security = snapshot.security?.posture
  const securityReady = Boolean(security?.verifiedFactorCount && security.currentAssuranceLevel === 'aal2')

  return <section className="panel beta-operations-panel">
    <div className="panel-header"><div><p className="eyebrow">Beta operations · Phase 5E</p><h2>Your controlled-beta launch center</h2></div><button className="secondary-button" type="button" disabled={loading} onClick={() => void refresh()}><RefreshCw className={loading ? 'spinning' : ''} size={15} /> Refresh checks</button></div>
    <p className="panel-description">Follow one private, evidence-led path from onboarding to support. These checks improve the beta experience and never unlock live trading, payments or checkout.</p>

    <div className="beta-operations-summary" role="status" aria-live="polite">
      <div><strong>{readyCount} of {checks.length} operational checks ready</strong><span>{session.user.email}</span></div>
      <progress max={checks.length} value={readyCount} aria-label="Beta operations readiness" />
    </div>

    <div className="beta-check-grid" aria-label="Private beta operational checks">
      {checks.map((check) => <article className={check.ready ? 'ready' : 'attention'} key={check.label}>
        {check.ready ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
        <div><strong>{check.label}</strong><span>{check.detail}</span></div>
      </article>)}
    </div>

    <div className={`beta-security-recommendation ${securityReady ? 'ready' : 'recommended'}`}>
      <ShieldCheck size={20} />
      <div><strong>{securityReady ? 'Verified session protection active' : 'Optional account hardening recommended'}</strong><span>{snapshot.failed.includes('security') ? 'Security posture could not be checked; use the Security Center directly.' : securityReady ? 'This session is authenticator verified at AAL2.' : 'Add authenticator verification and review other signed-in sessions.'}</span></div>
      <a href="#account-security">Review security</a>
    </div>

    <h3 className="beta-journey-title">Your beta journey</h3>
    <div className="beta-journey-grid">
      {journey.map((item, index) => {
        const Icon = item.icon
        return <a href={item.href} key={item.href}><span className="beta-journey-step">{index + 1}</span><Icon size={18} /><div><strong>{item.label}</strong><p>{item.detail}</p><span>{item.action}</span></div></a>
      })}
    </div>

    <div className="beta-hard-locks" aria-label="Controlled beta hard locks"><span>Research—not advice</span><span>Simulation only</span><span>No execution or money movement</span></div>
  </section>
}
