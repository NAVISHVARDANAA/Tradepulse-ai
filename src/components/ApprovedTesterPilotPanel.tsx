import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  Headphones,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import {
  acceptApprovedTesterPilotTerms,
  getApprovedTesterPilotStatus,
  setApprovedTesterPilotMission,
  type ApprovedTesterPilotStatus,
  type PilotMissionCode,
} from '../lib/queries/approvedTesterPilot'

const missions: readonly {
  code: PilotMissionCode
  title: string
  detail: string
  href: `#${string}`
  action: string
}[] = [
  {
    code: 'trust-review',
    title: 'Verify a trust receipt',
    detail: 'Review the evidence, uncertainty and hard boundary on a decision receipt.',
    href: '#trust-center',
    action: 'Open Trust Center',
  },
  {
    code: 'forecast-review',
    title: 'Challenge a forecast',
    detail: 'Inspect freshness, reliability and interval evidence without treating it as advice.',
    href: '#forecasts',
    action: 'Open Forecasts',
  },
  {
    code: 'paper-simulation',
    title: 'Test a paper decision',
    detail: 'Use virtual funds and pre-trade controls; no broker or real money is reachable.',
    href: '#paper-investing',
    action: 'Open Paper Lab',
  },
  {
    code: 'support-recovery',
    title: 'Exercise support recovery',
    detail: 'Submit pilot feedback or a pilot incident and retain the private reference.',
    href: '#customer-support',
    action: 'Open Support',
  },
]

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ApprovedTesterPilotPanel() {
  const { session, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<ApprovedTesterPilotStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [pendingMission, setPendingMission] = useState<PilotMissionCode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      setStatus(await getApprovedTesterPilotStatus())
    } catch {
      setError('Your private pilot status could not be checked. No access boundary was changed.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const completed = useMemo(
    () => new Set(status?.completedMissions ?? []),
    [status?.completedMissions],
  )

  const acceptTerms = async () => {
    if (!status?.termsVersion || !accepted) return
    setLoading(true)
    setError(null)
    try {
      setStatus(await acceptApprovedTesterPilotTerms(status.termsVersion))
    } catch {
      setError('The pilot agreement could not be accepted. Confirm that the cohort is active and try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMission = async (mission: PilotMissionCode) => {
    setPendingMission(mission)
    setError(null)
    try {
      setStatus(await setApprovedTesterPilotMission(mission, !completed.has(mission)))
    } catch {
      setError('Mission progress could not be recorded. Your pilot access and safety locks are unchanged.')
    } finally {
      setPendingMission(null)
    }
  }

  if (authLoading) {
    return <div className="pilot-loading" role="status"><LoaderCircle className="spinning" size={18} /> Checking approved pilot access…</div>
  }

  if (!session) {
    return <section className="panel pilot-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Approved tester pilot · Phase 5H</p><h2>Approved pilot access required</h2></div>
        <span className="status-badge"><ShieldCheck size={14} /> Bounded cohort</span>
      </div>
      <p className="panel-description">This screen cannot approve, enroll or create a tester. A manually approved, pre-provisioned identity and pilot assignment are required.</p>
      <div className="pilot-access-boundary">
        <ShieldCheck size={24} />
        <div><strong>Invite-only and capacity limited</strong><span>Unknown addresses cannot create an account or discover pilot membership.</span></div>
        <a className="secondary-button" href="#account-security">Open secure sign-in</a>
      </div>
      <div className="beta-hard-locks" aria-label="Pilot hard locks"><span>No execution or money movement</span><span>No public signup</span><span>No browser approval</span></div>
    </section>
  }

  return <section className="panel pilot-panel">
    <div className="panel-header">
      <div><p className="eyebrow">Approved tester pilot · Phase 5H</p><h2>Your private pilot workspace</h2></div>
      <button className="secondary-button" type="button" disabled={loading} onClick={() => void refresh()}><RefreshCw className={loading ? 'spinning' : ''} size={15} /> Refresh pilot</button>
    </div>
    <p className="panel-description">Follow a bounded evaluation plan, preserve evidence and use staffed escalation. Pilot activity never authorizes trading, checkout, custody or payment execution.</p>
    {error ? <p className="error-message" role="alert">{error}</p> : null}

    {loading && !status ? <div className="pilot-loading" role="status"><LoaderCircle className="spinning" size={18} /> Loading private pilot assignment…</div> : null}

    {!loading && status && !status.eligible ? <div className="pilot-access-boundary attention">
      <AlertTriangle size={24} />
      <div><strong>Pilot assignment required</strong><span>You are signed in, but this identity has not been assigned to an approved cohort. This product cannot approve the assignment.</span></div>
      <a className="secondary-button" href="#customer-support">Contact support</a>
    </div> : null}

    {status?.eligible ? <>
      <div className="pilot-cohort-summary" aria-label="Private pilot cohort status">
        <div><span>Cohort</span><strong>{status.cohortName}</strong><small>{status.cohortCode}</small></div>
        <div><span>Membership</span><strong>{status.membershipStatus}</strong><small>{status.cohortStatus} cohort</small></div>
        <div><span>Testing window</span><strong>{formatDate(status.startsAt)}</strong><small>Ends {formatDate(status.endsAt)}</small></div>
        <div><span>Capacity boundary</span><strong>Maximum {status.maxTesters} testers</strong><small>No public enrollment</small></div>
      </div>

      {status.membershipStatus === 'approved' ? <section className="pilot-agreement" aria-labelledby="pilot-agreement-heading">
        <div><p className="eyebrow">Agreement {status.termsVersion}</p><h3 id="pilot-agreement-heading">Confirm the controlled-pilot boundary</h3></div>
        <ul>
          <li>Research and forecasts are evidence-led decision support, not financial advice.</li>
          <li>Paper investing is simulation; no broker order or real fund movement is possible.</li>
          <li>Never submit credentials, payment details or brokerage secrets through feedback.</li>
          <li>Use the pilot incident route when a safety, access or data-integrity boundary fails.</li>
        </ul>
        <label className="pilot-agreement-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> <span>I understand and accept the current pilot agreement.</span></label>
        <button className="primary-button" type="button" disabled={!accepted || loading || status.cohortStatus !== 'active'} onClick={() => void acceptTerms()}><ClipboardCheck size={16} /> Accept and begin pilot</button>
        {status.cohortStatus !== 'active' ? <p className="pilot-note" role="status">The cohort is not active. Agreement acceptance remains safely unavailable.</p> : null}
      </section> : null}

      {status.membershipStatus === 'active' ? <>
        <div className="pilot-progress" role="status" aria-live="polite">
          <div><strong>{completed.size} of {missions.length} pilot missions complete</strong><span>Progress is private and identity-bound.</span></div>
          <progress max={missions.length} value={completed.size} aria-label="Approved pilot progress" />
        </div>

        <div className="pilot-mission-grid" aria-label="Approved pilot missions">
          {missions.map((mission, index) => {
            const isComplete = completed.has(mission.code)
            return <article className={isComplete ? 'complete' : ''} key={mission.code}>
              <div className="pilot-mission-number">{isComplete ? <CheckCircle2 size={18} /> : index + 1}</div>
              <div><h3>{mission.title}</h3><p>{mission.detail}</p></div>
              <div className="pilot-mission-actions">
                <a href={mission.href}>{mission.action}</a>
                <button type="button" aria-pressed={isComplete} disabled={pendingMission === mission.code} onClick={() => void toggleMission(mission.code)}>{pendingMission === mission.code ? 'Saving…' : isComplete ? 'Completed' : 'Mark complete'}</button>
              </div>
            </article>
          })}
        </div>

        <section className="pilot-escalation" aria-labelledby="pilot-escalation-heading">
          <div><Headphones size={22} /><div><p className="eyebrow">Staffed feedback</p><h3 id="pilot-escalation-heading">Evidence-linked help and escalation</h3></div></div>
          <div className="pilot-response-targets">
            <span><Clock3 size={15} /> Feedback target: {status.feedbackResponseTargetHours} hours</span>
            <span><AlertTriangle size={15} /> Incident target: {status.incidentResponseTargetMinutes} minutes</span>
          </div>
          <p>Targets are service goals, not emergency guarantees. Submit a pilot incident for a safety, access or data-integrity failure; never include secrets or financial credentials.</p>
          <a className="primary-button" href="#customer-support"><FlaskConical size={16} /> Open pilot feedback and incidents</a>
        </section>
      </> : null}

      {status.membershipStatus && !['approved', 'active'].includes(status.membershipStatus) ? <div className="pilot-access-boundary attention">
        <AlertTriangle size={24} />
        <div><strong>Pilot membership {status.membershipStatus}</strong><span>Testing missions are unavailable. Contact the staffed support route if you believe this is incorrect.</span></div>
        <a className="secondary-button" href="#customer-support">Open support</a>
      </div> : null}
    </> : null}

    <div className="beta-hard-locks" aria-label="Pilot hard locks"><span>Research—not advice</span><span>Simulation only</span><span>No execution or money movement</span></div>
  </section>
}

