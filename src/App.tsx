import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  DatabaseZap,
  TrendingUp,
} from 'lucide-react'

import { DeferredSection } from './components/DeferredSection'
import { GuidedOnboarding } from './components/GuidedOnboarding'
import { PlatformReadiness } from './components/PlatformReadiness'
import { ProductErrorBoundary } from './components/ProductErrorBoundary'
import { SystemStatusPanel } from './components/SystemStatusPanel'
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

const AcademyPanel = lazy(() => import('./components/AcademyPanel').then((module) => ({
  default: module.AcademyPanel,
})))
const AccountSecurityPanel = lazy(() => import('./components/AccountSecurityPanel').then((module) => ({
  default: module.AccountSecurityPanel,
})))
const CustomerPrivacyPanel = lazy(() => import('./components/CustomerPrivacyPanel').then((module) => ({
  default: module.CustomerPrivacyPanel,
})))
const DataTrustNotificationPanel = lazy(() => import('./components/DataTrustNotificationPanel').then((module) => ({
  default: module.DataTrustNotificationPanel,
})))
const MonetizationPanel = lazy(() => import('./components/MonetizationPanel').then((module) => ({
  default: module.MonetizationPanel,
})))
const CustomerExperiencePanel = lazy(() => import('./components/CustomerExperiencePanel').then((module) => ({
  default: module.CustomerExperiencePanel,
})))
const BrokerageReadinessPanel = lazy(() => import('./components/BrokerageReadinessPanel').then((module) => ({
  default: module.BrokerageReadinessPanel,
})))
const ForecastPanel = lazy(() => import('./components/ForecastPanel').then((module) => ({
  default: module.ForecastPanel,
})))
const GlobalEquityResearchPanel = lazy(() => import('./components/GlobalEquityResearchPanel').then((module) => ({
  default: module.GlobalEquityResearchPanel,
})))
const PaymentQuotePanel = lazy(() => import('./components/PaymentQuotePanel').then((module) => ({
  default: module.PaymentQuotePanel,
})))
const PaperInvestingPanel = lazy(() => import('./components/PaperInvestingPanel').then((module) => ({
  default: module.PaperInvestingPanel,
})))
const PortfolioRiskCommandCenter = lazy(() => import('./components/PortfolioRiskCommandCenter').then((module) => ({
  default: module.PortfolioRiskCommandCenter,
})))
const ResearchCopilotPanel = lazy(() => import('./components/ResearchCopilotPanel').then((module) => ({
  default: module.ResearchCopilotPanel,
})))
const TradeTrendChart = lazy(() => import('./components/TradeTrendChart').then((module) => ({
  default: module.TradeTrendChart,
})))

function SectionLoader({ label }: { label: string }) {
  return (
    <div className="deferred-section-placeholder" role="status">
      <span className="deferred-section-pulse" />
      <strong>{label}</strong>
      <small>Loading optimized product module</small>
    </div>
  )
}

