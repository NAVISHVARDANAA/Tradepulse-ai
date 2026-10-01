import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  FlaskConical,
  LoaderCircle,
  Network,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderActivationRehearsal,
  type GlobalProviderActivationRehearsal,
} from '../lib/queries/globalProviderActivationRehearsal'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider activation rehearsal is temporarily unavailable.'
}

export function GlobalProviderActivationRehearsalPanel() {
  const [workspace, setWorkspace] = useState<GlobalProviderActivationRehearsal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderActivationRehearsal().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.rehearsal.some((item) => item.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.rehearsal[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const sourceFamilies = useMemo(() => Array.from(new Map(
    (workspace?.rehearsal ?? []).map((item) => [item.sourceFamilyKey, item.sourceFamilyName]),
  )), [workspace])
  const selectedRehearsal = useMemo(() => workspace?.rehearsal.filter(
    (item) => item.sourceFamilyKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider activation rehearsal…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8T</p><h2>Provider activation rehearsal and rollback verification</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Rehearsal locked</span>
      </div>
      <p className="panel-description">
        Define the isolation, synthetic-input, observability, abort, restoration and closeout evidence required before any future provider-specific activation rehearsal could be authorized.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider rehearsal exists in Phase 8T</strong>
          <span>No provider, runbook, environment, endpoint, secret, payload, rehearsal window, drill or activation is recorded. External egress, writes, release, training, publication and trading remain database-locked off.</span>
        </div>
        <small>{workspace.status.authorizedRehearsalCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Provider activation-rehearsal summary">
        <article><FlaskConical /><strong>{workspace.status.rehearsalGateCount}</strong><span>rehearsal gates</span><small>All unmet</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.rehearsalCellCount}</strong><span>rehearsal cells</span><small>{workspace.status.blockedRehearsalCellCount} blocked</small></article>
        <article><RotateCcw /><strong>{workspace.status.rehearsalStateCount}</strong><span>rehearsal states</span><small>Reference only</small></article>
        <article><Network /><strong>{workspace.status.sourceFamilyCount}</strong><span>source families</span><small>No providers</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="rehearsal-gate-title">
          <div className="certification-heading"><div><FlaskConical size={18} /><h3 id="rehearsal-gate-title">Eight fail-closed rehearsal gates</h3></div><small>No real evidence</small></div>
          <div className="certification-profile-grid">
            {workspace.gates.map((gate) => (
              <article key={gate.gateKey}>
                <span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.gateDefinition}</small></div><em>{readable(gate.gateStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="rehearsal-matrix-title">
          <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="rehearsal-matrix-title">Activation rehearsal matrix</h3></div><small>Every cell remains blocked</small></div>
          <label className="sr-only" htmlFor="provider-rehearsal-source">Source family</label>
          <select id="provider-rehearsal-source" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {sourceFamilies.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedRehearsal.map((item) => <article key={item.gateKey}>
              <strong>{item.gateName}</strong>
              <small>{readable(item.rehearsalDomain)} · egress, secrets, drills and activation blocking</small>
              <em>{readable(item.rehearsalStatus)} · no effect</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="rehearsal-state-title">
        <div className="certification-heading"><div><RotateCcw size={18} /><h3 id="rehearsal-state-title">Seven manual rehearsal states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No real rehearsal</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8T is rehearsal-readiness scaffolding, not provider testing or activation. A real rehearsal requires a separately authorized provider-specific change with a non-production environment, synthetic-only inputs, allowlisted egress, ephemeral secrets, bounded scope, observed abort and restoration, independent verification, immutable audit and accountable closeout.</p>
    </section>
  )
}
