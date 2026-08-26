import { CheckCircle2, Clock3, CreditCard, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth/AuthProvider'
import { getCommercialCatalog, getCommercialSummary, startProTrial, type CommercialPlan, type CommercialSummary, type Entitlement } from '../lib/queries/monetization'

const names: Record<string,string> = { watchlists:'Watchlists',watchlist_assets:'Watchlist assets',market_alerts:'Alerts',paper_portfolios:'Paper portfolios',daily_briefs:'Daily briefs',advanced_research:'Advanced research' }

export function MonetizationPanel() {
  const { session } = useAuth()
  const [plans,setPlans]=useState<CommercialPlan[]>([])
  const [entitlements,setEntitlements]=useState<Entitlement[]>([])
  const [summary,setSummary]=useState<CommercialSummary|null>(null)
  const [currency,setCurrency]=useState<'USD'|'GBP'>('USD')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [message,setMessage]=useState<string|null>(null)

  const refresh=useCallback(async()=>{setLoading(true);try{const catalog=await getCommercialCatalog();setPlans(catalog.plans);setEntitlements(catalog.entitlements);setSummary(session?await getCommercialSummary():null);setError(null)}catch{setError('Commercial plans are temporarily unavailable.')}finally{setLoading(false)}},[session])
  useEffect(()=>{void refresh()},[refresh])
  const trial=async()=>{setLoading(true);setError(null);try{await startProTrial();await refresh();setMessage('Your one-time Pro trial is active. No payment method was collected.')}catch(trialError){setError(trialError instanceof Error&&trialError.message.includes('unavailable')?'The introductory trial has already been used or is unavailable.':'The trial could not be started safely.')}finally{setLoading(false)}}

  return <section className="panel monetization-panel">
    <div className="panel-header"><div><p className="eyebrow">Plans + entitlements · Phase 4N</p><h2>Grow with clear limits</h2></div><span className="status-badge"><LockKeyhole size={14}/> Checkout locked</span></div>
    <p className="panel-description">Compare transparent product capacity. Prices are catalog guidance; billing, tax collection and charge execution remain disabled.</p>
    <div className="currency-switch" role="group" aria-label="Display currency"><button className={currency==='USD'?'active':''} onClick={()=>setCurrency('USD')}>USD</button><button className={currency==='GBP'?'active':''} onClick={()=>setCurrency('GBP')}>GBP</button></div>
    {error&&<p className="error-message" role="alert">{error}</p>}{message&&<p className="success-message" role="status">{message}</p>}
    {loading&&!plans.length?<p role="status"><LoaderCircle className="spinning" size={16}/> Loading plans…</p>:<div className="pricing-grid">{plans.map(plan=><article key={plan.code} className={`pricing-card ${summary?.subscription.planCode===plan.code?'current':''}`}><div><h3>{plan.name}</h3>{summary?.subscription.planCode===plan.code?<span>Current</span>:null}</div><strong className="plan-price">{currency==='USD'?'$':'£'}{currency==='USD'?plan.monthlyPriceUsd:plan.monthlyPriceGbp}<small>/month</small></strong><p>{plan.description}</p><ul>{entitlements.filter(item=>item.planCode===plan.code).map(item=><li key={item.code}><CheckCircle2 size={14}/>{names[item.code]??item.name}: {item.unit==='boolean'?(item.allowance?'Included':'Not included'):item.allowance}</li>)}</ul>{plan.code==='pro'&&session&&summary?.subscription.status==='free'?<button className="primary-button" disabled={loading} onClick={()=>void trial()}><Sparkles size={16}/> Start {plan.trialDays}-day trial</button>:null}{plan.code==='business'?<button className="secondary-button" disabled><CreditCard size={16}/> Contact sales — coming later</button>:null}</article>)}</div>}
    {session&&summary?<div className="commercial-summary"><div><strong>Access state</strong><span>{summary.subscription.planCode} · {summary.subscription.status}</span></div><div><strong>Trial/period end</strong><span>{summary.subscription.trialEndsAt?new Date(summary.subscription.trialEndsAt).toLocaleDateString():'Not applicable'}</span></div><div><strong>Billing provider</strong><span>{summary.providerCode==='unselected'?'Not selected':summary.providerCode}</span></div><div><strong>Payment execution</strong><span>{summary.chargeCollectionEnabled?'Enabled':'Disabled'}</span></div></div>:null}
    <p className="data-source-note"><Clock3 size={14}/> Expired trials automatically return to Free. No card, bank account, checkout session, charge, refund or fund movement is created by this release.</p>
  </section>
}