const navItems = [
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Stock research', href: '#stock-research' },
  { label: 'AI Copilot', href: '#research-copilot' },
  { label: 'Academy', href: '#academy' },
  { label: 'Security', href: '#account-security' },
  { label: 'Privacy', href: '#customer-privacy' },
  { label: 'Data trust', href: '#data-trust' },
  { label: 'Plans', href: '#plans' },
  { label: 'Experience', href: '#customer-experience' },
  { label: 'Markets', href: '#markets' },
  { label: 'Forecasts', href: '#forecasts' },
  { label: 'Paper investing', href: '#paper-investing' },
  { label: 'Risk center', href: '#risk-command-center' },
  { label: 'Brokerage readiness', href: '#brokerage-readiness' },
  { label: 'Trade data', href: '#trade-data' },
  { label: 'Payments', href: '#payments' },
  { label: 'System status', href: '#system-status' },
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
  const [paymentRequested, setPaymentRequested] = useState(false)
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

    void Promise.all([
      loadMarkets(),
      loadTrade(),
      loadForecasts(),
      loadEquityResearch(),
    ])

    const refreshTimers = new Map<string, number>()
    const scheduleRefresh = (key: string, refresh: () => void) => {
      const existing = refreshTimers.get(key)
      if (existing !== undefined) window.clearTimeout(existing)
      refreshTimers.set(key, window.setTimeout(() => {
        refreshTimers.delete(key)
        refresh()
      }, 300))
    }

    const channel = supabase
      .channel('tradepulse-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_observations' },
        () => scheduleRefresh('markets', () => void loadMarkets()),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_observations' },
        () => scheduleRefresh('trade', () => void loadTrade()),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_forecasts' },
        () => {
          scheduleRefresh('forecasts', () => void loadForecasts())
          scheduleRefresh('equity-research', () => void loadEquityResearch())
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forecast_reliability_snapshots',
        },
        () => {
          scheduleRefresh('forecasts', () => void loadForecasts())
          scheduleRefresh('equity-research', () => void loadEquityResearch())
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equity_research_scores' },
        () => scheduleRefresh('equity-research', () => void loadEquityResearch()),
      )
      .subscribe()

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer))
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!paymentRequested) return

    void getPaymentCorridors()
      .then((nextCorridors) => {
        setCorridors(nextCorridors)
        setPaymentError(null)
      })
      .catch((error) => {
        console.error('Failed to load payment corridors:', error)
        setPaymentError('Payment corridor configuration is unavailable.')
      })
      .finally(() => setPaymentLoading(false))
  }, [paymentRequested])

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
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <GuidedOnboarding />
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

      <main className="dashboard" id="main-content" tabIndex={-1}>
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

        <SystemStatusPanel />

        <DeferredSection id="account-security" label="Account Security Center" minimumHeight={480}>
          <ProductErrorBoundary title="Account security is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Account Security Center" />}>
              <AccountSecurityPanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="customer-privacy" label="Data Control Center" minimumHeight={360}>
          <ProductErrorBoundary title="Privacy controls are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Data Control Center" />}>
              <CustomerPrivacyPanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="data-trust" label="Data Trust and Notifications" minimumHeight={420}>
          <ProductErrorBoundary title="Data trust controls are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Data Trust and Notifications" />}>
              <DataTrustNotificationPanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="plans" label="Plans and Entitlements" minimumHeight={520}>
          <ProductErrorBoundary title="Commercial plans are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Plans and Entitlements" />}>
              <MonetizationPanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="customer-experience" label="Customer Experience" minimumHeight={440}>
          <ProductErrorBoundary title="Customer experience controls are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Customer Experience" />}>
              <CustomerExperiencePanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="stock-research" label="Stock research" minimumHeight={620}>
          <ProductErrorBoundary title="Stock research is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Stock research" />}>
              <GlobalEquityResearchPanel
                securities={equityResearch}
                loading={equityResearchLoading}
                error={equityResearchError}
              />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="research-copilot" label="AI research copilot" minimumHeight={460}>
          <ProductErrorBoundary title="The research copilot is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="AI research copilot" />}>
              <ResearchCopilotPanel
                securities={equityResearch}
                researchLoading={equityResearchLoading}
              />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="academy" label="TradePulse Academy" minimumHeight={420}>
          <ProductErrorBoundary title="TradePulse Academy is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="TradePulse Academy" />}>
              <AcademyPanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

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

        <DeferredSection id="markets" label="Market and trade intelligence" minimumHeight={430}>
          <section className="content-grid">
          <article className="panel market-panel">
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

            <ProductErrorBoundary title="Trade trend visualization is temporarily unavailable">
              <Suspense fallback={<SectionLoader label="Global trade trends" />}>
                <TradeTrendChart
                  dashboard={tradeDashboard}
                  loading={tradeLoading}
                  error={tradeError}
                />
              </Suspense>
            </ProductErrorBoundary>
          </section>
        </DeferredSection>

        <DeferredSection id="forecasts" label="Forecast intelligence" minimumHeight={360}>
          <ProductErrorBoundary title="Forecast intelligence is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Forecast intelligence" />}>
              <div className="feature-grid">
                <ForecastPanel
                  forecasts={forecasts}
                  loading={forecastLoading}
                  error={forecastError}
                />
              </div>
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="paper-investing" label="Paper investing" minimumHeight={520}>
          <ProductErrorBoundary title="Paper investing is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Paper investing" />}>
              <PaperInvestingPanel marketAssets={marketAssets} />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="risk-command-center" label="Portfolio risk command center" minimumHeight={500}>
          <ProductErrorBoundary title="The risk command center is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Portfolio risk command center" />}>
              <PortfolioRiskCommandCenter />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <DeferredSection id="brokerage-readiness" label="Brokerage readiness" minimumHeight={520}>
          <ProductErrorBoundary title="Brokerage readiness is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Brokerage readiness" />}>
              <BrokerageReadinessPanel />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

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

        <DeferredSection
          id="payments"
          label="Cross-border payment sandbox"
          minimumHeight={360}
          onVisible={() => setPaymentRequested(true)}
        >
          <ProductErrorBoundary title="Payment quotes are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Cross-border payment sandbox" />}>
              <PaymentQuotePanel
                corridors={corridors}
                marketAssets={marketAssets}
                loading={paymentLoading}
                error={paymentError}
              />
            </Suspense>
          </ProductErrorBoundary>
        </DeferredSection>

        <footer className="product-footer">
          <span>TradePulse AI · Research, learning and regulated-trading foundation</span>
          <span>Research classifications and forecasts are not financial advice.</span>
        </footer>
      </main>
    </div>
  )
}

export default App
