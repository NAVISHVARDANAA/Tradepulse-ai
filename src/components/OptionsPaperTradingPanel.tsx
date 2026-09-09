import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpenCheck, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'

import { useAuth } from '../lib/auth/AuthProvider'
import { getPaperPortfolios, type PaperPortfolio } from '../lib/queries/paperTrading'
import {
  buildOptionsStrategyPreview,
  createOptionsPaperStrategy,
  getOptionsPaperChain,
  getOptionsPaperSnapshot,
  initializeOptionsPaperAccount,
  reconcileOptionsPaperPortfolio,
  simulateOptionsPaperEvent,
  type OptionsChainContract,
  type OptionsEventType,
  type OptionsPaperSnapshot,
  type OptionsStrategyType,
} from '../lib/queries/optionsPaperTrading'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const strategyLabels: Record<OptionsStrategyType, string> = {
  long_call: 'Long call',
  long_put: 'Long put',
  bull_call_spread: 'Bull call debit spread',
  bear_put_spread: 'Bear put debit spread',
}

const eventLabels: Record<OptionsEventType, string> = {
  expiration: 'Expiration',
  exercise: 'Exercise',
  assignment: 'Protected assignment',
  early_assignment: 'Early-assignment risk',
  corporate_action: 'Corporate-action adjustment',
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The options education simulation could not be completed.'
}

