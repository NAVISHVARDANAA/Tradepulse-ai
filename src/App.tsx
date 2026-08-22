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
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  TrendingUp,
} from 'lucide-react'

import { supabase } from './lib/supabase/client'
import { getMarketAssets } from './lib/queries/referenceData'

const navItems = ['Dashboard', 'Markets', 'Trade Data', 'AI Insights', 'Watchlist']

const kpis = [
  {
    label: 'Global Trade Volume',
    value: '$3.84T',
    change: '+8.4%',
    note: 'vs last quarter',
    trend: 'up',
  },
  {
    label: 'Export Growth',
    value: '+6.2%',
    change: '+1.4 pts',
    note: 'from prior month',
    trend: 'up',
  },
  {
    label: 'Import Growth',
    value: '+4.9%',
    change: '+0.8 pts',
    note: 'cross-border demand',
    trend: 'up',
  },
  {
    label: 'Trade Balance',
    value: '$184B',
    change: '+$21B',
    note: 'surplus expansion',
    trend: 'up',
  },
]

const trendData = [
  { month: 'Jan', exports: 42, imports: 38, balance: 4 },
  { month: 'Feb', exports: 44, imports: 39, balance: 5 },
  { month: 'Mar', exports: 46, imports: 41, balance: 5 },
  { month: 'Apr', exports: 49, imports: 43, balance: 6 },
  { month: 'May', exports: 51, imports: 45, balance: 6 },
  { month: 'Jun', exports: 54, imports: 47, balance: 7 },
  { month: 'Jul', exports: 57, imports: 49, balance: 8 },
]

const insights = [
  {
    title: 'Asia export corridor accelerating',
    summary:
      'Southeast Asian exporters are outpacing G7 demand across containers and electronics.',
    impact: 'High confidence',
  },
  {
    title: 'Energy hedging remains elevated',
    summary:
      'Shipping costs and crude volatility are reshaping route profitability for industrial goods.',
    impact: 'Watchlist',
  },
  {
    title: 'AI demand lift in semiconductors',
    summary:
      'Chip-related shipments are trending above seasonal norms with stronger cross-border orders.',
    impact: 'Positive signal',
  },
]

const countries = [
  {
    country: 'China',
    exports: '$2.4T',
    imports: '$1.9T',
    balance: '$500B',
    growth: '+7.1%',
  },
  {
    country: 'United States',
    exports: '$1.9T',
    imports: '$2.1T',
    balance: '-$200B',
    growth: '+4.8%',
  },
  {
    country: 'Germany',
    exports: '$1.6T',
    imports: '$1.4T',
    balance: '$200B',
    growth: '+6.3%',
  },
  {
    country: 'India',
    exports: '$0.8T',
    imports: '$0.7T',
    balance: '$100B',
    growth: '+9.2%',
  },
  {
    country: 'Japan',
    exports: '$0.9T',
    imports: '$0.8T',
    balance: '$100B',
    growth: '+5.6%',
  },
]

