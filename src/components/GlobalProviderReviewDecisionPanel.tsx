import {
  Ban,
  CircleAlert,
  ClipboardList,
  FileCheck2,
  Gavel,
  LoaderCircle,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderReviewDecisions,
  type GlobalProviderReviewDecisions,
} from '../lib/queries/globalProviderReviewDecisions'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider review decision readiness is temporarily unavailable.'
}

export function GlobalProviderReviewDecisionPanel() {
  const [workspace, setWorkspace] = useState<GlobalProviderReviewDecisions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderReviewDecisions().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.readiness.some((item) => item.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.readiness[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const sourceFamilies = useMemo(() => Array.from(new Map(
    (workspace?.readiness ?? []).map((item) => [item.sourceFamilyKey, item.sourceFamilyName]),
  )), [workspace])
  const selectedReadiness = useMemo(() => workspace?.readiness.filter(
    (item) => item.sourceFamilyKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider review decision controls…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8Q</p><h2>Provider review decisions and audit controls</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Decisions locked</span>
      </div>
      <p className="panel-description">
        Define the mandatory decision gates, human-only states and immutable audit requirements that must be satisfied before a provider review could ever authorize a bounded scope.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider review decision exists in Phase 8Q</strong>
          <span>No evidence reference, reviewer, reason code, signature, assessment, approval, provider, endpoint or credential is stored. Quorum evaluation, writes, release, training, publication and trading remain database-locked off.</span>
        </div>
        <small>{workspace.status.authorizedReadinessCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Provider review decision-control summary">
        <article><Gavel /><strong>{workspace.status.decisionGateCount}</strong><span>decision gates</span><small>All unmet</small></article>
        <article><ClipboardList /><strong>{workspace.status.readinessCellCount}</strong><span>readiness cells</span><small>{workspace.status.unmetReadinessCellCount} unmet</small></article>
        <article><FileCheck2 /><strong>{workspace.status.decisionStateCount}</strong><span>decision states</span><small>Reference only</small></article>
        <article><Network /><strong>{workspace.status.sourceFamilyCount}</strong><span>source families</span><small>No candidates</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="decision-gate-title">
          <div className="certification-heading"><div><Gavel size={18} /><h3 id="decision-gate-title">Eight mandatory decision gates</h3></div><small>No evidence or reviewers</small></div>
          <div className="certification-profile-grid">
            {workspace.gates.map((gate) => (
              <article key={gate.gateKey}>
                <span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.gateDefinition}</small></div><em>{readable(gate.gateStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="decision-readiness-title">
          <div className="certification-heading"><div><ClipboardList size={18} /><h3 id="decision-readiness-title">Decision readiness matrix</h3></div><small>Every gate blocks access</small></div>
          <label className="sr-only" htmlFor="provider-decision-source">Source family</label>
          <select id="provider-decision-source" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {sourceFamilies.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedReadiness.map((item) => <article key={item.gateKey}>
              <strong>{item.gateName}</strong>
              <small>{readable(item.reviewDomain)} · packet, endpoint and release blocking</small>
              <em>{readable(item.readinessStatus)} · no decision</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="decision-state-title">
        <div className="certification-heading"><div><FileCheck2 size={18} /><h3 id="decision-state-title">Seven human-only decision states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No real decision</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8Q is decision scaffolding, not provider approval. Recording a real decision requires a separately authorized change with verified identities, controlled evidence links, explicit reason codes, immutable audit, conflict review, dual control, expiry and revocation.</p>
    </section>
  )
}
