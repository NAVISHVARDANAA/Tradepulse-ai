import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { AcademyLink } from './AcademyLink'
import { getEquityPriceHistory } from '../lib/queries/equityResearch'
import type {
  EquityPricePoint,
  EquityResearchClassification,
  EquityResearchSnapshot,
} from '../types/domain'

type GlobalEquityResearchPanelProps = {
  securities: EquityResearchSnapshot[]
  loading: boolean
  error: string | null
}

const componentLabels = [
  ['forecast', 'Validated forecast'],
  ['momentum', 'Price momentum'],
  ['quality', 'Business quality'],
  ['valuation', 'Valuation'],
  ['risk', 'Risk resilience'],
  ['dataQuality', 'Data quality'],
] as const

function formatPrice(value: number | null, currency: string) {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value)
}

function formatLargeNumber(value: number | null, currency: string) {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function classificationLabel(
  classification: EquityResearchClassification | null,
) {
  switch (classification) {
    case 'research_positive':
      return 'Positive research'
    case 'research_cautious':
      return 'Cautious research'
    case 'research_neutral':
      return 'Neutral research'
    default:
      return 'Data pending'
  }
}

function classificationTone(
  classification: EquityResearchClassification | null,
) {
  switch (classification) {
    case 'research_positive':
      return 'positive'
    case 'research_cautious':
      return 'negative'
    default:
      return 'neutral'
  }
}

function coverageLabel(security: EquityResearchSnapshot) {
  switch (security.coverageStatus) {
    case 'realtime':
      return 'Real-time licensed'
    case 'delayed':
      return `${security.delayMinutes ?? 15} min delayed`
    case 'reference':
      return 'Reference / partial feed'
    case 'unavailable':
      return 'Unavailable'
    default:
      return 'Coverage pending'
  }
}

export function GlobalEquityResearchPanel({
  securities,
  loading,
  error,
}: GlobalEquityResearchPanelProps) {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [exchange, setExchange] = useState('all')
  const [sector, setSector] = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [history, setHistory] = useState<EquityPricePoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const countries = useMemo(
    () => Array.from(new Set(securities.map((item) => item.countryCode)
      .filter((value): value is string => Boolean(value)))).sort(),
    [securities],
  )
  const exchanges = useMemo(
    () => Array.from(new Set(securities.map((item) => item.exchangeCode))).sort(),
    [securities],
  )
  const sectors = useMemo(
    () => Array.from(new Set(securities.map((item) => item.sector)
      .filter((value): value is string => Boolean(value)))).sort(),
    [securities],
  )
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return securities.filter((security) => {
      const matchesSearch = !query ||
        security.symbol.toLowerCase().includes(query) ||
        security.companyName.toLowerCase().includes(query) ||
        security.industry?.toLowerCase().includes(query)

      return matchesSearch &&
        (country === 'all' || security.countryCode === country) &&
        (exchange === 'all' || security.exchangeCode === exchange) &&
        (sector === 'all' || security.sector === sector)
    })
  }, [country, exchange, search, sector, securities])
  const selected = filtered.find((item) => item.securityId === selectedId) ??
    filtered[0] ?? null

  useEffect(() => {
    if (!selected) {
      setHistory([])
      setHistoryError(null)
      return
    }

    let active = true
    setHistoryLoading(true)

    void getEquityPriceHistory(selected.marketAssetId)
      .then((points) => {
        if (active) {
          setHistory(points)
          setHistoryError(null)
        }
      })
      .catch((loadError) => {
        console.error('Failed to load equity price history:', loadError)
        if (active) {
          setHistory([])
          setHistoryError('Price history is temporarily unavailable.')
        }
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selected?.marketAssetId])

  const forecastReady = securities.filter((item) => item.forecast).length
  const realTime = securities.filter(
    (item) => item.coverageStatus === 'realtime',
  ).length
  const researched = securities.filter(
    (item) => item.researchClassification &&
      item.researchClassification !== 'insufficient_data',
  ).length

  return (
    <section className="panel equity-research-panel">
      <div className="panel-header equity-research-header">
        <div>
          <p className="eyebrow">Global equities · Phase 3C</p>
          <h2>Stock research and forecast dashboard</h2>
        </div>

        <div className="panel-header-actions">
          <AcademyLink courseSlug="stock-research" lessonSlug="research-score-components" />
          <span className="status-badge">
            <ShieldCheck size={14} /> Research only · no trade instruction
          </span>
        </div>
      </div>

      <p className="panel-description equity-description">
        Search every licensed security in the coverage registry, compare a
        transparent opportunity score, inspect model uncertainty, and see the
        evidence and risks behind each classification. Coverage is expanded
        provider by provider; unsupported markets stay visibly unavailable.
      </p>

      <div className="equity-coverage-summary" aria-label="Equity coverage summary">
        <div>
          <Globe2 size={17} />
          <span>Research universe</span>
          <strong>{securities.length}</strong>
        </div>
        <div>
          <BrainCircuit size={17} />
          <span>Validated forecasts</span>
          <strong>{forecastReady}</strong>
        </div>
        <div>
          <BarChart3 size={17} />
          <span>Scored securities</span>
          <strong>{researched}</strong>
        </div>
        <div>
          <Database size={17} />
          <span>Licensed real-time</span>
          <strong>{realTime}</strong>
        </div>
      </div>

      {loading ? (
        <div className="market-state" role="status">
          Loading the equity coverage registry…
        </div>
      ) : error ? (
        <div className="market-state" role="alert">
          {error}
        </div>
      ) : securities.length === 0 ? (
        <div className="equity-empty" role="status">
          <Database size={24} />
          <div>
            <strong>The research engine is ready for licensed equity data.</strong>
            <span>
              Configure the server-side provider and approved symbols to begin
              publishing verified stock prices, forecasts, and research scores.
              No placeholder stock values are displayed.
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="equity-filter-bar">
            <label className="equity-search">
              <Search size={15} />
              <span className="sr-only">Search stocks</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search symbol, company, or industry"
              />
            </label>

            <label>
              <span className="sr-only">Country</span>
              <select value={country} onChange={(event) => setCountry(event.target.value)}>
                <option value="all">All countries</option>
                {countries.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Exchange</span>
              <select value={exchange} onChange={(event) => setExchange(event.target.value)}>
                <option value="all">All exchanges</option>
                {exchanges.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Sector</span>
              <select value={sector} onChange={(event) => setSector(event.target.value)}>
                <option value="all">All sectors</option>
                {sectors.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="market-state" role="status">
              No covered security matches these filters.
            </div>
          ) : selected ? (
            <div className="equity-workspace">
              <div className="equity-universe-list" aria-label="Covered securities">
                <div className="equity-list-head">
                  <span>{filtered.length} matches</span>
                  <span>Ranked by research score</span>
                </div>

                {filtered.map((security) => {
                  const tone = classificationTone(security.researchClassification)
                  const change = security.changePercent

                  return (
                    <button
                      type="button"
                      key={security.securityId}
                      className={
                        security.securityId === selected.securityId
                          ? 'equity-list-item active'
                          : 'equity-list-item'
                      }
                      onClick={() => setSelectedId(security.securityId)}
                    >
                      <div className="equity-list-company">
                        <strong>{security.symbol}</strong>
                        <span>{security.companyName}</span>
                        <small>{security.exchangeCode} · {security.countryCode ?? '—'}</small>
                      </div>
                      <div className="equity-list-price">
                        <strong>{formatPrice(security.price, security.currency)}</strong>
                        <span className={
                          change === null ? 'neutral-text' :
                            change >= 0 ? 'positive-text' : 'negative-text'
                        }>
                          {change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
                        </span>
                      </div>
                      <div className={`equity-score ${tone}`}>
                        {security.researchScore === null
                          ? '—'
                          : Math.round(security.researchScore)}
                      </div>
                    </button>
                  )
                })}
              </div>

              <article className="equity-detail">
                <div className="equity-detail-head">
                  <div>
                    <div className="equity-symbol-line">
                      <span>{selected.symbol}</span>
                      <span className={`research-pill ${classificationTone(selected.researchClassification)}`}>
                        {classificationLabel(selected.researchClassification)}
                      </span>
                    </div>
                    <h3>{selected.companyName}</h3>
                    <p>
                      {selected.exchangeName ?? selected.exchangeCode}
                      {selected.sector ? ` · ${selected.sector}` : ''}
                      {selected.industry ? ` · ${selected.industry}` : ''}
                    </p>
                  </div>

                  <div className="equity-primary-price">
                    <strong>{formatPrice(selected.price, selected.currency)}</strong>
                    <span>{coverageLabel(selected)}</span>
                  </div>
                </div>

                <div className="equity-trust-line">
                  <Clock3 size={13} />
                  <span>
                    {selected.observedAt
                      ? `Observed ${new Date(selected.observedAt).toLocaleString()}`
                      : 'No verified price timestamp'}
                  </span>
                  <span>Source: {selected.priceSource ?? selected.providerName}</span>
                  <span>License: {selected.licenseStatus ?? 'pending'}</span>
                </div>

                <div className="equity-detail-grid">
                  <section className="equity-chart-card">
                    <div className="equity-card-title">
                      <div>
                        <span>Verified price history</span>
                        <strong>Up to 180 sessions</strong>
                      </div>
                      {selected.changePercent !== null && selected.changePercent >= 0
                        ? <TrendingUp size={18} />
                        : <TrendingDown size={18} />}
                    </div>

                    {historyLoading ? (
                      <div className="equity-chart-state">Loading price history…</div>
                    ) : historyError ? (
                      <div className="equity-chart-state">{historyError}</div>
                    ) : history.length < 2 ? (
                      <div className="equity-chart-state">Verified history is not available.</div>
                    ) : (
                      <div className="equity-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={history} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
                            <defs>
                              <linearGradient id="equityPriceFill" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                            <XAxis
                              dataKey="observedAt"
                              tickLine={false}
                              axisLine={false}
                              minTickGap={40}
                              tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              tick={{ fill: '#64748b', fontSize: 10 }}
                            />
                            <YAxis
                              domain={['auto', 'auto']}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: '#64748b', fontSize: 10 }}
                            />
                            <Tooltip
                              labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}
                              formatter={(value: number | string) => [formatPrice(Number(value), selected.currency), 'Close']}
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: 12,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="#38bdf8"
                              strokeWidth={2.5}
                              fill="url(#equityPriceFill)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  <section className="equity-forecast-card">
                    <div className="equity-card-title">
                      <div>
                        <span>Validated model outlook</span>
                        <strong>{selected.forecast
                          ? `${selected.forecast.horizonHours}-hour horizon`
                          : 'Qualification pending'}</strong>
                      </div>
                      <BrainCircuit size={18} />
                    </div>

                    {selected.forecast ? (
                      <>
                        <div className="equity-forecast-price">
                          <strong>{formatPrice(selected.forecast.predictedPrice, selected.currency)}</strong>
                          <span className={`direction-pill ${selected.forecast.direction}`}>
                            {selected.forecast.direction}
                          </span>
                        </div>
                        <div className={`forecast-reliability ${selected.forecast.governanceStatus}`}>
                          {selected.forecast.governanceStatus === 'qualified'
                            ? 'Production reliability qualified'
                            : selected.forecast.governanceStatus === 'watch'
                              ? 'Production reliability watch'
                              : 'Production evidence building'}
                          {' · '}{selected.forecast.reliabilityEvaluationCount} outcomes
                        </div>
                        <dl className="equity-facts">
                          <div><dt>Uncertainty range</dt><dd>
                            {selected.forecast.lowerBound === null || selected.forecast.upperBound === null
                              ? 'Not available'
                              : `${formatPrice(selected.forecast.lowerBound, selected.currency)}–${formatPrice(selected.forecast.upperBound, selected.currency)}`}
                          </dd></div>
                          <div><dt>Confidence</dt><dd>
                            {selected.forecast.confidence === null
                              ? 'Not scored'
                              : `${Math.round(selected.forecast.confidence * 100)}%`}
                          </dd></div>
                          <div><dt>Directional accuracy</dt><dd>
                            {selected.forecast.directionalAccuracy === null
                              ? 'Not scored'
                              : `${Math.round(selected.forecast.directionalAccuracy * 100)}%`}
                          </dd></div>
                          <div><dt>Production direction</dt><dd>
                            {selected.forecast.productionDirectionalAccuracy === null
                              ? 'Building evidence'
                              : `${Math.round(selected.forecast.productionDirectionalAccuracy * 100)}%`}
                          </dd></div>
                          <div><dt>Production interval coverage</dt><dd>
                            {selected.forecast.productionIntervalCoverage === null
                              ? 'Building evidence'
                              : `${Math.round(selected.forecast.productionIntervalCoverage * 100)}%`}
                          </dd></div>
                          <div><dt>Model</dt><dd>{selected.forecast.modelName} v{selected.forecast.modelVersion}</dd></div>
                        </dl>
                      </>
                    ) : (
                      <div className="equity-chart-state">
                        Forecasts appear only after at least 120 correctly spaced
                        observations, out-of-sample baseline validation and the
                        production reliability display gate.
                      </div>
                    )}
                  </section>
                </div>

                <div className="equity-analysis-grid">
                  <section className="equity-score-card">
                    <div className="equity-score-head">
                      <div>
                        <span>Transparent research score</span>
                        <strong>{selected.researchScore === null
                          ? 'Not yet scored'
                          : `${Math.round(selected.researchScore)} / 100`}</strong>
                      </div>
                      <small>{selected.methodologyVersion ?? 'Methodology pending'}</small>
                    </div>

                    <div className="score-components">
                      {componentLabels.map(([key, label]) => {
                        const value = selected.componentScores[key]

                        return (
                          <div key={key}>
                            <div><span>{label}</span><strong>{value === null ? '—' : Math.round(value)}</strong></div>
                            <span className="score-track"><span style={{ width: `${value ?? 0}%` }} /></span>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <section className="equity-evidence-card">
                    <div>
                      <div className="evidence-title positive"><CheckCircle2 size={15} /> Evidence considered</div>
                      {selected.reasons.length > 0 ? (
                        <ul>{selected.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                      ) : <p>Research evidence will appear after scoring.</p>}
                    </div>
                    <div>
                      <div className="evidence-title warning"><AlertTriangle size={15} /> Risks and missing data</div>
                      {selected.riskFlags.length > 0 ? (
                        <ul>{selected.riskFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
                      ) : <p>No methodology risk flag is currently published.</p>}
                    </div>
                  </section>
                </div>

                <section className="equity-fundamentals">
                  <div className="equity-card-title">
                    <div>
                      <span>Licensed fundamentals</span>
                      <strong>{selected.fundamentalPeriodEnd ?? 'Period unavailable'}</strong>
                    </div>
                  </div>
                  <dl className="fundamental-grid">
                    <div><dt>Revenue</dt><dd>{formatLargeNumber(selected.revenue, selected.currency)}</dd></div>
                    <div><dt>Net income</dt><dd>{formatLargeNumber(selected.netIncome, selected.currency)}</dd></div>
                    <div><dt>Diluted EPS</dt><dd>{selected.dilutedEps?.toFixed(2) ?? '—'}</dd></div>
                    <div><dt>P/E</dt><dd>{selected.peRatio?.toFixed(1) ?? '—'}</dd></div>
                    <div><dt>Price / book</dt><dd>{selected.priceToBook?.toFixed(1) ?? '—'}</dd></div>
                    <div><dt>Dividend yield</dt><dd>{selected.dividendYield === null ? '—' : `${(selected.dividendYield * 100).toFixed(2)}%`}</dd></div>
                  </dl>
                </section>

                <p className="equity-method-note">
                  Classification is a non-personalized research summary—not a
                  buy, sell, hold, suitability, or return guarantee. Users must
                  consider objectives, jurisdiction, costs, taxes, and capacity
                  for loss before making any investment decision.
                </p>
              </article>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