function App() {
  const [marketAssets, setMarketAssets] = useState<
    Awaited<ReturnType<typeof getMarketAssets>>
  >([])

  const [marketLoading, setMarketLoading] = useState(true)
  const [marketError, setMarketError] = useState<string | null>(null)

  useEffect(() => {
    getMarketAssets()
      .then((data) => {
        setMarketAssets(data)
        setMarketError(null)
      })
      .catch((error) => {
        console.error('Failed to load market assets:', error)
        setMarketError('Unable to load market data.')
      })
      .finally(() => {
        setMarketLoading(false)
      })

    const channel = supabase
      .channel('market-observations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_observations',
        },
        () => {
          getMarketAssets()
            .then((data) => {
              setMarketAssets(data)
              setMarketError(null)
            })
            .catch((error) => {
              console.error('Failed to refresh market assets:', error)
              setMarketError('Unable to refresh market data.')
            })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatMarketPrice = (
    symbol: string,
    price: number | null,
  ) => {
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

  const markets = marketAssets.map((asset) => {
    const change = asset.change_percent
    const tone =
      change === null ? 'neutral' : change >= 0 ? 'positive' : 'negative'

    return {
      name: asset.symbol,
      value: formatMarketPrice(asset.symbol, asset.price),
      change:
        change === null
          ? '—'
          : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      tone,
    }
  })

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">
            <TrendingUp size={18} />
          </div>

          <div className="brand-copy">
            <span className="brand-name">TradePulse AI</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <button
              key={item}
              className={index === 0 ? 'nav-item active' : 'nav-item'}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="ghost-button" type="button">
            Portfolio
          </button>

          <button
            className="avatar-button"
            type="button"
            aria-label="Account settings"
          >
            <span>TN</span>
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="page-header">
          <div>
            <p className="eyebrow">Global macro intelligence</p>

            <h1>Global Trade Intelligence</h1>

            <p className="subtitle">
              Monitor global trade, markets and economic signals in one place.
            </p>
          </div>

          <div className="header-controls">
            <button className="secondary-button" type="button">
              Export report
            </button>

            <button className="primary-button" type="button">
              Live signals
            </button>
          </div>
        </section>

        <section
          className="kpi-grid"
          aria-label="Key performance indicators"
        >
          {kpis.map((kpi) => (
            <article key={kpi.label} className="kpi-card">
              <div className="kpi-header">
                <span>{kpi.label}</span>

                <span
                  className={
                    kpi.trend === 'up'
                      ? 'trend-pill up'
                      : 'trend-pill down'
                  }
                >
                  <ArrowUpRight size={14} />
                  {kpi.change}
                </span>
              </div>

              <div className="kpi-value">{kpi.value}</div>

              <div className="kpi-note">{kpi.note}</div>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel market-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Market Overview</p>
                <h2>Macro watchlist</h2>
              </div>

              <button className="text-button" type="button">
                View all <ChevronDown size={14} />
              </button>
            </div>

            <div className="market-grid">
              {marketLoading ? (
                <div className="market-state" role="status">
                  Loading market data...
                </div>
              ) : marketError ? (
                <div className="market-state" role="alert">
                  {marketError}
                </div>
              ) : markets.length === 0 ? (
                <div className="market-state" role="status">
                  No market observations available.
                </div>
              ) : (
                markets.map((market) => (
                  <div key={market.name} className="market-card">
                    <div className="market-title-row">
                      <span className="market-label">
                        {market.name}
                      </span>

                      <span
                        className={`market-chip ${market.tone}`}
                      >
                        {market.change}
                      </span>
                    </div>

                    <div className="market-value">
                      {market.value}
                    </div>

                    <div className="market-footnote">
                      {market.tone === 'positive'
                        ? 'Positive momentum'
                        : market.tone === 'negative'
                          ? 'Pullback watch'
                          : 'Awaiting live data'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Global Trade Trends</p>

                <h2>Export vs import momentum</h2>
              </div>

              <button className="text-button" type="button">
                12M view
              </button>
            </div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{
                    top: 10,
                    right: 16,
                    left: -8,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="exportsFill"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4f46e5"
                        stopOpacity={0.38}
                      />

                      <stop
                        offset="100%"
                        stopColor="#4f46e5"
                        stopOpacity={0.04}
                      />
                    </linearGradient>

                    <linearGradient
                      id="importsFill"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.3}
                      />

                      <stop
                        offset="100%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="rgba(148, 163, 184, 0.18)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: '#94a3b8',
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: '#94a3b8',
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    formatter={(value: number | string) => [
                      `$${value}B`,
                      'Value',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border:
                        '1px solid rgba(148, 163, 184, 0.2)',
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
          </article>
        </section>

        <section className="panel insights-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Latest AI Insights</p>
              <h2>Signal summary</h2>
            </div>

            <button className="text-button" type="button">
              AI briefing
            </button>
          </div>

          <div className="insights-grid">
            {insights.map((insight) => (
              <article
                key={insight.title}
                className="insight-card"
              >
                <div className="insight-topline">
                  <div className="insight-badge">
                    <BrainCircuit size={14} />
                  </div>

                  <span className="impact-pill">
                    {insight.impact}
                  </span>
                </div>

                <h3>{insight.title}</h3>

                <p>{insight.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Top Trading Countries</p>
              <h2>Cross-border volume leaders</h2>
            </div>

            <button className="text-button" type="button">
              Full ranking
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Exports</th>
                  <th>Imports</th>
                  <th>Trade Balance</th>
                  <th>Growth</th>
                </tr>
              </thead>

              <tbody>
                {countries.map((country) => (
                  <tr key={country.country}>
                    <td className="country-cell">
                      <div className="country-flag">
                        {country.country.slice(0, 1)}
                      </div>

                      {country.country}
                    </td>

                    <td>{country.exports}</td>

                    <td>{country.imports}</td>

                    <td
                      className={
                        country.balance.startsWith('-')
                          ? 'negative-text'
                          : 'positive-text'
                      }
                    >
                      {country.balance}
                    </td>

                    <td className="growth-cell">
                      <span className="growth-pill">
                        {country.growth}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
