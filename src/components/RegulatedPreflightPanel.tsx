import {
  AlertTriangle,
  Ban,
  Calculator,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  Landmark,
  LockKeyhole,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import { acceptBrokerageDisclosure } from '../lib/queries/brokerageReadiness'
import {
  createRegulatedPreflight,
  getRegulatedPreflightWorkspace,
  type RegulatedPreflightReview,
  type RegulatedPreflightWorkspace,
} from '../lib/queries/regulatedPreflight'

const money = (value: number | null, currency: string) => value === null
  ? 'Unavailable'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)

const label = (value: string) => value.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())

function ReviewEvidence({ review }: { review: RegulatedPreflightReview | null }) {
  const checks = [
    {
      title: 'Jurisdiction eligibility',
      value: review ? label(review.eligibilityStatus) : 'Not evaluated',
      detail: 'Requires verified residency, identity, sanctions and an explicit instrument policy.',
      icon: Landmark,
      tone: review?.eligibilityStatus === 'policy_match' ? 'evidence' : 'blocked',
    },
    {
      title: 'Current disclosures',
      value: review ? label(review.disclosureStatus) : 'Not evaluated',
      detail: 'Only exact current disclosure versions count as accepted.',
      icon: FileCheck2,
      tone: review?.disclosureStatus === 'complete' ? 'evidence' : 'blocked',
    },
    {
      title: 'Suitability',
      value: review ? label(review.suitabilityStatus) : 'Not evaluated',
      detail: 'Browser input cannot approve or alter the compliance-managed outcome.',
      icon: Scale,
      tone: review?.suitabilityStatus === 'suitable' ? 'evidence' : 'blocked',
    },
    {
      title: 'Market state',
      value: review ? `Session ${label(review.marketSessionStatus)}` : 'Not evaluated',
      detail: review ? `Reference data: ${label(review.referenceDataStatus)}. A quote never proves the market is open.` : 'Market session and reference freshness are evaluated separately.',
      icon: Clock3,
      tone: 'blocked',
    },
    {
      title: 'Total cost',
      value: review ? label(review.costStatus) : 'Not evaluated',
      detail: 'Broker fees, taxes and FX costs remain unknown until approved schedules are configured.',
      icon: Calculator,
      tone: 'blocked',
    },
    {
      title: 'Risk preview',
      value: review ? label(review.riskStatus) : 'Not evaluated',
      detail: review ? `Maximum order value: ${money(review.estimatedNotional, review.quoteCurrency)}. Loss capacity and concentration still require review.` : 'Shows bounded exposure evidence without granting permission.',
      icon: Gauge,
      tone: 'blocked',
    },
  ]

  return <div className="preflight-evidence-grid" aria-label="Regulated preflight evidence">
    {checks.map((check) => {
      const Icon = check.icon
      return <article className={check.tone} key={check.title}>
        <Icon size={19} />
        <div><span>{check.title}</span><strong>{check.value}</strong><small>{check.detail}</small></div>
      </article>
    })}
  </div>
}

