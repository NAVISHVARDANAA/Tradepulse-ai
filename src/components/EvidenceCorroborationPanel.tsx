import {
  BadgeCheck,
  CircleAlert,
  DatabaseZap,
  FileCheck2,
  Globe2,
  Link2Off,
  LoaderCircle,
  Network,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalEvidenceOperations,
  type GlobalEvidenceOperations,
} from '../lib/queries/globalEvidenceOperations'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Global evidence operations are temporarily unavailable.'
}

export function EvidenceCorroborationPanel() {
  const [operations, setOperations] = useState<GlobalEvidenceOperations | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claimClass, setClaimClass] = useState('ALL')
  const [selectedCaseKey, setSelectedCaseKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getGlobalEvidenceOperations().then((next) => {
      if (!active) return
      setOperations(next)
      setSelectedCaseKey(next.reviewCases[0]?.caseKey ?? null)
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const visibleCases = useMemo(() => operations?.reviewCases.filter((item) =>
    claimClass === 'ALL' || item.claimClass === claimClass,
  ) ?? [], [operations, claimClass])
  const selectedCase = visibleCases.find((item) => item.caseKey === selectedCaseKey)
    ?? visibleCases[0]
  const selectedStages = operations?.stages.filter((stage) =>
    stage.caseKey === selectedCase?.caseKey,
  ) ?? []

  if (!operations) {
    return error
      ? <section className="panel evidence-operations-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel evidence-operations-panel" role="status"><LoaderCircle className="spinning" /> Loading evidence controls…</section>
  }

  return (
    <section className="panel evidence-operations-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Evidence operations · Phase 8H</p>
          <h2>Global evidence control room</h2>
        </div>
        <span className="status-badge active"><ShieldCheck size={14} /> Fail closed</span>
      </div>
      <p className="panel-description">
        Govern how official, licensed news, logistics and geoscience evidence could enter the global event engine. Rights, provenance, independent corroboration, conflicts and human publication review are separate mandatory gates.
      </p>

      <div className="evidence-boundary" role="note">
        <Link2Off size={22} />
        <div>
          <strong>No external source is connected in Phase 8H</strong>
          <span>Raw web scraping, private-source access, credential bypass, unlicensed storage, automatic verification, rumor promotion and autonomous publication remain database-locked off.</span>
        </div>
        <small>0 publishable claims</small>
      </div>

      <div className="evidence-summary" aria-label="Evidence operation safeguards">
        <article><Globe2 /><strong>{operations.status.countryCoverageTarget}</strong><span>country target</span><small>Gaps stay visible</small></article>
        <article><DatabaseZap /><strong>{operations.status.connectedSourceCount}</strong><span>connected sources</span><small>{operations.status.sourceLaneCount} governed lanes</small></article>
        <article><Network /><strong>{operations.status.minimumIndependentSources}+</strong><span>independent sources</span><small>Claim policy may require more</small></article>
        <article><Scale /><strong>{operations.status.publicationEligibleCaseCount}</strong><span>publication eligible</span><small>Human decision mandatory</small></article>
      </div>

      <section className="evidence-source-board" aria-labelledby="evidence-sources-title">
        <div className="evidence-heading">
          <div><DatabaseZap size={18} /><h3 id="evidence-sources-title">Governed source lanes</h3></div>
          <small>Named providers require separate approval</small>
        </div>
        <div className="evidence-source-grid">
          {operations.sourceLanes.map((lane) => (
            <article key={lane.laneKey}>
              <header><strong>{lane.displayName}</strong><span>{readable(lane.connectivityStatus)}</span></header>
              <p>{lane.reviewNote}</p>
              <div className="evidence-status-list">
                <span>Rights · {readable(lane.rightsStatus)}</span>
                <span>Authenticity · {readable(lane.authenticityStatus)}</span>
                <span>Privacy · {readable(lane.privacyStatus)}</span>
                <span>Security · {readable(lane.securityStatus)}</span>
                <span>Retention · {readable(lane.retentionStatus)}</span>
              </div>
              <small>{lane.supportedClaimClasses.length} supported claim families · priority {lane.reviewPriority}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="evidence-workspace-grid">
        <section className="evidence-queue-board" aria-labelledby="evidence-queue-title">
          <div className="evidence-heading">
            <div><FileCheck2 size={18} /><h3 id="evidence-queue-title">Corroboration rehearsal queue</h3></div>
            <label>Claim family
              <select value={claimClass} onChange={(event) => {
                setClaimClass(event.target.value)
                setSelectedCaseKey(null)
              }}>
                <option value="ALL">All rehearsals</option>
                {operations.policies.map((policy) => <option key={policy.claimClass} value={policy.claimClass}>{policy.displayName}</option>)}
              </select>
            </label>
          </div>
          <div className="evidence-case-list">
            {visibleCases.map((reviewCase) => (
              <button
                className={reviewCase.caseKey === selectedCase?.caseKey ? 'selected' : ''}
                key={reviewCase.caseKey}
                type="button"
                onClick={() => setSelectedCaseKey(reviewCase.caseKey)}
              >
                <span><CircleAlert size={16} /> Synthetic drill · {reviewCase.countryScope}</span>
                <strong>{reviewCase.claimClassName}</strong>
                <small>{reviewCase.independentSourceCount}/{reviewCase.requiredIndependentSources} independent sources · {reviewCase.blockingStageCount}/{reviewCase.stageCount} gates blocked</small>
              </button>
            ))}
          </div>
          {selectedCase ? (
            <div className="evidence-case-detail">
              <div><strong>{selectedCase.claimClassName}</strong><span>{readable(selectedCase.reviewStatus)}</span></div>
              <p>{selectedCase.rehearsalSummary}</p>
              <small>This is a workflow fixture, not a real-world claim. It is not display, publication, model or execution eligible.</small>
            </div>
          ) : <p className="evidence-empty">No rehearsal matches this filter.</p>}
        </section>

        <section className="evidence-stage-board" aria-labelledby="evidence-stages-title">
          <div className="evidence-heading">
            <div><BadgeCheck size={18} /><h3 id="evidence-stages-title">Independent review stages</h3></div>
            <small>All eight must close</small>
          </div>
          <div className="evidence-stage-list">
            {selectedStages.map((stage) => (
              <article key={stage.id}>
                <span>{stage.sequenceNumber}</span>
                <div><strong>{readable(stage.stageKey)}</strong><small>{stage.requirementNote}</small></div>
                <em>{readable(stage.stageStatus)}</em>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="evidence-policy-board" aria-labelledby="evidence-policies-title">
        <div className="evidence-heading">
          <div><Network size={18} /><h3 id="evidence-policies-title">Claim-specific corroboration policy</h3></div>
          <small>Freshness and independence vary by claim</small>
        </div>
        <div className="evidence-policy-grid">
          {operations.policies.map((policy) => (
            <article key={policy.claimClass}>
              <strong>{policy.displayName}</strong>
              <dl>
                <div><dt>Independent</dt><dd>{policy.minimumIndependentSources}</dd></div>
                <div><dt>Primary</dt><dd>{policy.minimumPrimarySources}</dd></div>
                <div><dt>Maximum age</dt><dd>{policy.maximumSourceAgeHours}h</dd></div>
                <div><dt>Conflict</dt><dd>{readable(policy.conflictResolution)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <p className="evidence-footnote"><ShieldCheck size={15} /> Evidence that passes review still cannot train a model, publish itself, move money or place a trade in Phase 8H.</p>
    </section>
  )
}