function PayoffDiagram({ points }: { points: Array<{ price: number; profitLoss: number }> }) {
  const width = 420
  const height = 150
  const padding = 18
  const values = points.map((point) => point.profitLoss)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = Math.max(max - min, 1)
  const y = (value: number) => padding + ((max - value) / span) * (height - padding * 2)
  const x = (index: number) => padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.profitLoss)}`).join(' ')

  return (
    <div className="options-payoff-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Estimated profit and loss payoff across deterministic underlying prices">
        <line x1={padding} x2={width - padding} y1={y(0)} y2={y(0)} className="options-zero-line" />
        <path d={path} className="options-payoff-line" />
        {points.map((point, index) => <circle key={point.price} cx={x(index)} cy={y(point.profitLoss)} r="3" />)}
      </svg>
      <div className="options-payoff-axis"><span>{number.format(points[0]?.price ?? 0)}</span><span>Underlying scenario price</span><span>{number.format(points[points.length - 1]?.price ?? 0)}</span></div>
    </div>
  )
}

export function OptionsPaperTradingPanel() {
  const { session, loading: authLoading } = useAuth()
  const [chain, setChain] = useState<OptionsChainContract[]>([])
  const [portfolios, setPortfolios] = useState<PaperPortfolio[]>([])
  const [portfolioId, setPortfolioId] = useState('')
  const [snapshot, setSnapshot] = useState<OptionsPaperSnapshot | null>(null)
  const [underlying, setUnderlying] = useState('AAPL')
  const [strategyType, setStrategyType] = useState<OptionsStrategyType>('bull_call_spread')
  const [contracts, setContracts] = useState('1')
  const [startingCash, setStartingCash] = useState('100000')
  const [experienceLevel, setExperienceLevel] = useState('beginner')
  const [objective, setObjective] = useState('education')
  const [lossTolerance, setLossTolerance] = useState('low')
  const [jurisdictionCode, setJurisdictionCode] = useState('IN')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [eventType, setEventType] = useState<OptionsEventType>('expiration')
  const [settlementPrice, setSettlementPrice] = useState('270')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refresh = async (selectedPortfolio = portfolioId) => {
    if (!selectedPortfolio || !session) {
      setSnapshot(null)
      return
    }
    setSnapshot(await getOptionsPaperSnapshot(selectedPortfolio))
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      getOptionsPaperChain(),
      session ? getPaperPortfolios() : Promise.resolve([] as PaperPortfolio[]),
    ]).then(([nextChain, nextPortfolios]) => {
      if (!active) return
      setChain(nextChain)
      setPortfolios(nextPortfolios)
      const firstPortfolio = nextPortfolios[0]?.id ?? ''
      setPortfolioId((current) => current || firstPortfolio)
      if (nextChain[0]) setUnderlying((current) => current || nextChain[0].underlyingSymbol)
      setError(null)
    }).catch((nextError) => {
      if (active) setError(errorMessage(nextError))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!portfolioId || !session) {
      setSnapshot(null)
      return
    }
    void refresh(portfolioId).catch((nextError) => setError(errorMessage(nextError)))
  }, [portfolioId, session])

  useEffect(() => {
    const first = snapshot?.strategies[0]
    setSelectedStrategyId(first?.id ?? '')
    if (first) setSettlementPrice(String(chain.find((item) => item.underlyingSymbol === first.underlyingSymbol)?.underlyingScenarioPrice ?? 0))
  }, [snapshot?.strategies, chain])

  const symbols = useMemo(() => Array.from(new Set(chain.map((item) => item.underlyingSymbol))), [chain])
  const selectedChain = useMemo(() => chain.filter((item) => item.underlyingSymbol === underlying), [chain, underlying])
  const preview = useMemo(
    () => buildOptionsStrategyPreview(selectedChain, strategyType, Number(contracts)),
    [selectedChain, strategyType, contracts],
  )
  const selectedStrategy = snapshot?.strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null
  const allowedEvents: OptionsEventType[] = selectedStrategy?.protectedShortLegCount
    ? ['expiration', 'exercise', 'assignment', 'early_assignment', 'corporate_action']
    : ['expiration', 'exercise', 'corporate_action']

  useEffect(() => {
    if (!allowedEvents.includes(eventType)) setEventType('expiration')
  }, [selectedStrategyId])

  const run = async (action: () => Promise<unknown>, confirmation: string) => {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await action()
      await refresh()
      setSuccess(confirmation)
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setWorking(false)
    }
  }

  const initialize = (event: FormEvent) => {
    event.preventDefault()
    void run(() => initializeOptionsPaperAccount({
      portfolioId,
      startingCash: Number(startingCash),
      experienceLevel,
      objective,
      lossTolerance,
      jurisdictionCode: jurisdictionCode.toUpperCase(),
    }), 'Your education-only options paper account is ready. No options permission was granted.')
  }

  const saveStrategy = () => {
    if (!preview) return
    void run(() => createOptionsPaperStrategy({
      portfolioId,
      clientStrategyId: `options-${crypto.randomUUID()}`,
      strategyType,
      longContractId: preview.longContract.contractId,
      shortContractId: preview.shortContract?.contractId ?? null,
      contracts: preview.contracts,
    }), 'The defined-risk strategy was saved to the private paper ledger.')
  }

  const simulateEvent = () => {
    if (!selectedStrategy) return
    void run(() => simulateOptionsPaperEvent({
      portfolioId,
      strategyId: selectedStrategy.id,
      clientEventId: `options-event-${crypto.randomUUID()}`,
      eventType,
      settlementPrice: eventType === 'corporate_action' ? null : Number(settlementPrice),
    }), 'The lifecycle event was recorded with a deterministic virtual outcome.')
  }

  return (
    <section className="options-paper-panel" aria-labelledby="options-paper-title">
      <div className="section-header options-paper-header">
        <div><p className="eyebrow">Options education · Phase 8C</p><h2 id="options-paper-title">Defined-risk options paper lab</h2><p>Learn calls, puts and protected debit spreads with deterministic chains, visible Greeks, payoff boundaries and auditable lifecycle rehearsals.</p></div>
        <span className="status-badge sandbox"><ShieldCheck size={15} /> Education-only simulation</span>
      </div>

      <div className="options-paper-lock"><ShieldCheck size={21} /><div><strong>Options permission is never granted here</strong><span>No live chain, broker, margin, real position, uncovered short option, funding, custody or settlement path exists.</span></div></div>

      <div className="options-paper-summary" aria-label="Options simulation boundaries">
        <article><BookOpenCheck size={18} /><span>Supported structures</span><strong>4</strong><small>Long call, long put and two debit spreads</small></article>
        <article><BarChart3 size={18} /><span>Scenario contracts</span><strong>{chain.length || '—'}</strong><small>Deterministic educational fixtures</small></article>
        <article><ShieldCheck size={18} /><span>Loss boundary</span><strong>Defined</strong><small>Maximum loss shown before saving</small></article>
        <article><WalletCards size={18} /><span>Live capability</span><strong>0</strong><small>Paper cash has no monetary value</small></article>
      </div>

      {loading || authLoading ? <div className="paper-list-empty" role="status">Loading the deterministic options lab…</div> : null}

      <div className="options-builder">
        <div className="options-builder-controls">
          <div className="options-builder-title"><BarChart3 size={20} /><div><strong>Educational strategy builder</strong><span>Choose a structure and inspect the complete risk shape before saving anything.</span></div></div>
          <label>Underlying scenario<select value={underlying} onChange={(event) => setUnderlying(event.target.value)}>{symbols.map((symbol) => <option key={symbol}>{symbol}</option>)}</select></label>
          <label>Defined structure<select value={strategyType} onChange={(event) => setStrategyType(event.target.value as OptionsStrategyType)}>{Object.entries(strategyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Contracts<input type="number" min="1" max="100" step="1" value={contracts} onChange={(event) => setContracts(event.target.value)} /></label>
          {preview ? <div className="options-legs"><span>Long</span><strong>{preview.longContract.optionType.toUpperCase()} {number.format(preview.longContract.strike)} @ {number.format(preview.longContract.ask)}</strong>{preview.shortContract ? <><span>Protected short</span><strong>{preview.shortContract.optionType.toUpperCase()} {number.format(preview.shortContract.strike)} @ {number.format(preview.shortContract.bid)}</strong></> : null}</div> : null}
        </div>

        {preview ? <div className="options-risk-preview">
          <div className="options-risk-grid">
            <article><span>Maximum loss</span><strong>{money.format(preview.maxLoss)}</strong><small>Bounded virtual debit</small></article>
            <article><span>Maximum profit</span><strong>{preview.maxProfit === null ? 'Unbounded*' : money.format(preview.maxProfit)}</strong><small>{preview.profitPotential} profit potential</small></article>
            <article><span>Break-even</span><strong>{money.format(preview.breakEven)}</strong><small>At modeled expiration</small></article>
            <article><span>Implied volatility</span><strong>{number.format(preview.longContract.impliedVolatility * 100)}%</strong><small>Scenario context—not a forecast</small></article>
          </div>
          <PayoffDiagram points={preview.payoffPoints} />
          <div className="options-greeks" aria-label="Scenario Greeks"><span>Δ {number.format(preview.longContract.delta)}</span><span>Γ {number.format(preview.longContract.gamma)}</span><span>Θ {number.format(preview.longContract.theta)}</span><span>Vega {number.format(preview.longContract.vega)}</span></div>
          <small>*Long-call upside is mathematically unbounded; its maximum loss remains the premium shown. Greeks and implied volatility are deterministic teaching fixtures.</small>
        </div> : <div className="paper-list-empty">The selected deterministic chain cannot form this structure.</div>}
      </div>

      <div className="options-chain" aria-label="Entitlement-aware deterministic option chain">
        <div className="paper-subheader"><strong>Option chain scenario</strong><span>Educational display permitted · no live display rights</span></div>
        <div className="options-chain-grid">{selectedChain.map((contract) => <article key={contract.contractId}><header><strong>{contract.optionType.toUpperCase()} {number.format(contract.strike)}</strong><span>{contract.freshnessStatus.replace('_', ' ')}</span></header><dl><div><dt>Bid / ask</dt><dd>{number.format(contract.bid)} / {number.format(contract.ask)}</dd></div><div><dt>Volume / OI</dt><dd>{number.format(contract.volume)} / {number.format(contract.openInterest)}</dd></div><div><dt>Expiry</dt><dd>{contract.expiresOn}</dd></div></dl></article>)}</div>
      </div>

      {!session ? <div className="options-paper-signin"><WalletCards size={20} /><div><strong>Private options simulation account required</strong><span>Sign in and select an existing paper portfolio to save strategies or lifecycle events.</span></div><a className="secondary-button" href="#paper-investing">Open Paper investing</a></div>
      : portfolios.length === 0 ? <div className="options-paper-signin"><WalletCards size={20} /><div><strong>Create a private paper portfolio first</strong><span>The options ledger attaches to your existing private paper identity.</span></div><a className="secondary-button" href="#paper-investing">Create paper portfolio</a></div>
      : <div className="options-private-workspace">
          <div className="options-private-toolbar"><label>Paper portfolio<select value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)}>{portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name} · {portfolio.baseCurrency}</option>)}</select></label><span>{snapshot?.initialized ? `${money.format(snapshot.cashBalance)} virtual cash · ${snapshot.assessmentStatus}` : 'Options account not initialized'}</span></div>

          {!snapshot?.initialized ? <form className="options-assessment" onSubmit={initialize}>
            <div className="options-builder-title"><BookOpenCheck size={20} /><div><strong>Complete the education assessment</strong><span>These answers tailor warnings; they never grant live options permission.</span></div></div>
            <label>Experience<select value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)}><option value="none">None</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
            <label>Objective<select value={objective} onChange={(event) => setObjective(event.target.value)}><option value="education">Education</option><option value="hedging">Hedging study</option><option value="income">Income study</option><option value="growth">Growth study</option></select></label>
            <label>Loss tolerance<select value={lossTolerance} onChange={(event) => setLossTolerance(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label>Jurisdiction<input required minLength={2} maxLength={2} value={jurisdictionCode} onChange={(event) => setJurisdictionCode(event.target.value.toUpperCase())} /></label>
            <label>Virtual starting cash<input required type="number" min="1000" max="1000000" step="1000" value={startingCash} onChange={(event) => setStartingCash(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={working}>Create education-only account</button>
          </form>
          : <>
            <div className="options-private-actions">
              <section><div className="options-builder-title"><ShieldCheck size={19} /><div><strong>Save current risk rehearsal</strong><span>The maximum loss is reserved from virtual cash.</span></div></div><div className="options-action-preview"><span>{strategyLabels[strategyType]}</span><strong>{preview ? money.format(preview.maxLoss) : 'Unavailable'} max loss</strong></div><button className="primary-button" type="button" disabled={working || !preview} onClick={saveStrategy}>Save defined-risk simulation</button></section>
              <section><div className="options-builder-title"><RefreshCw size={19} /><div><strong>Lifecycle rehearsal</strong><span>Simulate expiration, exercise, protected assignment or adjustment.</span></div></div><label>Saved strategy<select value={selectedStrategyId} onChange={(event) => setSelectedStrategyId(event.target.value)}><option value="">Select a strategy</option>{snapshot.strategies.filter((strategy) => ['open', 'adjusted'].includes(strategy.lifecycleStatus)).map((strategy) => <option value={strategy.id} key={strategy.id}>{strategyLabels[strategy.strategyType]} · {strategy.underlyingSymbol}</option>)}</select></label><label>Event<select value={eventType} onChange={(event) => setEventType(event.target.value as OptionsEventType)}>{allowedEvents.map((value) => <option key={value} value={value}>{eventLabels[value]}</option>)}</select></label>{eventType !== 'corporate_action' ? <label>Scenario settlement price<input type="number" min="0" step="0.01" value={settlementPrice} onChange={(event) => setSettlementPrice(event.target.value)} /></label> : null}<button className="secondary-button" type="button" disabled={working || !selectedStrategyId} onClick={simulateEvent}>Record lifecycle event</button></section>
            </div>

            <div className="options-history"><div className="paper-subheader"><strong>Private strategy history</strong><span>Protected structures only</span></div>{snapshot.strategies.length ? snapshot.strategies.map((strategy) => <article key={strategy.id}><div><strong>{strategyLabels[strategy.strategyType]} · {strategy.underlyingSymbol}</strong><span>{strategy.legCount} leg{strategy.legCount === 1 ? '' : 's'} · {strategy.protectedShortLegCount} protected short</span></div><div><strong>{strategy.lifecycleStatus.replace('_', ' ')}</strong><span>{money.format(strategy.maxLoss)} max loss · {strategy.realizedPnl === null ? 'open P/L' : `${money.format(strategy.realizedPnl)} realized`}</span></div></article>) : <div className="paper-list-empty">No options paper strategies yet.</div>}</div>
            <div className="options-reconcile"><BookOpenCheck size={20} /><div><strong>Ledger and risk reconciliation</strong><span>{snapshot.latestReconciliation ? `${snapshot.latestReconciliation.status} · ${snapshot.latestReconciliation.issues} issues` : 'Not run yet'}</span></div><button className="secondary-button" type="button" disabled={working} onClick={() => void run(() => reconcileOptionsPaperPortfolio(portfolioId), 'Options strategies, protected legs, virtual cash and journals reconciled.')}>Reconcile options simulation</button></div>
          </>}
        </div>}

      {error ? <div className="inline-message error" role="alert">{error}</div> : null}
      {success ? <div className="inline-message success" role="status">{success}</div> : null}
      <p className="global-market-method-note">All chains, premiums, Greeks, volatility, payoffs, exercise and assignment outcomes are deterministic educational fixtures—not market data, tax advice, personalized advice, eligibility, or evidence that a live option could trade.</p>
    </section>
  )
}