export function RegulatedPreflightPanel() {
  const { session, loading: authLoading } = useAuth()
  const [workspace, setWorkspace] = useState<RegulatedPreflightWorkspace | null>(null)
  const [latest, setLatest] = useState<RegulatedPreflightReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [instrumentId, setInstrumentId] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [quantity, setQuantity] = useState('1')
  const [limitPrice, setLimitPrice] = useState('')

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const next = await getRegulatedPreflightWorkspace()
      setWorkspace(next)
      setInstrumentId((current) => current || String(next.instruments[0]?.id ?? ''))
      setError(null)
    } catch {
      setError('Regulated preflight evidence could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { void refresh() }, [refresh])

  const currentDisclosures = useMemo(
    () => workspace?.disclosures.filter((item) => !item.acceptedAt) ?? [],
    [workspace],
  )

  const acceptDisclosure = async (id: string) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await acceptBrokerageDisclosure(id)
      setMessage('Current disclosure version accepted and recorded privately.')
      await refresh()
    } catch {
      setError('The disclosure acknowledgement could not be recorded.')
    } finally {
      setLoading(false)
    }
  }

  const runPreflight = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const review = await createRegulatedPreflight({
        instrumentId: Number(instrumentId),
        side,
        orderType,
        quantity: Number(quantity),
        limitPrice: orderType === 'limit' ? Number(limitPrice) : null,
        clientRequestId: crypto.randomUUID(),
      })
      setLatest(review)
      setMessage('Preflight evidence saved. No order was created, submitted or routed.')
      await refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The regulated preflight could not be completed.')
    } finally {
      setLoading(false)
    }
  }

  return <section className="panel regulated-preflight-panel">
    <div className="panel-header">
      <div><p className="eyebrow">Regulated trading · Phase 6A</p><h2>Review every gate before any future order</h2></div>
      <span className="status-badge preflight-lock"><LockKeyhole size={14} /> No order submission</span>
    </div>
    <p className="panel-description">
      Evaluate server-held eligibility, exact disclosures, suitability, reference freshness, total-cost availability and risk evidence. A preflight is not advice, approval, an order or a broker instruction.
    </p>
    <div className="preflight-boundary" role="status">
      <Ban size={20} />
      <div><strong>Execution remains impossible</strong><span>Every saved review is database-constrained to blocked and executable = false. Funding, custody and payment movement are absent.</span></div>
      <small>{workspace?.policyVersion ?? 'regulated-preflight-v1'}</small>
    </div>

    {authLoading ? <div className="preflight-empty"><RefreshCw size={18} /> Checking secure session…</div> : null}
    {!authLoading && !session ? <div className="preflight-empty">
      <ShieldCheck size={24} />
      <div><strong>Your preflight evidence is private.</strong><span>Sign in through Paper Investing, then return to review a non-executable preflight.</span></div>
      <a className="secondary-button" href="#paper-investing">Go to secure sign-in</a>
    </div> : null}

    {session ? <>
      {error ? <p className="error-message" role="alert"><AlertTriangle size={15} /> {error}</p> : null}
      {message ? <p className="success-message" role="status"><CheckCircle2 size={15} /> {message}</p> : null}
      {!workspace ? <div className="preflight-empty"><RefreshCw size={18} /> Loading regulated preflight…</div> : <>
        <ReviewEvidence review={latest} />

        <div className="preflight-workspace-grid">
          <form className="preflight-form" onSubmit={runPreflight}>
            <div className="preflight-section-head"><div><span>Server-evaluated evidence</span><strong>Create a blocked preflight review</strong></div><ShieldCheck size={19} /></div>
            <label><span>Covered instrument</span><select value={instrumentId} onChange={(event) => setInstrumentId(event.target.value)}>
              {workspace.instruments.map((item) => <option value={item.id} key={item.id}>{item.symbol} · {item.name} · {item.quoteCurrency}</option>)}
            </select></label>
            <div className="preflight-form-row">
              <label><span>Side to review</span><select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')}><option value="buy">Buy review</option><option value="sell">Sell review</option></select></label>
              <label><span>Order style</span><select value={orderType} onChange={(event) => setOrderType(event.target.value as 'market' | 'limit')}><option value="market">Market reference</option><option value="limit">Limit reference</option></select></label>
            </div>
            <div className="preflight-form-row">
              <label><span>Quantity</span><input type="number" min="0.00000001" max="1000000" step="any" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
              {orderType === 'limit' ? <label><span>Limit price</span><input type="number" min="0.00000001" step="any" required value={limitPrice} onChange={(event) => setLimitPrice(event.target.value)} /></label> : <div className="preflight-form-note"><Clock3 size={16} /> Latest verified reference requested</div>}
            </div>
            <button className="primary-button" type="submit" disabled={loading || !instrumentId || Number(quantity) <= 0 || (orderType === 'limit' && Number(limitPrice) <= 0)}>
              <ShieldCheck size={16} /> Run regulated preflight
            </button>
            <small>No cash is reserved. No order or broker instruction is created.</small>
          </form>

          <section className="preflight-result" aria-live="polite">
            <div className="preflight-section-head"><div><span>Decision evidence</span><strong>{latest ? 'Blocked review result' : 'Awaiting review'}</strong></div><Ban size={19} /></div>
            {latest ? <>
              <div className="preflight-result-values">
                <div><span>Reference</span><strong>{money(latest.referencePrice, latest.quoteCurrency)}</strong></div>
                <div><span>Notional</span><strong>{money(latest.estimatedNotional, latest.quoteCurrency)}</strong></div>
                <div><span>Total cost</span><strong>Unavailable</strong></div>
              </div>
              <div className="preflight-blockers"><strong>{latest.blockReasons.length} blocking controls</strong>{latest.blockReasons.map((item) => <article key={item.code}><Ban size={14} /><div><span>{item.message}</span><small>{label(item.owner)} · {item.code}</small></div></article>)}</div>
            </> : <p className="preflight-placeholder">Run a review to see each governed status. The result will remain blocked even when an individual evidence item matches policy.</p>}
          </section>
        </div>

        <section className="preflight-disclosures" aria-labelledby="preflight-disclosures-heading">
          <div className="preflight-section-head"><div><span>Exact-version clickwrap</span><strong id="preflight-disclosures-heading">Required disclosure evidence</strong></div><FileCheck2 size={19} /></div>
          {currentDisclosures.length === 0 ? <p><CheckCircle2 size={16} /> Every current disclosure version is recorded.</p> : currentDisclosures.map((item) => <article key={item.id}>
            <div><strong>{item.title}</strong><span>{item.summary}</span></div>
            <button type="button" className="secondary-button" disabled={loading} onClick={() => void acceptDisclosure(item.id)}>Review and accept v{item.version}</button>
          </article>)}
        </section>

        {workspace.reviews.length ? <section className="preflight-history" aria-labelledby="preflight-history-heading">
          <div className="preflight-section-head"><div><span>Private audit history</span><strong id="preflight-history-heading">Recent blocked reviews</strong></div><Clock3 size={19} /></div>
          {workspace.reviews.slice(0, 5).map((item) => <article key={item.id}><div><strong>{item.symbol ?? `Instrument ${item.instrumentId}`}</strong><span>{label(item.side)} · {item.quantity} · {money(item.estimatedNotional, item.quoteCurrency)}</span></div><small><Ban size={12} /> Blocked · {new Date(item.createdAt).toLocaleString()}</small></article>)}
        </section> : null}
      </>}
    </> : null}
  </section>
}
