import type { Session } from '@supabase/supabase-js'
import {
  BrainCircuit,
  CircleDollarSign,
  LogOut,
  Mail,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { AcademyLink } from './AcademyLink'
import {
  createPaperPortfolio,
  getPaperInstruments,
  getPaperPortfolios,
  getPaperPortfolioSnapshot,
  submitPaperOrder,
  type PaperInstrument,
  type PaperPortfolio,
  type PaperPortfolioSnapshot,
} from '../lib/queries/paperTrading'
import { supabase } from '../lib/supabase/client'
import type { MarketAssetSnapshot } from '../types/domain'

type PaperInvestingPanelProps = {
  marketAssets: MarketAssetSnapshot[]
}

const number = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

function displayError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'The paper-investing request could not be completed.'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function label(value: string | null) {
  return value ? value.split('_').join(' ') : 'Not available'
}

export function PaperInvestingPanel({
  marketAssets,
}: PaperInvestingPanelProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [portfolios, setPortfolios] = useState<PaperPortfolio[]>([])
  const [instruments, setInstruments] = useState<PaperInstrument[]>([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('')
  const [snapshot, setSnapshot] = useState<PaperPortfolioSnapshot | null>(null)
  const [portfolioName, setPortfolioName] = useState('My Paper Portfolio')
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [startingBalance, setStartingBalance] = useState('100000')
  const [instrumentId, setInstrumentId] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('1')
  const [thesis, setThesis] = useState('')
  const [conviction, setConviction] = useState('3')
  const [plannedHorizonHours, setPlannedHorizonHours] = useState('24')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const paperOrderId = useRef(crypto.randomUUID())

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    void getPaperInstruments()
      .then(setInstruments)
      .catch((loadError) => setError(displayError(loadError)))
  }, [])

  const refreshPortfolios = async () => {
    if (!session) {
      setPortfolios([])
      setSelectedPortfolioId('')
      setSnapshot(null)
      return
    }

    const nextPortfolios = await getPaperPortfolios()
    setPortfolios(nextPortfolios)
    setSelectedPortfolioId((current) =>
      nextPortfolios.some((portfolio) => portfolio.id === current)
        ? current
        : nextPortfolios[0]?.id ?? '',
    )
  }

  useEffect(() => {
    void refreshPortfolios().catch((loadError) =>
      setError(displayError(loadError)),
    )
  }, [session])

  const refreshSnapshot = async () => {
    if (!selectedPortfolioId) {
      setSnapshot(null)
      return
    }
    setSnapshot(await getPaperPortfolioSnapshot(selectedPortfolioId))
  }

  useEffect(() => {
    void refreshSnapshot().catch((loadError) =>
      setError(displayError(loadError)),
    )
  }, [selectedPortfolioId])

  const selectedPortfolio = portfolios.find(
    (portfolio) => portfolio.id === selectedPortfolioId,
  )
  const eligibleInstruments = useMemo(
    () =>
      instruments.filter(
        (instrument) =>
          instrument.quoteCurrency === selectedPortfolio?.baseCurrency,
      ),
    [instruments, selectedPortfolio?.baseCurrency],
  )
  const selectedInstrument = eligibleInstruments.find(
    (instrument) => instrument.id === Number(instrumentId),
  )
  const selectedMarket = marketAssets.find(
    (market) => market.id === selectedInstrument?.marketAssetId,
  )
  const estimatedNotional =
    Number(quantity) > 0 && selectedMarket?.price
      ? Number(quantity) * selectedMarket.price
      : null
  const positionValue = useMemo(
    () =>
      snapshot?.positions.reduce((total, position) => {
        const instrument = instruments.find(
          (item) => item.id === position.instrumentId,
        )
        const market = marketAssets.find(
          (item) => item.id === instrument?.marketAssetId,
        )
        return total + position.quantity * (market?.price ?? position.averageCost)
      }, 0) ?? 0,
    [instruments, marketAssets, snapshot],
  )

  useEffect(() => {
    if (!eligibleInstruments.some((item) => item.id === Number(instrumentId))) {
      setInstrumentId(eligibleInstruments[0]?.id.toString() ?? '')
    }
  }, [eligibleInstruments, instrumentId])

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault()
    setAuthMessage(null)
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })

    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    setAuthMessage('Secure sign-in link sent. Check your email.')
  }

  const handleCreatePortfolio = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await createPaperPortfolio({
        name: portfolioName.trim(),
        baseCurrency,
        startingBalance: Number(startingBalance),
      })
      await refreshPortfolios()
      setSuccess('Paper portfolio created with simulated funds.')
    } catch (requestError) {
      setError(displayError(requestError))
    } finally {
      setLoading(false)
    }
  }

  const handleOrder = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await submitPaperOrder({
        portfolioId: selectedPortfolioId,
        instrumentId: Number(instrumentId),
        side,
        quantity: Number(quantity),
        clientOrderId: paperOrderId.current,
        thesis: thesis.trim(),
        conviction: Number(conviction),
        plannedHorizonHours: Number(plannedHorizonHours),
      })
      await refreshSnapshot()
      const orderStatus = response?.order?.status
      paperOrderId.current = crypto.randomUUID()
      if (orderStatus === 'risk_rejected') {
        setError(
          `Paper order rejected by risk controls: ${response?.order?.reason ?? 'limit exceeded'}.`,
        )
      } else {
        setThesis('')
        setSuccess(
          orderStatus === 'filled'
            ? 'Paper order filled and its decision evidence was journaled.'
            : `Paper order status: ${orderStatus ?? 'submitted'}.`,
        )
      }
    } catch (requestError) {
      setError(displayError(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel paper-panel" id="paper-investing">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Portfolio lab · Phase 4F</p>
          <h2>AI-linked paper decision lab</h2>
        </div>
        <div className="panel-header-actions">
          <AcademyLink courseSlug="paper-trading-risk" lessonSlug="paper-orders" />
          <span className="status-badge sandbox">
            <ShieldCheck size={14} /> Simulation only
          </span>
        </div>
      </div>

      <p className="panel-description">
        Practise with synchronized prices, virtual cash, recorded fees and
        pre-trade limits. Every new decision keeps its private thesis and the
        point-in-time forecast context so you can measure what actually worked.
        Nothing here can reach a broker or move real funds.
      </p>

      {authLoading ? (
        <div className="paper-empty" role="status">
          <RefreshCw size={20} /> Checking secure session…
        </div>
      ) : !session ? (
        <form className="paper-auth" onSubmit={handleMagicLink}>
          <div className="paper-auth-icon"><Mail size={20} /></div>
          <div>
            <strong>Sign in to create a private paper portfolio</strong>
            <p>A secure email link is used—no password is stored by TradePulse AI.</p>
          </div>
          <div className="paper-auth-control">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email address"
            />
            <button className="primary-button" type="submit" disabled={loading}>
              Send sign-in link
            </button>
          </div>
          {authMessage ? <span className="success-message">{authMessage}</span> : null}
        </form>
      ) : (
        <>
          <div className="paper-account-row">
            <span>Signed in as {session.user.email}</span>
            <button
              className="text-button"
              type="button"
              onClick={() => void supabase.auth.signOut()}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>

          {portfolios.length === 0 ? (
            <form className="portfolio-create" onSubmit={handleCreatePortfolio}>
              <div className="portfolio-create-copy">
                <WalletCards size={22} />
                <div>
                  <strong>Create your first simulation portfolio</strong>
                  <span>Starting funds are virtual and have no cash value.</span>
                </div>
              </div>
              <label>
                Portfolio name
                <input
                  value={portfolioName}
                  minLength={2}
                  maxLength={60}
                  onChange={(event) => setPortfolioName(event.target.value)}
                />
              </label>
              <label>
                Base currency
                <select value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value)}>
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
              <label>
                Virtual starting balance
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={startingBalance}
                  onChange={(event) => setStartingBalance(event.target.value)}
                />
              </label>
              <button className="primary-button" type="submit" disabled={loading}>
                Create paper portfolio
              </button>
            </form>
          ) : (
            <div className="paper-workspace">
              <div className="paper-toolbar">
                <label>
                  Portfolio
                  <select
                    value={selectedPortfolioId}
                    onChange={(event) => setSelectedPortfolioId(event.target.value)}
                  >
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name} · {portfolio.baseCurrency}
                      </option>
                    ))}
                  </select>
                </label>
                <span>{snapshot?.riskLimits?.ruleVersion ?? 'Risk rules loading'}</span>
              </div>

              <div className="paper-summary-grid">
                <article>
                  <span>Virtual cash</span>
                  <strong>{number.format(snapshot?.cashBalance ?? 0)} {snapshot?.currency}</strong>
                </article>
                <article>
                  <span>Estimated positions</span>
                  <strong>{number.format(positionValue)} {snapshot?.currency}</strong>
                </article>
                <article>
                  <span>Total simulated value</span>
                  <strong>{number.format((snapshot?.cashBalance ?? 0) + positionValue)} {snapshot?.currency}</strong>
                </article>
                <article>
                  <span>Maximum order</span>
                  <strong>{number.format(snapshot?.riskLimits?.maxOrderNotional ?? 0)} {snapshot?.currency}</strong>
                </article>
              </div>

              <div className="paper-trade-grid">
                <form className="paper-order-form" onSubmit={handleOrder}>
                  <div className="paper-order-title">
                    <CircleDollarSign size={18} />
                    <strong>Paper market order</strong>
                  </div>
                  <label>
                    Instrument
                    <select
                      required
                      value={instrumentId}
                      onChange={(event) => setInstrumentId(event.target.value)}
                    >
                      {eligibleInstruments.map((instrument) => (
                        <option key={instrument.id} value={instrument.id}>
                          {instrument.symbol} · {instrument.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Side
                    <select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')}>
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      required
                      min="0.00000001"
                      step="0.00000001"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                  </label>
                  <label>
                    Decision thesis
                    <textarea
                      required
                      minLength={8}
                      maxLength={500}
                      rows={3}
                      placeholder="What do you expect, and what evidence could prove you wrong?"
                      value={thesis}
                      onChange={(event) => setThesis(event.target.value)}
                    />
                    <small>{thesis.length}/500 · stored privately</small>
                  </label>
                  <div className="paper-decision-controls">
                    <label>
                      Conviction
                      <select
                        value={conviction}
                        onChange={(event) => setConviction(event.target.value)}
                      >
                        <option value="1">1 · exploratory</option>
                        <option value="2">2 · cautious</option>
                        <option value="3">3 · balanced</option>
                        <option value="4">4 · strong</option>
                        <option value="5">5 · highest</option>
                      </select>
                    </label>
                    <label>
                      Review horizon
                      <select
                        value={plannedHorizonHours}
                        onChange={(event) => setPlannedHorizonHours(event.target.value)}
                      >
                        <option value="1">1 hour</option>
                        <option value="24">1 day</option>
                        <option value="72">3 days</option>
                        <option value="168">1 week</option>
                        <option value="720">30 days</option>
                      </select>
                    </label>
                  </div>
                  <div className="paper-estimate">
                    <span>Reference price</span>
                    <strong>{selectedMarket?.price ? number.format(selectedMarket.price) : 'Awaiting data'}</strong>
                    <span>Estimated notional</span>
                    <strong>{estimatedNotional ? number.format(estimatedNotional) : '—'} {selectedPortfolio?.baseCurrency}</strong>
                    <span>Evidence snapshot</span>
                    <strong>Forecast + research captured server-side</strong>
                  </div>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={
                      loading ||
                      !instrumentId ||
                      !selectedMarket?.price ||
                      thesis.trim().length < 8
                    }
                  >
                    Journal and simulate order
                  </button>
                </form>

                <div className="paper-positions">
                  <div className="paper-subheader">
                    <strong>Open positions</strong>
                    <span>{snapshot?.positions.length ?? 0} instruments</span>
                  </div>
                  {snapshot?.positions.length ? (
                    snapshot.positions.map((position) => (
                      <div key={position.instrumentId} className="paper-position-row">
                        <div>
                          <strong>{position.symbol}</strong>
                          <span>{position.name}</span>
                        </div>
                        <div>
                          <span>{number.format(position.quantity)} units</span>
                          <strong>Avg {number.format(position.averageCost)}</strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="paper-list-empty">No simulated positions yet.</div>
                  )}
                </div>
              </div>

              <section className="paper-decision-intelligence">
                <div className="paper-subheader">
                  <div>
                    <strong><BrainCircuit size={17} /> Decision intelligence</strong>
                    <span>Outcomes are evaluated from later synchronized prices</span>
                  </div>
                  <span>Learning analytics—not investment advice</span>
                </div>

                <div className="paper-decision-scorecard">
                  <article>
                    <NotebookPen size={17} />
                    <span>Journaled decisions</span>
                    <strong>{snapshot?.decisionScorecard?.totalDecisions ?? 0}</strong>
                    <small>{snapshot?.decisionScorecard?.completedDecisions ?? 0} evaluated</small>
                  </article>
                  <article>
                    <Target size={17} />
                    <span>Forecast direction</span>
                    <strong>
                      {snapshot?.decisionScorecard?.forecastDirectionalAccuracyPercent === null ||
                      snapshot?.decisionScorecard?.forecastDirectionalAccuracyPercent === undefined
                        ? 'Pending'
                        : `${number.format(snapshot.decisionScorecard.forecastDirectionalAccuracyPercent)}%`}
                    </strong>
                    <small>Correct after the chosen horizon</small>
                  </article>
                  <article>
                    <TrendingUp size={17} />
                    <span>Profitable decisions</span>
                    <strong>
                      {snapshot?.decisionScorecard?.profitableDecisionRatePercent === null ||
                      snapshot?.decisionScorecard?.profitableDecisionRatePercent === undefined
                        ? 'Pending'
                        : `${number.format(snapshot.decisionScorecard.profitableDecisionRatePercent)}%`}
                    </strong>
                    <small>Paper directional return above zero</small>
                  </article>
                  <article>
                    <BrainCircuit size={17} />
                    <span>Average forecast error</span>
                    <strong>
                      {snapshot?.decisionScorecard?.averageForecastErrorPercent === null ||
                      snapshot?.decisionScorecard?.averageForecastErrorPercent === undefined
                        ? 'Pending'
                        : `${number.format(snapshot.decisionScorecard.averageForecastErrorPercent)}%`}
                    </strong>
                    <small>Absolute outcome-price error</small>
                  </article>
                </div>

                <div className="paper-decision-journal">
                  {snapshot?.decisionJournal.length ? (
                    snapshot.decisionJournal.map((decision) => (
                      <article key={decision.id}>
                        <div className="paper-decision-journal-head">
                          <div>
                            <strong>{decision.symbol} · {decision.side}</strong>
                            <span>{formatDate(decision.submittedAt)} · conviction {decision.conviction}/5</span>
                          </div>
                          <span className={`decision-outcome ${decision.evaluationStatus}`}>
                            {label(decision.evaluationStatus)}
                          </span>
                        </div>
                        <p>{decision.thesis}</p>
                        <dl>
                          <div><dt>Horizon</dt><dd>{decision.plannedHorizonHours}h</dd></div>
                          <div><dt>Forecast</dt><dd>{label(decision.forecastDirection)}</dd></div>
                          <div><dt>Research</dt><dd>{label(decision.researchClassification)}</dd></div>
                          <div>
                            <dt>Decision return</dt>
                            <dd className={(decision.decisionReturnPercent ?? 0) >= 0 ? 'positive-text' : 'negative-text'}>
                              {decision.decisionReturnPercent === null
                                ? 'Pending'
                                : `${number.format(decision.decisionReturnPercent)}%`}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))
                  ) : (
                    <div className="paper-list-empty">
                      Your first journaled paper decision will appear here.
                    </div>
                  )}
                </div>
              </section>

              <div className="paper-orders">
                <div className="paper-subheader">
                  <strong>Recent simulated orders</strong>
                  <span>Fees and fills are recorded</span>
                </div>
                {snapshot?.orders.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Instrument</th><th>Side</th><th>Quantity</th><th>Fill</th><th>Fees</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.orders.map((order) => (
                          <tr key={order.id}>
                            <td>{order.symbol}</td>
                            <td className={order.side === 'buy' ? 'positive-text' : 'negative-text'}>{order.side}</td>
                            <td>{number.format(order.quantity)}</td>
                            <td>{order.averageFillPrice === null ? '—' : number.format(order.averageFillPrice)}</td>
                            <td>{number.format(order.totalFees)}</td>
                            <td><span className={`order-status ${order.status}`}>{order.status.replace('_', ' ')}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="paper-list-empty">No simulated orders yet.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {error ? <div className="inline-message error" role="alert">{error}</div> : null}
      {success ? <div className="inline-message success" role="status">{success}</div> : null}
    </section>
  )
}
