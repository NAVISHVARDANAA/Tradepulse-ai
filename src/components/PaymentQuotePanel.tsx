import { AlertTriangle, ArrowRight, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import { evaluateBeneficiaryProtection } from '../lib/beneficiaryProtection'
import { createCorridorIntelligenceQuote } from '../lib/payments'
import type { BeneficiaryProtectionRule, MarketAssetSnapshot, PaymentCorridorRoute } from '../types/domain'

type PaymentQuotePanelProps = {
  routes: PaymentCorridorRoute[]
  beneficiaryProtectionRules: BeneficiaryProtectionRule[]
  marketAssets: MarketAssetSnapshot[]
  loading: boolean
  error: string | null
}

const beneficiaryScenarios = [
  {
    id: 'trusted-returning',
    label: 'Returning payee · no risk signal',
    description: 'A synthetic returning-payee scenario with no selected protection signal.',
    signals: [],
  },
  {
    id: 'possible-duplicate',
    label: 'Possible duplicate profile',
    description: 'A privacy-preserving synthetic fingerprint matches an existing profile.',
    signals: ['duplicate_identity'],
  },
  {
    id: 'changed-invoice',
    label: 'Changed invoice instructions',
    description: 'Payment details changed recently and arrived through an unverified channel.',
    signals: ['recent_details_change', 'unverified_channel_change'],
  },
  {
    id: 'urgent-request',
    label: 'Urgent mismatched request',
    description: 'The recipient name does not match and the sender is pressured to act secretly.',
    signals: ['name_mismatch', 'social_engineering_pressure'],
  },
  {
    id: 'incomplete-first-time',
    label: 'Incomplete first-time profile',
    description: 'Required details are incomplete and the synthetic context is elevated risk.',
    signals: ['details_incomplete', 'first_time_high_risk'],
  },
]

const decisionLabel = {
  clear_rehearsal: 'No rule triggered',
  manual_review: 'Manual review required',
  cooling_off: 'Protection pause required',
  blocked: 'Blocked',
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
  beneficiaryProtectionRules,
  marketAssets,
  loading,
  error,
}: PaymentQuotePanelProps) {
  const [corridorCode, setCorridorCode] = useState('')
  const [amount, setAmount] = useState('1000')
  const [beneficiaryScenarioId, setBeneficiaryScenarioId] = useState('changed-invoice')
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
  const beneficiaryScenario = beneficiaryScenarios.find((scenario) => scenario.id === beneficiaryScenarioId)
    ?? beneficiaryScenarios[0]
  const protectionResult = useMemo(
    () => evaluateBeneficiaryProtection(beneficiaryScenario.signals, beneficiaryProtectionRules),
    [beneficiaryProtectionRules, beneficiaryScenario],
  )

  return <section className="panel payment-panel corridor-intelligence-panel">
    <div className="panel-header">
      <div>
        <p className="eyebrow">Cross-border payments · Phase 7B</p>
        <h2>Beneficiary protection and corridor intelligence</h2>
      </div>
      <span className="status-badge sandbox"><LockKeyhole size={14} /> Reference only · no money movement</span>
    </div>
    <p className="panel-description">
      Rehearse beneficiary safety interventions without personal data, then compare sandbox route models against the synchronized FX reference.
    </p>

    <div className="corridor-intelligence-boundary" role="status">
      <LockKeyhole size={20} />
      <div><strong>No beneficiary can be created and no route can be paid from this workspace.</strong><span>Real beneficiary collection, identifier storage, provider validation, override, quote acceptance, transfers and settlement remain database-locked off.</span></div>
    </div>

    <section className="beneficiary-protection" aria-labelledby="beneficiary-protection-title">
      <div className="beneficiary-protection-head">
        <div><span><ShieldCheck size={18} /> Synthetic safety rehearsal</span><h3 id="beneficiary-protection-title">See the intervention before the payment</h3></div>
        <small>No names, accounts or addresses</small>
      </div>
      <p>Select a synthetic situation to see how validation, duplicate detection, cooling-off and scam rules interact. Nothing is saved or sent.</p>
      <label className="beneficiary-scenario" htmlFor="beneficiary-scenario"><span>Rehearsal scenario</span><select
        id="beneficiary-scenario"
        value={beneficiaryScenario.id}
        onChange={(event) => setBeneficiaryScenarioId(event.target.value)}
        disabled={loading || beneficiaryProtectionRules.length === 0}
      >{beneficiaryScenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select><small>{beneficiaryScenario.description}</small></label>

      {loading ? <div className="beneficiary-data-state"><RefreshCw size={18} /> Loading synthetic protection rules…</div> : null}
      {!loading && error ? <div className="beneficiary-data-state" role="alert"><AlertTriangle size={18} /> Protection rules are unavailable, so no safety outcome is shown.</div> : null}
      {!loading && !error && beneficiaryProtectionRules.length === 0 ? <div className="beneficiary-data-state" role="status"><AlertTriangle size={18} /> No protection rule is available. No result is shown.</div> : null}
      {!loading && !error && beneficiaryProtectionRules.length > 0 ? <>
        <div className={`beneficiary-decision ${protectionResult.decision}`} role="status">
        <div><span>Protection outcome</span><strong>{decisionLabel[protectionResult.decision]}</strong></div>
        {protectionResult.coolingOffHours > 0 ? <div><span>Mandatory pause</span><strong>{protectionResult.coolingOffHours} hours</strong></div> : null}
        <p>{protectionResult.summary}</p>
        </div>

        <div className="beneficiary-rule-grid" aria-label="Triggered beneficiary protection rules">
        {protectionResult.matchedRules.length === 0 ? <div className="beneficiary-no-rule"><ShieldCheck size={18} /><span><strong>No selected signal matched.</strong> This synthetic result is informational and cannot create a beneficiary.</span></div> : protectionResult.matchedRules.map((rule) => <article key={rule.ruleCode} className={`beneficiary-rule ${rule.severity}`}>
          <div><span>{rule.category.replace('_', ' ')}</span><small>{rule.severity}</small></div>
          <h4>{rule.title}</h4>
          <p>{rule.customerMessage}</p>
          <footer><strong>Required response</strong><span>{rule.requiredAction}</span></footer>
        </article>)}
        </div>
        <div className="beneficiary-locks"><LockKeyhole size={15} /><span>Duplicate overrides and cooling-off bypasses are unavailable. Real beneficiary data is neither requested nor stored.</span></div>
      </> : null}
    </section>

    <div className="corridor-section-heading"><span>Phase 7A foundation</span><h3>Transparent corridor intelligence</h3><p>Compare sandbox provider models, known costs and explicit unknowns. No route is selectable.</p></div>

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
