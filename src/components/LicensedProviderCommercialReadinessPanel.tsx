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
  getLicensedProviderCommercialReadiness,
  type LicensedProviderCommercialReadiness,
} from '../lib/queries/licensedProviderCommercialReadiness'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Licensed-provider commercial readiness is temporarily unavailable.'
}

export function LicensedProviderCommercialReadinessPanel() {
  const [workspace, setWorkspace] = useState<LicensedProviderCommercialReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('corporate_ownership_and_financial_stability')

  useEffect(() => {
    let active = true
    void getLicensedProviderCommercialReadiness().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.readiness.some((item) => item.domainKey === selectedKey)) {
        setSelectedKey(next.readiness[0]?.domainKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const selectedReadiness = useMemo(() => workspace?.readiness.filter(
    (item) => item.domainKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading licensed-provider commercial readiness…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Provider procurement foundation · Phase 8W</p><h2>Licensed-provider commercial readiness</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Commitment locked</span>
      </div>
      <p className="panel-description">
        Review corporate diligence, coverage, rights, entitlements, pricing, security, service and exit terms before any provider can be shortlisted or contracted.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider is shortlisted or contracted in Phase 8W</strong>
          <span>No quote is accepted, contract signed, purchase order issued, credential stored, payload received, live display enabled or production commitment made.</span>
        </div>
        <small>{workspace.status.authorizedReadinessCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Licensed-provider commercial-readiness summary">
        <article><DatabaseZap /><strong>{workspace.status.commercialDomainCount}</strong><span>review domains</span><small>No candidate</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.commercialGateCount}</strong><span>commercial gates</span><small>All unmet</small></article>
        <article><Gauge /><strong>{workspace.status.readinessCellCount}</strong><span>readiness cells</span><small>{workspace.status.blockedReadinessCellCount} blocked</small></article>
        <article><RadioTower /><strong>{workspace.status.commercialStateCount}</strong><span>review states</span><small>Manual only</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="provider-commercial-gate-title">
          <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="provider-commercial-gate-title">Eight commercial review gates</h3></div><small>No real evidence</small></div>
          <div className="certification-profile-grid">
            {workspace.gates.map((gate) => (
              <article key={gate.gateKey}>
                <span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.gateDefinition}</small></div><em>{readable(gate.gateStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="provider-commercial-matrix-title">
          <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="provider-commercial-matrix-title">Commercial readiness matrix</h3></div><small>Every cell remains blocked</small></div>
          <label className="sr-only" htmlFor="licensed-provider-commercial-domain">Review domain</label>
          <select id="licensed-provider-commercial-domain" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {workspace.domains.map((domain) => <option key={domain.domainKey} value={domain.domainKey}>{domain.displayName}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedReadiness.map((item) => <article key={item.gateKey}>
              <strong>{item.gateName}</strong>
              <small>{readable(item.reviewDomain)} · shortlist, quote, contract and commitment blocked</small>
              <em>{readable(item.readinessStatus)} · no effect</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="provider-commercial-state-title">
        <div className="certification-heading"><div><RadioTower size={18} /><h3 id="provider-commercial-state-title">Seven manual commercial states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No shortlist or contract</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8W is commercial-review scaffolding, not vendor selection, contract execution, procurement approval or provider activation. Any real commitment still requires provider-specific evidence, legal and security review, an approved cost ceiling, accountable signature authority, explicit implementation acceptance, independent authorization and protected exit terms.</p>
    </section>
  )
}

export default LicensedProviderCommercialReadinessPanel
