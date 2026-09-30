import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  KeyRound,
  LoaderCircle,
  Network,
  ShieldCheck,
  TimerReset,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderActivationReadiness,
  type GlobalProviderActivationReadiness,
} from '../lib/queries/globalProviderActivationReadiness'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider activation readiness is temporarily unavailable.'
}

export function GlobalProviderActivationReadinessPanel() {
  const [workspace, setWorkspace] = useState<GlobalProviderActivationReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderActivationReadiness().then((next) => {
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
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider activation readiness…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8S</p><h2>Provider activation authorization and change controls</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Activation locked</span>
      </div>
      <p className="panel-description">
        Define the human authorization, bounded change window, restoration and verification evidence required before any future provider activation could be attempted.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider activation exists in Phase 8S</strong>
          <span>No provider, change packet, authorizer, decision, recovery plan, credential, endpoint, maintenance window or activation is recorded. Writes, release, training, publication and trading remain database-locked off.</span>
        </div>
        <small>{workspace.status.authorizedReadinessCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Provider activation-readiness summary">
        <article><KeyRound /><strong>{workspace.status.activationGateCount}</strong><span>activation gates</span><small>All unmet</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.readinessCellCount}</strong><span>readiness cells</span><small>{workspace.status.blockedReadinessCellCount} blocked</small></article>
        <article><TimerReset /><strong>{workspace.status.activationStateCount}</strong><span>change states</span><small>Reference only</small></article>
        <article><Network /><strong>{workspace.status.sourceFamilyCount}</strong><span>source families</span><small>No providers</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="activation-gate-title">
          <div className="certification-heading"><div><KeyRound size={18} /><h3 id="activation-gate-title">Eight fail-closed activation gates</h3></div><small>No real evidence</small></div>
          <div className="certification-profile-grid">
            {workspace.gates.map((gate) => (
              <article key={gate.gateKey}>
                <span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.gateDefinition}</small></div><em>{readable(gate.gateStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="activation-matrix-title">
          <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="activation-matrix-title">Activation readiness matrix</h3></div><small>Every cell remains blocked</small></div>
          <label className="sr-only" htmlFor="provider-activation-source">Source family</label>
          <select id="provider-activation-source" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {sourceFamilies.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedReadiness.map((item) => <article key={item.gateKey}>
              <strong>{item.gateName}</strong>
              <small>{readable(item.activationDomain)} · endpoint, credential and activation blocking</small>
              <em>{readable(item.readinessStatus)} · no effect</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="activation-state-title">
        <div className="certification-heading"><div><TimerReset size={18} /><h3 id="activation-state-title">Seven manual change-control states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No real activation</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8S is activation-readiness scaffolding, not provider onboarding or production change execution. A real activation requires a separately authorized provider-specific change with current rights, verified identities, isolated secrets, bounded scope, dual control, observed abort and restoration drills, immutable audit and accountable post-change verification.</p>
    </section>
  )
}
