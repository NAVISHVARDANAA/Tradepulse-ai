import {
  Accessibility,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type DrillId =
  | 'data-freshness'
  | 'session-recovery'
  | 'evidence-review'
  | 'incident-escalation'

type BrowserEvidence = {
  online: boolean
  reducedMotion: boolean
  horizontalOverflow: boolean
  domInteractiveMs: number | null
}

const recoveryDrills: readonly {
  id: DrillId
  title: string
  detail: string
  expected: string
  href: `#${string}`
  action: string
}[] = [
  {
    id: 'data-freshness',
    title: 'Data freshness recovery',
    detail: 'Open Data Trust, identify stale or missing evidence and confirm that no value is presented as live.',
    expected: 'A visible unknown, stale or recovery state—never a fabricated signal.',
    href: '#data-trust',
    action: 'Review data trust',
  },
  {
    id: 'session-recovery',
    title: 'Session and identity recovery',
    detail: 'Review passwordless return guidance, current-session protection and the safe route back to sign-in.',
    expected: 'No implicit signup, shared login, administrator bypass or token in browser history.',
    href: '#account-security',
    action: 'Review security',
  },
  {
    id: 'evidence-review',
    title: 'Decision evidence recovery',
    detail: 'Use the Trust Center when a forecast, preview or quote needs its source and hard boundary re-checked.',
    expected: 'Evidence remains reviewable while every regulated action stays unavailable.',
    href: '#trust-center',
    action: 'Review trust evidence',
  },
  {
    id: 'incident-escalation',
    title: 'Customer incident escalation',
    detail: 'Confirm the private pilot incident route and the information that must never be included.',
    expected: 'A private support reference without credentials, payment details or brokerage secrets.',
    href: '#customer-support',
    action: 'Review escalation',
  },
]

function readBrowserEvidence(): BrowserEvidence {
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined

  return {
    online: navigator.onLine,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    domInteractiveMs: navigation ? Math.max(0, Math.round(navigation.domInteractive)) : null,
  }
}

export function BetaHardeningPanel() {
  const [reviewed, setReviewed] = useState<Set<DrillId>>(() => new Set())
  const [evidence, setEvidence] = useState<BrowserEvidence | null>(null)

  const refreshEvidence = useCallback(() => {
    setEvidence(readBrowserEvidence())
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(refreshEvidence)
    window.addEventListener('online', refreshEvidence)
    window.addEventListener('offline', refreshEvidence)
    window.addEventListener('resize', refreshEvidence)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('online', refreshEvidence)
      window.removeEventListener('offline', refreshEvidence)
      window.removeEventListener('resize', refreshEvidence)
    }
  }, [refreshEvidence])

  const reviewedCount = reviewed.size
  const readyForReview = useMemo(
    () => reviewedCount === recoveryDrills.length &&
      evidence?.online === true &&
      evidence.horizontalOverflow === false,
    [evidence, reviewedCount],
  )

  const toggleDrill = (id: DrillId) => {
    setReviewed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return <section className="panel hardening-panel">
    <div className="panel-header">
      <div>
        <p className="eyebrow">Beta hardening · Phase 5I</p>
        <h2>Customer-safe release closure</h2>
      </div>
      <button className="secondary-button" type="button" onClick={refreshEvidence}>
        <RefreshCw size={15} /> Refresh local evidence
      </button>
    </div>
    <p className="panel-description">
      Exercise recovery, accessibility and browser-performance evidence before release review.
      Confirmations stay in this page session, create no analytics profile and never activate a regulated capability.
    </p>

    <div className={`hardening-readiness ${readyForReview ? 'ready' : 'review'}`} role="status" aria-live="polite">
      {readyForReview ? <CheckCircle2 size={24} /> : <ShieldCheck size={24} />}
      <div>
        <strong>{readyForReview ? 'Ready for administrative release review' : 'Hardening review in progress'}</strong>
        <span>{reviewedCount} of {recoveryDrills.length} recovery drills reviewed</span>
      </div>
      <progress max={recoveryDrills.length} value={reviewedCount} aria-label="Beta hardening recovery progress" />
    </div>

    <section className="hardening-evidence" aria-labelledby="browser-evidence-heading">
      <div className="hardening-section-heading">
        <div><p className="eyebrow">Customer-safe diagnostics</p><h3 id="browser-evidence-heading">This browser session</h3></div>
        <span>Not transmitted or persisted</span>
      </div>
      <div className="hardening-evidence-grid">
        <article className={evidence?.online ? 'ready' : 'attention'}>
          {evidence?.online ? <Wifi size={20} /> : <WifiOff size={20} />}
          <div><strong>Connectivity</strong><span>{evidence?.online ? 'Online' : 'Offline recovery state'}</span></div>
        </article>
        <article className={evidence?.horizontalOverflow === false ? 'ready' : 'attention'}>
          <Accessibility size={20} />
          <div><strong>Responsive layout</strong><span>{evidence?.horizontalOverflow === false ? 'No horizontal overflow detected' : 'Viewport review required'}</span></div>
        </article>
        <article className="neutral">
          <Gauge size={20} />
          <div><strong>DOM interactive</strong><span>{evidence?.domInteractiveMs == null ? 'Evidence unavailable' : `${evidence.domInteractiveMs.toLocaleString()} ms`}</span></div>
        </article>
        <article className="neutral">
          <Clock3 size={20} />
          <div><strong>Motion preference</strong><span>{evidence?.reducedMotion ? 'Reduced motion requested' : 'Standard motion requested'}</span></div>
        </article>
      </div>
      <p className="hardening-note">Browser timing is diagnostic evidence, not a customer identifier or contractual service-level claim. CI bundle budgets and deployed browser tests remain the release gate.</p>
    </section>

    <section className="hardening-drills" aria-labelledby="recovery-drills-heading">
      <div className="hardening-section-heading">
        <div><p className="eyebrow">Recovery drills</p><h3 id="recovery-drills-heading">Review the safe customer path</h3></div>
        <span>Four bounded scenarios</span>
      </div>
      <div className="hardening-drill-grid">
        {recoveryDrills.map((drill, index) => {
          const complete = reviewed.has(drill.id)
          return <article className={complete ? 'complete' : ''} key={drill.id}>
            <span className="hardening-drill-number">{complete ? <CheckCircle2 size={18} /> : index + 1}</span>
            <div>
              <h4>{drill.title}</h4>
              <p>{drill.detail}</p>
              <span className="hardening-expected"><LifeBuoy size={15} /> Expected: {drill.expected}</span>
            </div>
            <div className="hardening-drill-actions">
              <a href={drill.href}>{drill.action}</a>
              <label>
                <input
                  type="checkbox"
                  checked={complete}
                  onChange={() => toggleDrill(drill.id)}
                  aria-label={`Confirm ${drill.title} drill reviewed`}
                />
                <span>Reviewed</span>
              </label>
            </div>
          </article>
        })}
      </div>
    </section>

    <div className="hardening-closure-boundary">
      <AlertTriangle size={22} />
      <div>
        <strong>Administrative evidence only</strong>
        <span>This checklist cannot approve testers, change entitlements, submit an order, create checkout or move funds.</span>
      </div>
    </div>

    <div className="beta-hard-locks" aria-label="Beta hardening safety locks">
      <span>Research—not advice</span>
      <span>Simulation only</span>
      <span>No external analytics</span>
      <span>No execution or money movement</span>
    </div>
  </section>
}
