import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  FileLock2,
  LoaderCircle,
  Network,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderReviewGovernance,
  type GlobalProviderReviewGovernance,
} from '../lib/queries/globalProviderReviewGovernance'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider review-governance readiness is temporarily unavailable.'
}

export function GlobalProviderReviewGovernancePanel() {
  const [workspace, setWorkspace] = useState<GlobalProviderReviewGovernance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderReviewGovernance().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.responsibilities.some((item) => item.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.responsibilities[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const sourceFamilies = useMemo(() => Array.from(new Map(
    (workspace?.responsibilities ?? []).map((item) => [item.sourceFamilyKey, item.sourceFamilyName]),
  )), [workspace])
  const selectedResponsibilities = useMemo(() => workspace?.responsibilities.filter(
    (item) => item.sourceFamilyKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider review-governance controls…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8P</p><h2>Provider review authority and evidence custody</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Governance locked</span>
      </div>
      <p className="panel-description">
        Define the independent review roles, separation of duties and sealed-evidence lifecycle required before a real provider candidate can be evaluated.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No reviewer or evidence custodian is assigned in Phase 8P</strong>
          <span>No identity, candidate, packet, evidence, custody location, endpoint, credential or payload exists. Assignment, receipt, testing, writes, release, training, publication and trading remain database-locked off.</span>
        </div>
        <small>{workspace.status.authorizedResponsibilityCount} authorized</small>
      </div>

      <div className="certification-summary" aria-label="Provider review-governance summary">
        <article><UserRoundCog /><strong>{workspace.status.roleTemplateCount}</strong><span>review roles</span><small>{workspace.status.unassignedRoleCount} unassigned</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.responsibilityCount}</strong><span>responsibility cells</span><small>{workspace.status.unassignedResponsibilityCount} unassigned</small></article>
        <article><FileLock2 /><strong>{workspace.status.lifecycleStageCount}</strong><span>lifecycle stages</span><small>Reference only</small></article>
        <article><Network /><strong>{workspace.status.sourceFamilyCount}</strong><span>source families</span><small>No candidates</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="review-role-title">
          <div className="certification-heading"><div><UserRoundCog size={18} /><h3 id="review-role-title">Eight unassigned review roles</h3></div><small>No identities stored</small></div>
          <div className="certification-profile-grid">
            {workspace.roles.map((role) => (
              <article key={role.roleKey}>
                <span>{role.sequenceNumber}</span><div><strong>{role.displayName}</strong><small>{role.responsibility}</small></div><em>{readable(role.assignmentStatus)}</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="responsibility-title">
          <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="responsibility-title">Responsibility matrix</h3></div><small>Every role blocks access</small></div>
          <label className="sr-only" htmlFor="provider-review-source">Source family</label>
          <select id="provider-review-source" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {sourceFamilies.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <div className="contract-fixture-list">
            {selectedResponsibilities.map((item) => <article key={item.roleKey}>
              <strong>{item.roleName}</strong>
              <small>{readable(item.reviewDomain)} · packet, endpoint and release blocking</small>
              <em>{readable(item.responsibilityStatus)} · no authority</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="evidence-lifecycle-title">
        <div className="certification-heading"><div><FileLock2 size={18} /><h3 id="evidence-lifecycle-title">Seven-stage sealed-evidence lifecycle</h3></div><small>Human transitions only</small></div>
        <ol>{workspace.lifecycle.map((stage) => <li key={stage.stageKey}><span>{stage.sequenceNumber}</span><div><strong>{stage.displayName}</strong><em>No evidence stored</em><small>{stage.stageDefinition}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8P is governance scaffolding, not provider onboarding. Assigning a real reviewer, receiving evidence or opening a candidate packet requires a separate authorized change with approved identities, custody controls, signed rights and an expiring decision.</p>
    </section>
  )
}
