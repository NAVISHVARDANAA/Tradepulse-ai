import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  DatabaseZap,
  TrendingUp,
} from 'lucide-react'

import { ForecastPanel } from './components/ForecastPanel'
import { GlobalEquityResearchPanel } from './components/GlobalEquityResearchPanel'
import { PaymentQuotePanel } from './components/PaymentQuotePanel'
import { PaperInvestingPanel } from './components/PaperInvestingPanel'
import { PlatformReadiness } from './components/PlatformReadiness'
import { PortfolioRiskCommandCenter } from './components/PortfolioRiskCommandCenter'
import {
  getLatestForecasts,
  getMarketAssets,
  getPaymentCorridors,
  getTradeDashboard,
} from './lib/queries/referenceData'
import { getGlobalEquityResearch } from './lib/queries/equityResearch'
import { supabase } from './lib/supabase/client'
import type {
  MarketAssetSnapshot,
  MarketForecast,
  EquityResearchSnapshot,
  PaymentCorridor,
  TradeDashboard,
  TradeKpi,
} from './types/domain'

const navItems = [
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Stock research', href: '#stock-research' },
  { label: 'Markets', href: '#markets' },
  { label: 'Forecasts', href: '#forecasts' },
  { label: 'Paper investing', href: '#paper-investing' },
  { label: 'Risk center', href: '#risk-command-center' },
  { label: 'Trade data', href: '#trade-data' },
  { label: 'Payments', href: '#payments' },
]

const emptyKpis: TradeKpi[] = [
  {
    label: 'Tracked trade volume',
    value: '—',
    change: '—',
    note: 'Awaiting synchronized trade data',
    tone: 'neutral',
  },
  {
    label: 'Export growth',
    value: '—',
    change: '—',
    note: 'Awaiting synchronized trade data',
    tone: 'neutral',
  },
  {
    label: 'Import growth',
    value: '—',
    change: '—',
    note: 'Awaiting synchronized trade data',
    tone: 'neutral',
  },
  {
    label: 'Trade balance',
    value: '—',
    change: '—',
    note: 'Awaiting synchronized trade data',
    tone: 'neutral',
  },
]

