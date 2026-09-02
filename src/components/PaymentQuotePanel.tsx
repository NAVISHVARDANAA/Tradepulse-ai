import { AlertTriangle, ArrowRight, LockKeyhole, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { createCorridorIntelligenceQuote } from '../lib/payments'
import type { MarketAssetSnapshot, PaymentCorridorRoute } from '../types/domain'

type PaymentQuotePanelProps = {
  routes: PaymentCorridorRoute[]
  marketAssets: MarketAssetSnapshot[]
  loading: boolean
  error: string | null
}

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const rate = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })
const currency = (value: number, code: string) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: code,
  maximumFractionDigits: 2,
}).format(value)

const freshness = (age: number | null) => {
  if (age === null) return 'Timestamp unavailable'
  if (age < 1) return 'Observed less than 1 minute ago'
  if (age < 60) return `Observed ${Math.round(age)} minutes ago`
  return `Observed ${Math.round(age / 60)} hours ago`
}

export function PaymentQuotePanel({
  routes,
  marketAssets,
  loading,
  error,
}: PaymentQuotePanelProps) {
  const [corridorCode, setCorridorCode] = useState('')
  const [amount, setAmount] = useState('1000')
  const corridorCodes = useMemo(
    () => [...new Set(routes.map((routeOption) => routeOption.corridorCode))],
    [routes],
  )
  const selectedCode = corridorCodes.includes(corridorCode)
    ? corridorCode
    : corridorCodes[0]
  const selectedRoutes = routes.filter((routeOption) => routeOption.corridorCode === selectedCode)
  const sourceAmount = Number(amount)
  const comparisons = useMemo(
    () => selectedRoutes.map((routeOption) => ({
      route: routeOption,
      quote: createCorridorIntelligenceQuote(sourceAmount, routeOption, marketAssets),
    })),
    [marketAssets, selectedRoutes, sourceAmount],
  )
  const reference = comparisons.find((comparison) => comparison.quote)?.quote ?? null
  const selectedRoute = selectedRoutes[0]

  return <section className="panel payment-panel corridor-intelligence-panel">
    <div className="panel-header">
      <div>
        <p className="eyebrow">Cross-border payments · Phase 7A</p>
        <h2>Transparent corridor intelligence</h2>
      </div>
      <span className="status-badge sandbox"><LockKeyhole size={14} /> Reference only · no money movement</span>
    </div>
    <p className="panel-description">
      Compare sandbox provider models against the synchronized FX reference. Every visible spread, known fee, tax gap, delivery estimate and route limitation stays explicit.
    </p>

    <div className="corridor-intelligence-boundary" role="status">
      <LockKeyhole size={20} />
      <div><strong>No route can be selected or paid from this workspace.</strong><span>Provider connectivity, beneficiary collection, quote acceptance, transfers and settlement remain database-locked off.</span></div>
    </div>

    <div className="corridor-intelligence-inputs">
      <label htmlFor="corridor"><span>Payment corridor</span><select
        id="corridor"
        value={selectedCode ?? ''}
        onChange={(event) => setCorridorCode(event.target.value)}
        disabled={loading || corridorCodes.length === 0}
      >{corridorCodes.map((code) => {
        const corridor = routes.find((routeOption) => routeOption.corridorCode === code)
        return <option key={code} value={code}>{corridor?.sourceCurrency} → {corridor?.destinationCurrency}</option>
      })}</select></label>
      <label htmlFor="source-amount"><span>You send</span><div className="amount-input"><input
        id="source-amount"
        type="number"
        min="1"
        max="1000000"
        step="0.01"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      /><span>{selectedRoute?.sourceCurrency ?? '—'}</span></div></label>
    </div>

    {loading ? <div className="quote-empty"><RefreshCw size={20} /> Loading corridor models…</div> : null}
    {error ? <div className="quote-empty" role="alert">{error}</div> : null}
    {!loading && !error && routes.length === 0 ? <div className="quote-empty">No reference corridor model is enabled.</div> : null}
    {!loading && !error && routes.length > 0 && !reference ? <div className="quote-empty">
      A synchronized {selectedRoute?.fxSymbol} reference rate and a source amount from 1 to 1,000,000 are required.
    </div> : null}

    {reference ? <>
      <div className="corridor-reference-summary">
        <article><span>Reference rate</span><strong>{rate.format(reference.referenceRate)}</strong><small>{selectedRoute.fxSymbol}</small></article>
        <article><span>Reference value</span><strong>{currency(reference.referenceDestinationAmount, selectedRoute.destinationCurrency)}</strong><small>Before any route costs</small></article>
        <article className={reference.referenceFresh ? 'current' : 'stale'}><span>Reference freshness</span><strong>{reference.referenceFresh ? 'Current' : 'Stale'}</strong><small>{freshness(reference.referenceAgeMinutes)}</small></article>
        <article><span>Route models</span><strong>{comparisons.length}</strong><small>Automatic selection disabled</small></article>
      </div>

      <div className="corridor-tax-warning">
        <AlertTriangle size={19} /><div><strong>Tax unavailable—not shown as zero</strong><span>{selectedRoute.taxExplanation} Delivered amounts below are therefore displayed before unknown tax.</span></div>
      </div>

      <div className="corridor-route-grid" aria-label="Reference-only corridor route comparison">
        {comparisons.map(({ route: routeOption, quote }) => quote ? <article className="corridor-route-card" key={routeOption.routeCode}>
          <div className="corridor-route-head"><div><span>{routeOption.deliveryTier} model</span><strong>{routeOption.providerLabel}</strong></div><small>{routeOption.availability.replace('_', ' ')}</small></div>
          <div className="corridor-route-amount"><span>Estimated delivered before unknown tax</span><strong>{currency(quote.destinationAmount, routeOption.destinationCurrency)}</strong></div>
          <div className="quote-route"><span>{number.format(quote.sourceAmount)} {routeOption.sourceCurrency}</span><ArrowRight size={16} /><span>{number.format(quote.destinationAmount)} {routeOption.destinationCurrency}</span></div>
          <dl className="corridor-route-breakdown">
            <div><dt>Sandbox provider-model rate</dt><dd>{rate.format(quote.providerRate)}</dd></div>
            <div><dt>FX spread</dt><dd>{number.format(quote.providerSpreadBps)} bps</dd></div>
            <div><dt>Variable fee</dt><dd>{currency(quote.variableFee, routeOption.sourceCurrency)}</dd></div>
            <div><dt>Fixed fee</dt><dd>{currency(quote.fixedFee, routeOption.sourceCurrency)}</dd></div>
            <div><dt>Known fees</dt><dd>{currency(quote.knownFees, routeOption.sourceCurrency)}</dd></div>
            <div className="unknown"><dt>Tax</dt><dd>Unavailable</dd></div>
            <div><dt>FX spread cost</dt><dd>{currency(quote.fxSpreadCostDestination, routeOption.destinationCurrency)}</dd></div>
            <div><dt>Effective rate before tax</dt><dd>{rate.format(quote.effectiveRate)}</dd></div>
            <div><dt>Estimated delivery</dt><dd>{routeOption.etaMinMinutes}–{routeOption.etaMaxMinutes} min</dd></div>
          </dl>
          <p className="corridor-route-limit"><LockKeyhole size={14} /> {routeOption.availabilityReason}</p>
        </article> : null)}
      </div>
    </> : null}
  </section>
}
