import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Radar,
  RefreshCw,
  Scale,
  ShieldCheck,
  Siren,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getLiveTradingReadinessWorkspace,
  type LiveTradingReadinessRequirement,
  type LiveTradingReadinessWorkspace,
} from '../lib/queries/liveTradingReadiness'

const domainMeta = {
  jurisdiction: { label: 'Jurisdiction', icon: Landmark },
  broker: { label: 'Broker', icon: Building2 },
  compliance: { label: 'Compliance', icon: Scale },
  money: { label: 'Funding, custody and settlement', icon: WalletCards },
  market_data: { label: 'Market data', icon: Radar },
  risk: { label: 'Risk and kill switch', icon: Siren },
  operations: { label: 'Operations', icon: ShieldCheck },
  customer: { label: 'Customer protection', icon: FileCheck2 },
} as const

const dateLabel = (value: string | null) => value
  ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
  : 'No evidence recorded'

function RequirementCard({ requirement }: { requirement: LiveTradingReadinessRequirement }) {
  const current = requirement.approvalCurrent
  return <article className={current ? 'live-readiness-requirement current' : 'live-readiness-requirement blocked'}>
    <div className="live-readiness-requirement-head">
      {current ? <CheckCircle2 size={17} /> : <Ban size={17} />}
      <div><strong>{requirement.title}</strong><span>{requirement.summary}</span></div>
      <small>{current ? 'Current evidence' : requirement.evidenceStatus.replace('_', ' ')}</small>
    </div>
    <div className="live-readiness-requirement-foot">
      <span>Reviewed: {dateLabel(requirement.reviewedAt)}</span>
      <span>{requirement.validUntil ? `Valid until: ${dateLabel(requirement.validUntil)}` : 'No activation authority'}</span>
    </div>
  </article>
}

export function LiveTradingReadinessPanel() {
  const [workspace, setWorkspace] = useState<LiveTradingReadinessWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getLiveTradingReadinessWorkspace()
      .then((data) => {
        if (!active) return
        setWorkspace(data)
        setError(null)
      })
      .catch(() => {
        if (active) setError('Readiness evidence could not be loaded. Every execution lock remains closed.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = workspace?.summary
  const groups = useMemo(() => Object.entries(domainMeta).map(([domain, meta]) => ({
    domain,
    ...meta,
    requirements: workspace?.requirements.filter((item) => item.domain === domain) ?? [],
  })), [workspace])
  const progress = summary?.requirementCount
    ? Math.round((summary.currentApprovalCount / summary.requirementCount) * 100)
    : 0

  return <section className="panel live-readiness-panel">
    <div className="panel-header">
      <div><p className="eyebrow">Regulated activation · Phase 6C</p><h2>Written evidence before any future activation</h2></div>
      <span className="status-badge live-readiness-lock"><LockKeyhole size={14} /> No live route</span>
    </div>
    <p className="panel-description">
      Every production activation gate is independently evidenced. This workspace shows sanitized readiness gaps; it does not approve, activate or submit a trade.
    </p>

    <div className="live-readiness-boundary" role="status">
      <Ban size={21} />
      <div><strong>Even complete evidence cannot activate trading.</strong><span>No live order endpoint exists in this phase. A separate written, manual and audited activation decision remains mandatory.</span></div>
      <small>{summary?.policyVersion ?? 'live-trading-readiness-v1'}</small>
    </div>

    <div className="live-readiness-lock-grid" aria-label="Live execution locks">
      {[
        ['Order routing', 'Disabled'],
        ['Customer funding', 'Disabled'],
        ['Custody and settlement', 'Disabled'],
        ['Automatic activation', 'Disabled'],
      ].map(([label, value]) => <article key={label}><LockKeyhole size={17} /><div><span>{label}</span><strong>{value}</strong></div></article>)}
    </div>

    <div className="live-readiness-summary">
      <article><span>Requirements</span><strong>{summary?.requirementCount ?? 18}</strong><small>Independent written gates</small></article>
      <article><span>Current evidence</span><strong>{summary?.currentApprovalCount ?? 0}</strong><small>Sanitized approvals</small></article>
      <article><span>Blocking gaps</span><strong>{summary?.blockingGapCount ?? 18}</strong><small>Every gap blocks review</small></article>
      <article><span>Activation status</span><strong>Blocked</strong><small>Manual review always required</small></article>
    </div>

    <div className="live-readiness-progress" aria-label={`${progress}% of readiness evidence current`}>
      <div><span>Evidence coverage</span><strong>{progress}%</strong></div>
      <div className="live-readiness-progress-track"><span style={{ width: `${progress}%` }} /></div>
    </div>

    {loading ? <div className="live-readiness-empty"><RefreshCw size={18} /> Loading readiness ledger…</div> : null}
    {error ? <p className="error-message" role="alert"><AlertTriangle size={15} /> {error}</p> : null}

    {!loading && !error ? <div className="live-readiness-domains">
      {groups.map((group) => {
        const Icon = group.icon
        return <section key={group.domain} className="live-readiness-domain">
          <div className="live-readiness-domain-head"><Icon size={19} /><div><span>Activation domain</span><strong>{group.label}</strong></div><small>{group.requirements.filter((item) => item.approvalCurrent).length}/{group.requirements.length} current</small></div>
          {group.requirements.map((requirement) => <RequirementCard requirement={requirement} key={requirement.requirementKey} />)}
        </section>
      })}
    </div> : null}

    <div className="live-readiness-no-actions"><ShieldCheck size={18} /><div><strong>Read-only governance workspace</strong><span>Approval evidence is service-only and append-only. Raw documents, reviewer identities and credentials are not exposed or stored here.</span></div></div>
  </section>
}