const emptyTradeDashboard: TradeDashboard = {
  kpis: emptyKpis,
  trend: [],
  countries: [],
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function formatMarketPrice(symbol: string, price: number | null) {
  if (price === null) {
    return '—'
  }

  if (symbol === 'EURUSD') {
    return price.toFixed(4)
  }

  if (symbol === 'USDINR') {
    return price.toFixed(2)
  }

  return `$${price.toFixed(2)}`
}

function formatGrowth(value: number | null) {
  if (value === null) {
    return '—'
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function App() {
  const [marketAssets, setMarketAssets] = useState<MarketAssetSnapshot[]>([])
  const [tradeDashboard, setTradeDashboard] = useState<TradeDashboard>(
    emptyTradeDashboard,
  )
  const [forecasts, setForecasts] = useState<MarketForecast[]>([])
  const [equityResearch, setEquityResearch] = useState<EquityResearchSnapshot[]>([])
  const [corridors, setCorridors] = useState<PaymentCorridor[]>([])
  const [marketLoading, setMarketLoading] = useState(true)
  const [tradeLoading, setTradeLoading] = useState(true)
  const [forecastLoading, setForecastLoading] = useState(true)
  const [equityResearchLoading, setEquityResearchLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [equityResearchError, setEquityResearchError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setMarketAssets(await getMarketAssets())
        setMarketError(null)
      } catch (error) {
        console.error('Failed to load market assets:', error)
        setMarketError('Unable to load synchronized market data.')
      } finally {
        setMarketLoading(false)
      }
    }

    const loadTrade = async () => {
      try {
        setTradeDashboard(await getTradeDashboard())
        setTradeError(null)
      } catch (error) {
        console.error('Failed to load trade intelligence:', error)
        setTradeError('Unable to load synchronized trade data.')
      } finally {
        setTradeLoading(false)
      }
    }

    const loadForecasts = async () => {
      try {
        setForecasts(await getLatestForecasts())
        setForecastError(null)
      } catch (error) {
        console.error('Failed to load forecasts:', error)
        setForecastError('Forecast output is temporarily unavailable.')
      } finally {
        setForecastLoading(false)
      }
    }

    const loadEquityResearch = async () => {
      try {
        setEquityResearch(await getGlobalEquityResearch())
        setEquityResearchError(null)
      } catch (error) {
        console.error('Failed to load equity research:', error)
        setEquityResearchError('Unable to load the equity research registry.')
      } finally {
        setEquityResearchLoading(false)
      }
    }

    const loadPayments = async () => {
      try {
        setCorridors(await getPaymentCorridors())
        setPaymentError(null)
      } catch (error) {
        console.error('Failed to load payment corridors:', error)
        setPaymentError('Payment corridor configuration is unavailable.')
      } finally {
        setPaymentLoading(false)
      }
    }

    void Promise.all([
      loadMarkets(),
      loadTrade(),
      loadForecasts(),
      loadEquityResearch(),
      loadPayments(),
    ])

    const channel = supabase
      .channel('tradepulse-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_observations' },
        () => void loadMarkets(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_observations' },
        () => void loadTrade(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_forecasts' },
        () => {
          void loadForecasts()
          void loadEquityResearch()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equity_research_scores' },
        () => void loadEquityResearch(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const markets = marketAssets.map((asset) => {
    const change = asset.change_percent
    const tone =
      change === null ? 'neutral' : change >= 0 ? 'positive' : 'negative'

    return {
      ...asset,
      value: formatMarketPrice(asset.symbol, asset.price),
      change:
        change === null
          ? '—'
          : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      tone,
    }
  })

  return (
    <div className="app-shell" id="dashboard">
      <header className="topbar">
        <a className="brand-wrap" href="#dashboard" aria-label="TradePulse AI home">
          <div className="brand-mark">
            <TrendingUp size={18} />
          </div>

          <div className="brand-copy">
            <span className="brand-name">TradePulse AI</span>
            <span className="brand-stage">Platform foundation</span>
          </div>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <a
              key={item.label}
              className={index === 0 ? 'nav-item active' : 'nav-item'}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <span className="environment-pill">Data intelligence</span>
      </header>

      <main className="dashboard">
        <section className="page-header">
          <div>
            <p className="eyebrow">Global markets · AI research · risk</p>
            <h1>Research every covered stock with evidence</h1>
            <p className="subtitle">
              Search licensed market coverage, compare transparent opportunity
              rankings, inspect per-stock forecast uncertainty, and test ideas
              in paper portfolios under measurable risk controls.
            </p>
          </div>

          <div className="data-trust-card">
            <DatabaseZap size={18} />
            <div>
              <strong>Truth before prediction</strong>
              <span>Missing data stays missing—never presented as a live signal.</span>
            </div>
          </div>
        </section>

        <PlatformReadiness />

        <GlobalEquityResearchPanel
          securities={equityResearch}
          loading={equityResearchLoading}
          error={equityResearchError}
        />

        <section className="kpi-grid" aria-label="Trade performance indicators">
          {(tradeDashboard.kpis.length > 0
            ? tradeDashboard.kpis
            : emptyKpis
          ).map((kpi) => {
            const TrendIcon =
              kpi.tone === 'negative' ? ArrowDownRight : ArrowUpRight

            return (
              <article key={kpi.label} className="kpi-card">
                <div className="kpi-header">
                  <span>{kpi.label}</span>
                  <span className={`trend-pill ${kpi.tone}`}>
                    <TrendIcon size={14} /> {kpi.change}
                  </span>
                </div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-note">{kpi.note}</div>
              </article>
            )
          })}
        </section>

        <section className="content-grid">
          <article className="panel market-panel" id="markets">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Market overview</p>
                <h2>Latest synchronized prices</h2>
              </div>
              <span className="source-label">Supabase snapshot</span>
            </div>

            <div className="market-grid">
              {marketLoading ? (
                <div className="market-state" role="status">
                  Loading market data…
                </div>
              ) : marketError ? (
                <div className="market-state" role="alert">
                  {marketError}
                </div>
              ) : markets.length === 0 ? (
                <div className="market-state" role="status">
                  No market assets are configured.
                </div>
              ) : (
                markets.map((market) => (
                  <div key={market.symbol} className="market-card">
                    <div className="market-title-row">
                      <span className="market-label">{market.symbol}</span>
                      <span className={`market-chip ${market.tone}`}>
                        {market.change}
                      </span>
                    </div>
                    <div className="market-value">{market.value}</div>
                    <div className="market-footnote">
                      {market.observed_at
                        ? `Updated ${new Date(market.observed_at).toLocaleString()}`
                        : 'Awaiting provider data'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Global trade trends</p>
                <h2>Tracked export vs import volume</h2>
              </div>
              <span className="source-label">USD billions</span>
            </div>

            {tradeLoading ? (
              <div className="chart-empty" role="status">
                Loading trade series…
              </div>
            ) : tradeError ? (
              <div className="chart-empty" role="alert">
                {tradeError}
              </div>
            ) : tradeDashboard.trend.length === 0 ? (
              <div className="chart-empty" role="status">
                The chart will appear after the first verified trade-data sync.
              </div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={tradeDashboard.trend}
                    margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="exportsFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="importsFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [`$${value}B`, 'Value']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 12,
                        color: '#e2e8f0',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="exports"
                      stroke="#4f46e5"
                      fill="url(#exportsFill)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="imports"
                      stroke="#0ea5e9"
                      fill="url(#importsFill)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>
        </section>

        <div className="feature-grid">
          <ForecastPanel
            forecasts={forecasts}
            loading={forecastLoading}
            error={forecastError}
          />
        </div>

        <PaperInvestingPanel marketAssets={marketAssets} />

        <PortfolioRiskCommandCenter />

        <section className="panel table-panel" id="trade-data">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Country intelligence</p>
              <h2>Tracked cross-border volume leaders</h2>
            </div>
            <span className="source-label">Latest verified period</span>
          </div>

          {tradeLoading ? (
            <div className="table-empty" role="status">Loading country data…</div>
          ) : tradeError ? (
            <div className="table-empty" role="alert">{tradeError}</div>
          ) : tradeDashboard.countries.length === 0 ? (
            <div className="table-empty" role="status">
              Country rankings will appear after verified observations are synchronized.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Exports</th>
                    <th>Imports</th>
                    <th>Trade balance</th>
                    <th>Growth</th>
                    <th>Period</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeDashboard.countries.map((country) => (
                    <tr key={country.isoCode}>
                      <td className="country-cell">
                        <div className="country-flag">{country.isoCode}</div>
                        {country.country}
                      </td>
                      <td>{usd.format(country.exports)}</td>
                      <td>{usd.format(country.imports)}</td>
                      <td className={country.balance < 0 ? 'negative-text' : 'positive-text'}>
                        {usd.format(country.balance)}
                      </td>
                      <td className="growth-cell">
                        <span className={`growth-pill ${
                          country.growthPercent !== null && country.growthPercent < 0
                            ? 'negative'
                            : country.growthPercent === null
                              ? 'neutral'
                              : ''
                        }`}>
                          {formatGrowth(country.growthPercent)}
                        </span>
                      </td>
                      <td>{country.periodDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <PaymentQuotePanel
          corridors={corridors}
          marketAssets={marketAssets}
          loading={paymentLoading}
          error={paymentError}
        />

        <footer className="product-footer">
          <span>TradePulse AI · Global equity research foundation</span>
          <span>Research classifications and forecasts are not financial advice.</span>
        </footer>
      </main>
    </div>
  )
}

export default App
