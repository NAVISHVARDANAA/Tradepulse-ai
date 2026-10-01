import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  Gauge,
  Globe2,
  LoaderCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getExternalAudienceLaunchReadiness,
  type ExternalAudienceLaunchReadiness,
} from '../lib/queries/externalAudienceLaunchReadiness'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'External audience launch readiness is temporarily unavailable.'
}

export function ExternalAudienceLaunchReadinessPanel() {
  const [workspace, setWorkspace] = useState<ExternalAudienceLaunchReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('public_market_dashboard')

  useEffect(() => {
    let active = true
    void getExternalAudienceLaunchReadiness().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.readiness.some((item) => item.surfaceKey === selectedKey)) {
        setSelectedKey(next.readiness[0]?.surfaceKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const selectedReadiness = useMemo(() => workspace?.readiness.filter(
    (item) => item.surfaceKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading external audience launch readiness…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Production foundation · Phase 8U</p><h2>External audience launch readiness</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Launch locked</span>
      </div>
      <p className="panel-description">
        Define the exact hosting, identity, legal, support, monitoring, data-rights, capacity and rollback evidence required before real external users can enter a bounded production beta.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No external audience is activated in Phase 8U</strong>
          <span>No public signup, unrestricted discovery, live provider, production credential, customer payload, publication, model training, trade, payment, custody or settlement is enabled.</span>
        </div>
        <small>{workspace.status.authorizedReadinessCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="External audience launch-readiness summary">
        <article><Globe2 /><strong>{workspace.status.audienceSurfaceCount}</strong><span>audience surfaces</span><small>Unavailable</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.launchGateCount}</strong><span>launch gates</span><small>All unmet</small></article>
        <article><Gauge /><strong>{workspace.status.readinessCellCount}</strong><span>readiness cells</span><small>{workspace.status.blockedReadinessCellCount} blocked</small></article>
        <article><Users /><strong>{workspace.status.launchStateCount}</strong><span>launch states</span><small>Manual only</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="audience-gate-title">
          <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="audience-gate-title">Eight production launch gates</h3></div><small>No real evidence</small></div>
          <div className="certification-profile-grid">
            {workspace.gates.map((gate) => (
              <article key={gate.gateKey}>
                <span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.gateDefinition}</small></div><em>{readable(gate.gateStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="audience-matrix-title">
          <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="audience-matrix-title">Audience readiness matrix</h3></div><small>Every cell remains blocked</small></div>
          <label className="sr-only" htmlFor="audience-launch-surface">Product surface</label>
          <select id="audience-launch-surface" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {workspace.surfaces.map((surface) => <option key={surface.surfaceKey} value={surface.surfaceKey}>{surface.displayName}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedReadiness.map((item) => <article key={item.gateKey}>
              <strong>{item.gateName}</strong>
              <small>{readable(item.launchDomain)} · access, data, providers and financial actions blocked</small>
              <em>{readable(item.readinessStatus)} · no effect</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="audience-state-title">
        <div className="certification-heading"><div><Users size={18} /><h3 id="audience-state-title">Seven manual launch states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No real audience</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8U is production launch-readiness scaffolding, not public launch authorization. A real external cohort still requires verified domain and identity controls, published legal and support ownership, monitoring and incident readiness, licensed or synthetic data labels, bounded consent, independent review, rollback, expiry and accountable closeout.</p>
    </section>
  )
}
