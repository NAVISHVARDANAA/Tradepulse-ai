import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  DatabaseZap,
  Gauge,
  LoaderCircle,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getLicensedLiveDataIntegration,
  type LicensedLiveDataIntegration,
} from '../lib/queries/licensedLiveDataIntegration'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Licensed live-data integration readiness is temporarily unavailable.'
}

export function LicensedLiveDataIntegrationPanel() {
  const [workspace, setWorkspace] = useState<LicensedLiveDataIntegration | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('instrument_reference_master')

  useEffect(() => {
    let active = true
    void getLicensedLiveDataIntegration().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.readiness.some((item) => item.feedKey === selectedKey)) {
        setSelectedKey(next.readiness[0]?.feedKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const selectedReadiness = useMemo(() => workspace?.readiness.filter(
    (item) => item.feedKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading licensed live-data integration readiness…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Licensed data foundation · Phase 8V</p><h2>Licensed live-data integration</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Integration locked</span>
      </div>
      <p className="panel-description">
        Define the exact licensing, entitlement, security, mapping, freshness, resilience, operations and rollback evidence required before any production market-data connection.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No licensed live-data provider is connected in Phase 8V</strong>
          <span>No provider, credential, real payload, live display, derived publication, external audience, order, payment, custody or settlement is enabled.</span>
        </div>
        <small>{workspace.status.authorizedReadinessCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Licensed live-data integration summary">
        <article><DatabaseZap /><strong>{workspace.status.feedClassCount}</strong><span>feed classes</span><small>Unavailable</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.integrationGateCount}</strong><span>integration gates</span><small>All unmet</small></article>
        <article><Gauge /><strong>{workspace.status.readinessCellCount}</strong><span>readiness cells</span><small>{workspace.status.blockedReadinessCellCount} blocked</small></article>
        <article><RadioTower /><strong>{workspace.status.integrationStateCount}</strong><span>integration states</span><small>Manual only</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="live-data-gate-title">
          <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="live-data-gate-title">Eight licensed live-data gates</h3></div><small>No real evidence</small></div>
          <div className="certification-profile-grid">
            {workspace.gates.map((gate) => (
              <article key={gate.gateKey}>
                <span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.gateDefinition}</small></div><em>{readable(gate.gateStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="live-data-matrix-title">
          <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="live-data-matrix-title">Feed readiness matrix</h3></div><small>Every cell remains blocked</small></div>
          <label className="sr-only" htmlFor="licensed-live-data-feed">Feed class</label>
          <select id="licensed-live-data-feed" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {workspace.feeds.map((feed) => <option key={feed.feedKey} value={feed.feedKey}>{feed.displayName}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedReadiness.map((item) => <article key={item.gateKey}>
              <strong>{item.gateName}</strong>
              <small>{readable(item.integrationDomain)} · provider, credential, payload and display blocked</small>
              <em>{readable(item.readinessStatus)} · no effect</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="live-data-state-title">
        <div className="certification-heading"><div><RadioTower size={18} /><h3 id="live-data-state-title">Seven manual integration states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No provider or payload</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8V is licensed live-data integration scaffolding, not a provider connection or real-user beta. A production feed still requires executed rights, explicit entitlements, vaulted credentials, restricted egress, provider-specific certification, freshness and quality monitoring, a zero-customer canary, independent review, rollback, expiry and accountable closeout.</p>
    </section>
  )
}

export default LicensedLiveDataIntegrationPanel
