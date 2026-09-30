import {
  Ban,
  CircleAlert,
  ClipboardList,
  FileWarning,
  LoaderCircle,
  Network,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderDecisionRecovery,
  type GlobalProviderDecisionRecovery,
} from '../lib/queries/globalProviderDecisionRecovery'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider decision recovery controls are temporarily unavailable.'
}

export function GlobalProviderDecisionRecoveryPanel() {
  const [workspace, setWorkspace] = useState<GlobalProviderDecisionRecovery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderDecisionRecovery().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.recovery.some((item) => item.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.recovery[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const sourceFamilies = useMemo(() => Array.from(new Map(
    (workspace?.recovery ?? []).map((item) => [item.sourceFamilyKey, item.sourceFamilyName]),
  )), [workspace])
  const selectedRecovery = useMemo(() => workspace?.recovery.filter(
    (item) => item.sourceFamilyKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider decision recovery controls…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8R</p><h2>Provider decision recovery and revocation controls</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Recovery locked</span>
      </div>
      <p className="panel-description">
        Define the fail-closed triggers, manual recovery states and rollback evidence requirements that must exist before any future provider decision could be challenged, frozen or revoked.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No recovery event exists in Phase 8R</strong>
          <span>No exception, challenge, investigator, evidence, reason code, signature, freeze, rollback or revocation is recorded. Provider, endpoint, write, release, training, publication and trading effects remain database-locked off.</span>
        </div>
        <small>{workspace.status.authorizedRecoveryCellCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Provider decision recovery-control summary">
        <article><FileWarning /><strong>{workspace.status.recoveryTriggerCount}</strong><span>recovery triggers</span><small>All unobserved</small></article>
        <article><ClipboardList /><strong>{workspace.status.recoveryCellCount}</strong><span>recovery cells</span><small>{workspace.status.blockedRecoveryCellCount} blocked</small></article>
        <article><RotateCcw /><strong>{workspace.status.recoveryStateCount}</strong><span>recovery states</span><small>Reference only</small></article>
        <article><Network /><strong>{workspace.status.sourceFamilyCount}</strong><span>source families</span><small>No providers</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="recovery-trigger-title">
          <div className="certification-heading"><div><FileWarning size={18} /><h3 id="recovery-trigger-title">Eight fail-closed recovery triggers</h3></div><small>No real events</small></div>
          <div className="certification-profile-grid">
            {workspace.triggers.map((trigger) => (
              <article key={trigger.triggerKey}>
                <span>{trigger.sequenceNumber}</span><div><strong>{trigger.displayName}</strong><small>{trigger.triggerDefinition}</small></div><em>{readable(trigger.triggerStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="recovery-matrix-title">
          <div className="certification-heading"><div><ClipboardList size={18} /><h3 id="recovery-matrix-title">Recovery readiness matrix</h3></div><small>Every cell remains blocked</small></div>
          <label className="sr-only" htmlFor="provider-recovery-source">Source family</label>
          <select id="provider-recovery-source" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {sourceFamilies.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedRecovery.map((item) => <article key={item.triggerKey}>
              <strong>{item.triggerName}</strong>
              <small>{readable(item.recoveryDomain)} · freeze, rollback and revocation blocking</small>
              <em>{readable(item.recoveryStatus)} · no event</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="recovery-state-title">
        <div className="certification-heading"><div><RotateCcw size={18} /><h3 id="recovery-state-title">Seven manual recovery states</h3></div><small>No automatic transitions</small></div>
        <ol>{workspace.states.map((state) => <li key={state.stateKey}><span>{state.sequenceNumber}</span><div><strong>{state.displayName}</strong><em>No real recovery</em><small>{state.stateDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8R is recovery scaffolding, not incident handling or provider activation. A real exception, freeze, rollback or revocation requires a separately authorized change with verified identities, controlled evidence, explicit reason codes, independent review, immutable audit, dual control and tested restoration.</p>
    </section>
  )
}
