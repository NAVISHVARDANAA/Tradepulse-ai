import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, BookOpenCheck, Globe2, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'

import { useAuth } from '../lib/auth/AuthProvider'
import { getPaperPortfolios, type PaperPortfolio } from '../lib/queries/paperTrading'
import {
  convertInternationalPaperCash,
  getInternationalPaperCatalog,
  getInternationalPaperSnapshot,
  initializeInternationalPaperAccount,
  reconcileInternationalPaperPortfolio,
  submitInternationalPaperOrder,
  type InternationalPaperCatalogItem,
  type InternationalPaperSnapshot,
} from '../lib/queries/internationalPaperTrading'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const currencies = ['USD', 'GBP', 'INR', 'EUR', 'CAD']

function readable(value: string | null) {
  return value ? value.replace(/_/g, ' ') : 'Not available'
}

function message(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The international paper simulation could not be completed.'
}

export function InternationalPaperTradingPanel() {
  const { session, loading: authLoading } = useAuth()
  const [catalog, setCatalog] = useState<InternationalPaperCatalogItem[]>([])
  const [portfolios, setPortfolios] = useState<PaperPortfolio[]>([])
  const [portfolioId, setPortfolioId] = useState('')
  const [snapshot, setSnapshot] = useState<InternationalPaperSnapshot | null>(null)
  const [listingId, setListingId] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market')
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc' | 'ioc'>('day')
  const [quantity, setQuantity] = useState('1')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('INR')
  const [fromAmount, setFromAmount] = useState('1000')
  const [startingBalance, setStartingBalance] = useState('100000')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    void getInternationalPaperCatalog()
      .then((items) => {
        setCatalog(items)
        setListingId((current) => current || items[0]?.listingId.toString() || '')
      })
      .catch((requestError) => setError(message(requestError)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!session) {
      setPortfolios([])
      setPortfolioId('')
      setSnapshot(null)
      return
    }
    void getPaperPortfolios()
      .then((items) => {
        setPortfolios(items)
        setPortfolioId((current) => items.some((item) => item.id === current) ? current : items[0]?.id ?? '')
      })
      .catch((requestError) => setError(message(requestError)))
  }, [session])

  const refresh = async () => {
    if (!portfolioId) {
      setSnapshot(null)
      return
    }
    setSnapshot(await getInternationalPaperSnapshot(portfolioId))
  }

  useEffect(() => {
    void refresh().catch((requestError) => setError(message(requestError)))
  }, [portfolioId])

  const selectedListing = catalog.find((item) => item.listingId === Number(listingId))
  const venues = new Set(catalog.map((item) => item.micCode)).size
  const modeledCurrencies = new Set(catalog.map((item) => item.quoteCurrency)).size
  const estimatedNotional = selectedListing ? Number(quantity) * selectedListing.scenarioPrice : 0
  const estimatedCost = selectedListing
    ? Math.max(0.01, estimatedNotional * selectedListing.commissionBps / 10000)
      + estimatedNotional * (selectedListing.exchangeFeeBps + selectedListing.taxAssumptionBps) / 10000
    : 0
  const availableFromCurrencies = snapshot?.cash.map((item) => item.currency) ?? []
  const cashByCurrency = useMemo(() => new Map(snapshot?.cash.map((item) => [item.currency, item.balance]) ?? []), [snapshot])

  useEffect(() => {
    if (!snapshot?.initialized || availableFromCurrencies.length === 0) return
    if (!availableFromCurrencies.includes(fromCurrency)) setFromCurrency(availableFromCurrencies[0])
  }, [availableFromCurrencies, fromCurrency, snapshot?.initialized])

  useEffect(() => {
    if (toCurrency === fromCurrency) {
      setToCurrency(currencies.find((currency) => currency !== fromCurrency) ?? 'USD')
    }
  }, [fromCurrency, toCurrency])

  const run = async (operation: () => Promise<unknown>, successMessage: string) => {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await operation()
      await refresh()
      setSuccess(successMessage)
    } catch (requestError) {
      setError(message(requestError))
    } finally {
      setWorking(false)
    }
  }

  const initialize = (event: FormEvent) => {
    event.preventDefault()
    void run(
      () => initializeInternationalPaperAccount(portfolioId, Number(startingBalance)),
      'International paper account created with virtual funds.',
    )
  }

  const convert = (event: FormEvent) => {
    event.preventDefault()
    void run(
      () => convertInternationalPaperCash({
        portfolioId, fromCurrency, toCurrency, fromAmount: Number(fromAmount),
        clientConversionId: crypto.randomUUID(),
      }),
      'Virtual currency conversion completed and journaled.',
    )
  }

  const submitOrder = (event: FormEvent) => {
    event.preventDefault()
    void run(
      () => submitInternationalPaperOrder({
        portfolioId, listingId: Number(listingId), clientOrderId: crypto.randomUUID(),
        side, orderType, timeInForce, quantity: Number(quantity),
        limitPrice: orderType === 'limit' || orderType === 'stop_limit' ? Number(limitPrice) : null,
        stopPrice: orderType === 'stop' || orderType === 'stop_limit' ? Number(stopPrice) : null,
      }),
      'International paper order processed by the deterministic simulator.',
    )
  }

  return (
    <section className="panel international-paper-panel">
      <div className="panel-header international-paper-header">
        <div><p className="eyebrow">Global investing · Phase 8B</p><h2>International multi-asset paper trading</h2></div>
        <span className="status-badge sandbox"><ShieldCheck size={14} /> Simulation only</span>
      </div>

      <p className="panel-description">
        Rehearse venue-qualified equities, ETFs and depositary receipts with deterministic
        scenario quotes, multi-currency virtual cash, modeled costs, settlement dates,
        FIFO lots and balanced journals. Results are educational simulations—not achievable fills.
      </p>

      <div className="international-paper-lock" role="note">
        <ShieldCheck size={19} />
        <div><strong>No broker or real-money path exists</strong><span>Live data, routing, funding, custody, settlement, margin and short selling remain disabled.</span></div>
      </div>

      <div className="international-paper-summary" aria-label="International paper simulation scope">
        <article><Globe2 size={18} /><span>Modeled venues</span><strong>{venues}</strong></article>
        <article><BookOpenCheck size={18} /><span>Venue-qualified listings</span><strong>{catalog.length}</strong></article>
        <article><WalletCards size={18} /><span>Virtual currencies</span><strong>{modeledCurrencies}</strong></article>
        <article><ShieldCheck size={18} /><span>Live routes</span><strong>0</strong></article>
      </div>

      {loading || authLoading ? <div className="market-state" role="status"><RefreshCw size={18} /> Loading paper scenarios…</div> : null}

      <div className="international-paper-catalog">
        {catalog.map((item) => <article key={item.listingKey} className={item.listingId === Number(listingId) ? 'selected' : ''}>
          <button type="button" onClick={() => setListingId(item.listingId.toString())} aria-label={`Select ${item.listingKey} paper scenario`}>
            <span>{item.micCode} · {item.quoteCurrency}</span>
            <strong>{item.displaySymbol}</strong>
            <small>{item.instrumentName}</small>
            <em>{number.format(item.scenarioPrice)} scenario price</em>
          </button>
        </article>)}
      </div>

      {!session ? (
        <div className="international-paper-signin">
          <ShieldCheck size={20} />
          <div><strong>Private simulation account required</strong><span>Use the secure Paper investing workspace to sign in or create a paper portfolio.</span></div>
          <a className="secondary-button" href="#paper-investing">Open Paper investing</a>
        </div>
      ) : portfolios.length === 0 ? (
        <div className="international-paper-signin">
          <WalletCards size={20} />
          <div><strong>Create a private paper portfolio first</strong><span>The same private portfolio identity contains your international simulation.</span></div>
          <a className="secondary-button" href="#paper-investing">Create paper portfolio</a>
        </div>
      ) : (
        <div className="international-paper-workspace">
          <div className="international-paper-toolbar">
            <label>Paper portfolio<select value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)}>{portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name} · {portfolio.baseCurrency}</option>)}</select></label>
            <span>{snapshot?.initialized ? `${snapshot.accountStatus} · ${snapshot.baseCurrency} base` : 'International account not initialized'}</span>
          </div>

          {!snapshot?.initialized ? (
            <form className="international-paper-initialize" onSubmit={initialize}>
              <div><WalletCards size={21} /><span><strong>Start an isolated international paper account</strong><small>This creates new virtual funds with no cash value.</small></span></div>
              <label>Virtual starting balance<input type="number" min="1000" max="1000000" step="1000" value={startingBalance} onChange={(event) => setStartingBalance(event.target.value)} /></label>
              <button className="primary-button" type="submit" disabled={working}>Create simulation account</button>
            </form>
          ) : (
            <>
              <div className="international-paper-cash" aria-label="Multi-currency virtual cash">
                {currencies.map((currency) => <article key={currency} className={cashByCurrency.has(currency) ? '' : 'empty'}><span>{currency}</span><strong>{number.format(cashByCurrency.get(currency) ?? 0)}</strong><small>{cashByCurrency.has(currency) ? 'Virtual cash' : 'No wallet yet'}</small></article>)}
              </div>

              <div className="international-paper-actions">
                <form onSubmit={convert} className="international-paper-form">
                  <div className="international-paper-form-title"><ArrowRightLeft size={18} /><strong>Virtual FX conversion</strong></div>
                  <label>From<select value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)}>{availableFromCurrencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
                  <label>To<select value={toCurrency} onChange={(event) => setToCurrency(event.target.value)}>{currencies.filter((currency) => currency !== fromCurrency).map((currency) => <option key={currency}>{currency}</option>)}</select></label>
                  <label>Virtual amount<input required type="number" min="0.01" step="0.01" value={fromAmount} onChange={(event) => setFromAmount(event.target.value)} /></label>
                  <button className="primary-button" type="submit" disabled={working || fromCurrency === toCurrency}>Convert virtual cash</button>
                  <small>Deterministic FX fixture with an explicit modeled spread.</small>
                </form>

                <form onSubmit={submitOrder} className="international-paper-form">
                  <div className="international-paper-form-title"><Globe2 size={18} /><strong>Venue-aware paper order</strong></div>
                  <label>Listing<select value={listingId} onChange={(event) => setListingId(event.target.value)}>{catalog.map((item) => <option value={item.listingId} key={item.listingId}>{item.listingKey} · {item.quoteCurrency}</option>)}</select></label>
                  <div className="international-paper-inline"><label>Side<select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')}><option value="buy">Buy</option><option value="sell">Sell</option></select></label><label>Order type<select value={orderType} onChange={(event) => setOrderType(event.target.value as typeof orderType)}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option><option value="stop_limit">Stop limit</option></select></label></div>
                  <div className="international-paper-inline"><label>Time in force<select value={timeInForce} onChange={(event) => setTimeInForce(event.target.value as typeof timeInForce)}><option value="day">Day</option><option value="gtc">GTC</option><option value="ioc">IOC</option></select></label><label>Quantity<input required type="number" min={selectedListing?.lotSize ?? 1} step={selectedListing?.lotSize ?? 1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label></div>
                  {orderType === 'limit' || orderType === 'stop_limit' ? <label>Limit price<input required type="number" min="0.01" step={selectedListing?.tickSize ?? 0.01} value={limitPrice} onChange={(event) => setLimitPrice(event.target.value)} /></label> : null}
                  {orderType === 'stop' || orderType === 'stop_limit' ? <label>Stop price<input required type="number" min="0.01" step={selectedListing?.tickSize ?? 0.01} value={stopPrice} onChange={(event) => setStopPrice(event.target.value)} /></label> : null}
                  <div className="international-paper-estimate"><span>Scenario price</span><strong>{number.format(selectedListing?.scenarioPrice ?? 0)} {selectedListing?.quoteCurrency}</strong><span>Estimated notional + costs</span><strong>{number.format(estimatedNotional + estimatedCost)} {selectedListing?.quoteCurrency}</strong><span>Modeled settlement</span><strong>T+{selectedListing?.settlementDays ?? '—'}</strong></div>
                  <button className="primary-button" type="submit" disabled={working || !listingId}>Simulate venue order</button>
                </form>
              </div>

              <div className="international-paper-holdings">
                <section><div className="paper-subheader"><strong>Global paper positions</strong><span>FIFO lots reconciled</span></div>{snapshot.positions.length ? snapshot.positions.map((position) => <article key={position.listingKey}><div><strong>{position.listingKey}</strong><span>{position.instrumentName}</span></div><div><strong>{number.format(position.quantity)} units</strong><span>{position.openTaxLotCount} open lots · avg {number.format(position.averageCost)} {position.quoteCurrency}</span></div></article>) : <div className="paper-list-empty">No international paper positions yet.</div>}</section>
                <section><div className="paper-subheader"><strong>Recent venue simulations</strong><span>Orders never leave TradePulse</span></div>{snapshot.orders.length ? snapshot.orders.slice(0, 6).map((order) => <article key={order.id}><div><strong>{order.listingKey} · {order.side}</strong><span>{readable(order.orderType)} · {number.format(order.quantity)} requested</span></div><div><strong>{readable(order.status)}</strong><span>{number.format(order.filledQuantity)} filled · {number.format(order.totalCost)} {order.quoteCurrency} costs</span></div></article>) : <div className="paper-list-empty">No venue simulations yet.</div>}</section>
              </div>

              <div className="international-paper-reconcile">
                <div><BookOpenCheck size={20} /><span><strong>Deterministic reconciliation</strong><small>{snapshot.latestReconciliation ? `${snapshot.latestReconciliation.status} · ${snapshot.latestReconciliation.issues} issues` : 'Not run yet'}</small></span></div>
                <button className="secondary-button" type="button" disabled={working} onClick={() => void run(() => reconcileInternationalPaperPortfolio(portfolioId), 'International paper cash, fills, positions, lots and journals reconciled.')}>Reconcile simulation</button>
              </div>
            </>
          )}
        </div>
      )}

      {error ? <div className="inline-message error" role="alert">{error}</div> : null}
      {success ? <div className="inline-message success" role="status">{success}</div> : null}
      <p className="global-market-method-note">Scenario prices, FX rates, costs, venue sessions and corporate actions are deterministic educational fixtures. They are not live market data, quotes, tax advice, customer eligibility, or evidence that an order could execute.</p>
    </section>
  )
}
