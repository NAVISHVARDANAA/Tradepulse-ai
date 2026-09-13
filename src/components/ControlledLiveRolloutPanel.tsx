import { AlertTriangle, Ban, ClipboardCheck, Gauge, Globe2, LoaderCircle, RotateCcw, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getControlledLiveRollout, type ControlledLiveRollout } from '../lib/queries/controlledLiveRollout'

const money = (value: number, currency: string) => new Intl.NumberFormat('en-US',{ style:'currency',currency,maximumFractionDigits:0 }).format(value)

export function ControlledLiveRolloutPanel() {
  const [rollout,setRollout] = useState<ControlledLiveRollout | null>(null)
  const [selected,setSelected] = useState('')
  const [error,setError] = useState<string | null>(null)
  useEffect(() => { let active=true; void getControlledLiveRollout().then((next) => {
    if (!active) return; setRollout(next); setSelected(next.cohorts[0]?.cohortKey ?? '')
  }).catch((cause) => active && setError(cause instanceof Error ? cause.message : 'Controlled rollout is unavailable.'))
  return () => { active=false } },[])
  if (!rollout) return <section className="panel rollout-panel" role={error?'alert':'status'}>
    {error ? <><AlertTriangle />{error}</> : <><LoaderCircle className="spinning" />Loading controlled rollout evidence…</>}
  </section>
  const cohort=rollout.cohorts.find((item)=>item.cohortKey===selected)
  const limits=rollout.limits.find((item)=>item.cohortKey===selected)
  return <section className="panel rollout-panel">
    <div className="panel-header"><div><p className="eyebrow">Controlled international rollout · Phase 8G</p>
      <h2>Live rollout control plane</h2><p>Exact cash-equity candidates, independent approval gaps, conservative limit rehearsals and rollback evidence.</p></div>
      <span className="status-badge warning"><ShieldCheck size={15}/> Approval required</span></div>
    <div className="rollout-boundary" role="note"><Ban/><div><strong>No live order endpoint exists in Phase 8G</strong>
      <span>Code and complete-looking evidence cannot activate a cohort. Exact signed approvals, observed drills and a later reviewed migration are required.</span></div><small>{rollout.status.policyVersion}</small></div>
    <div className="rollout-summary">
      <article><Globe2/><span>Candidate cohorts</span><strong>{rollout.status.candidateCohortCount}</strong><small>Independently blocked</small></article>
      <article><Users/><span>Live cohorts</span><strong>{rollout.status.liveCohortCount}</strong><small>No customer eligible</small></article>
      <article><ShieldCheck/><span>Product scope</span><strong>Cash equity</strong><small>Options excluded</small></article>
      <article><ClipboardCheck/><span>Approval gates</span><strong>{rollout.status.requirementCount}</strong><small>Per cohort</small></article>
    </div>
    <section><div className="paper-subheader"><strong>Exact cohort eligibility ledger</strong><span>Approval for one row never propagates</span></div>
      <div className="rollout-cohorts">{rollout.cohorts.map((item)=><button type="button" key={item.cohortKey}
        className={selected===item.cohortKey?'selected':''} aria-pressed={selected===item.cohortKey} onClick={()=>setSelected(item.cohortKey)}>
        <span>{item.residencyCountry} resident · {item.settlementCurrency}</span><strong>{item.micCode} · {item.venueName}</strong>
        <small>{item.maximumCustomerCount} maximum candidates · {item.activationStatus}</small><em>{item.openScopeDecisionCount}/10 scope decisions open</em></button>)}</div>
    </section>
    {cohort && limits ? <div className="rollout-details">
      <section><h3><Globe2/> Selected candidate scope</h3><dl>
        <div><dt>Residency</dt><dd>{cohort.residencyCountry}</dd></div><div><dt>Venue</dt><dd>{cohort.micCode}</dd></div>
        <div><dt>Account</dt><dd>{cohort.accountType}</dd></div><div><dt>Asset</dt><dd>{cohort.assetClass}</dd></div>
        <div><dt>Order types</dt><dd>{cohort.allowedOrderTypes.join(' + ')}</dd></div><div><dt>Blocking gates</dt><dd>{cohort.blockingGateCount}/{cohort.gateCount}</dd></div>
      </dl></section>
      <section><h3><Gauge/> Conservative limit rehearsal</h3><dl>
        <div><dt>Order notional</dt><dd>{money(limits.maximumOrderNotional,limits.settlementCurrency)}</dd></div>
        <div><dt>Daily notional</dt><dd>{money(limits.maximumDailyNotional,limits.settlementCurrency)}</dd></div>
        <div><dt>Concentration</dt><dd>{limits.maximumPositionConcentrationPct}%</dd></div>
        <div><dt>Velocity</dt><dd>{limits.maximumOrdersPerWindow}/{limits.velocityWindowMinutes} min</dd></div>
        <div><dt>Open orders</dt><dd>{limits.maximumOpenOrders}</dd></div><div><dt>Funding credit</dt><dd>{money(limits.maximumFundingCredit,limits.settlementCurrency)}</dd></div>
      </dl></section></div> : null}
    <div className="rollout-reviews"><section><div className="paper-subheader"><strong>Operational exit gates</strong><span>All blocking</span></div>
      <div className="rollout-list">{rollout.gates.map((gate)=><article key={gate.requirementKey}><AlertTriangle/><div><strong>{gate.title}</strong><span>{gate.summary}</span></div><small>{gate.blockingReviewCount}/{gate.cohortReviewCount}</small></article>)}</div></section>
      <section><div className="paper-subheader"><strong>Operational drills</strong><span>{rollout.status.observedDrillCount} observed</span></div>
      <div className="rollout-list">{rollout.drills.map((drill)=><article key={drill.drillKey}><RotateCcw/><div><strong>{drill.title}</strong><span>{drill.objective}</span><small>{drill.successCriteria.join(' · ')}</small></div><em>Not observed</em></article>)}</div>
      <div className="rollout-exit"><ShieldCheck/><div><strong>Exit gate remains closed</strong><span>Signed decisions, current evidence, observed drills, reconciled ledgers and tested rollback must all pass together.</span></div></div></section></div>
    <p className="rollout-footnote">Candidates are review scopes—not market availability or customer eligibility. Broker, exchange, funding, custody, settlement, margin and options remain disabled.</p>
  </section>
}
