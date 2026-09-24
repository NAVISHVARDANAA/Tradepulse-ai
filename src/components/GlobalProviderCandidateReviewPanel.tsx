import {
  Ban,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileWarning,
  LoaderCircle,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderCandidateReviews,
  type GlobalProviderCandidateReviews,
} from '../lib/queries/globalProviderCandidateReviews'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider candidate-review readiness is temporarily unavailable.'
}

export function GlobalProviderCandidateReviewPanel() {
  const [workspace, setWorkspace] = useState<GlobalProviderCandidateReviews | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderCandidateReviews().then((next) => {
      if (!active) return
      setWorkspace(next)
      if (!next.profiles.some((profile) => profile.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.profiles[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const selectedProfile = useMemo(() => workspace?.profiles.find(
    (profile) => profile.sourceFamilyKey === selectedKey,
  ), [workspace, selectedKey])
  const selectedMatrix = useMemo(() => workspace?.matrix.filter(
    (item) => item.sourceFamilyKey === selectedKey,
  ) ?? [], [workspace, selectedKey])

  if (!workspace) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider candidate-review controls…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8N</p><h2>Provider candidate evidence review</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Review locked</span>
      </div>
      <p className="panel-description">
        Prepare the exact legal, rights, privacy, security, mapping, test and operational evidence required before a provider candidate can enter a bounded conformance review.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider candidate is selected in Phase 8N</strong>
          <span>No review packet, evidence document, endpoint, credential or payload exists. Submission, testing, candidate writes, release, training, publication and trading remain database-locked off.</span>
        </div>
        <small>{workspace.status.selectedCandidateCount} candidates</small>
      </div>

      <div className="certification-summary" aria-label="Provider candidate-review summary">
        <article><Network /><strong>{workspace.status.reviewPacketCount}</strong><span>source-family packets</span><small>{workspace.status.unopenedReviewPacketCount} unopened</small></article>
        <article><ClipboardCheck /><strong>{workspace.status.evidenceRequirementCount}</strong><span>evidence gates</span><small>Human reviewed</small></article>
        <article><FileWarning /><strong>{workspace.status.missingEvidenceCount}</strong><span>missing evidence cells</span><small>{workspace.status.approvedEvidenceCount} approved</small></article>
        <article><CheckCircle2 /><strong>0</strong><span>executed fixtures</span><small>No endpoint access</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="candidate-profile-title">
          <div className="certification-heading"><div><Network size={18} /><h3 id="candidate-profile-title">Eight unopened review packets</h3></div><small>No provider identity stored</small></div>
          <div className="certification-profile-grid">
            {workspace.profiles.map((profile) => (
              <button type="button" className={profile.sourceFamilyKey === selectedKey ? 'selected' : ''} key={profile.sourceFamilyKey} onClick={() => setSelectedKey(profile.sourceFamilyKey)}>
                <span>{profile.sequenceNumber}</span><div><strong>{profile.sourceFamilyName}</strong><small>{readable(profile.sourceClass)}</small></div><em>{readable(profile.reviewStatus)}</em>
              </button>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="candidate-matrix-title">
          <div className="certification-heading"><div><FileWarning size={18} /><h3 id="candidate-matrix-title">Evidence matrix</h3></div><small>Nothing submitted</small></div>
          {selectedProfile ? <>
            <header><span>{selectedProfile.sequenceNumber}</span><div><strong>{selectedProfile.sourceFamilyName}</strong><small>{readable(selectedProfile.conformanceState)}</small></div></header>
            <div className="contract-fixture-list">
              {selectedMatrix.slice(0, 4).map((item) => <article key={item.requirementKey}>
                <strong>{workspace.requirements.find((requirement) => requirement.requirementKey === item.requirementKey)?.displayName}</strong>
                <small>{workspace.requirements.find((requirement) => requirement.requirementKey === item.requirementKey)?.evidenceRequirement}</small>
                <em>{readable(item.evidenceStatus)} · no approval</em>
              </article>)}
            </div>
          </> : <p>No review profile is available.</p>}
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="candidate-requirements-title">
        <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="candidate-requirements-title">Twelve evidence gates before conformance testing</h3></div><small>Every gap blocks endpoints, writes and release</small></div>
        <ol>{workspace.requirements.map((requirement) => <li key={requirement.requirementKey}><span>{requirement.sequenceNumber}</span><div><strong>{requirement.displayName}</strong><em>{readable(requirement.reviewDomain)}</em><small>{requirement.evidenceRequirement}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8N is an evidence checklist, not a provider onboarding or activation. Opening a real review packet requires a separate provider-specific change with signed rights, isolated secrets, controlled evidence handling and accountable human authorization.</p>
    </section>
  )
}
