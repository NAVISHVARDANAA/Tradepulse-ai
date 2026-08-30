import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react'

import { GuidedOnboarding } from './components/GuidedOnboarding'
import { PlatformReadiness } from './components/PlatformReadiness'
import { ProductErrorBoundary } from './components/ProductErrorBoundary'
import { ProductPageHeader } from './components/ProductPageHeader'
import {
  ProductNavigation,
  productHrefFromHash,
  type ProductHref,
} from './components/ProductNavigation'
import { SystemStatusPanel } from './components/SystemStatusPanel'
import { productDataRequirements } from './lib/productDataRequirements'
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
const AnalyticsStudioPanel = lazy(() => import('./components/AnalyticsStudioPanel').then((module) => ({
  default: module.AnalyticsStudioPanel,
})))
const AccountSecurityPanel = lazy(() => import('./components/AccountSecurityPanel').then((module) => ({
  default: module.AccountSecurityPanel,
})))
const BetaOperationsPanel = lazy(() => import('./components/BetaOperationsPanel').then((module) => ({
  default: module.BetaOperationsPanel,
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
const CustomerSupportPanel = lazy(() => import('./components/CustomerSupportPanel').then((module) => ({
  default: module.CustomerSupportPanel,
})))
const BusinessWorkspacePanel = lazy(() => import('./components/BusinessWorkspacePanel').then((module) => ({
  default: module.BusinessWorkspacePanel,
})))
const BusinessResearchPanel = lazy(() => import('./components/BusinessResearchPanel').then((module) => ({
  default: module.BusinessResearchPanel,
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

async function loadProductData<T>(
  query: () => Promise<T>,
  setValue: (value: T) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string | null) => void,
  errorMessage: string,
) {
  setLoading(true)
  try {
    setValue(await query())
    setError(null)
  } catch (error) {
    console.error(errorMessage, error)
    setError(errorMessage)
  } finally {
    setLoading(false)
  }
}

function App() {
  const [activeHref, setActiveHref] = useState<ProductHref>(() =>
    productHrefFromHash(window.location.hash),
  )
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
    const followRoute = () => setActiveHref(productHrefFromHash(window.location.hash))
    window.addEventListener('hashchange', followRoute)
    followRoute()
    return () => window.removeEventListener('hashchange', followRoute)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector(activeHref)?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeHref])

  useEffect(() => {
    const dataRequirements = productDataRequirements(activeHref)
    if (dataRequirements.length === 0) return

    const referenceData = () => import('./lib/queries/referenceData')
    const loadMarkets = () => loadProductData(
      () => referenceData().then(({ getMarketAssets }) => getMarketAssets()),
      setMarketAssets,
      setMarketLoading,
      setMarketError,
      'Unable to load synchronized market data.',
    )
    const loadTrade = () => loadProductData(
      () => referenceData().then(({ getTradeDashboard }) => getTradeDashboard()),
      setTradeDashboard,
      setTradeLoading,
      setTradeError,
      'Unable to load synchronized trade data.',
    )
    const loadForecasts = () => loadProductData(
      () => referenceData().then(({ getLatestForecasts }) => getLatestForecasts()),
      setForecasts,
      setForecastLoading,
      setForecastError,
      'Forecast output is temporarily unavailable.',
    )
    const loadEquityResearch = () => loadProductData(
      () => import('./lib/queries/equityResearch')
        .then(({ getGlobalEquityResearch }) => getGlobalEquityResearch()),
      setEquityResearch,
      setEquityResearchLoading,
      setEquityResearchError,
      'Unable to load the equity research registry.',
    )

    const loaders = {
      markets: loadMarkets,
      trade: loadTrade,
      forecasts: loadForecasts,
      equity: loadEquityResearch,
    }
    dataRequirements.forEach((domain) => void loaders[domain]())

    const refreshTimers = new Map<string, number>()
    const scheduleRefresh = (key: string, refresh: () => void) => {
      const existing = refreshTimers.get(key)
      if (existing !== undefined) window.clearTimeout(existing)
      refreshTimers.set(key, window.setTimeout(() => {
        refreshTimers.delete(key)
        refresh()
      }, 300))
    }

    const has = (domain: keyof typeof loaders) => dataRequirements.includes(domain)
    const scheduleDomain = (domain: keyof typeof loaders) => {
      scheduleRefresh(domain, () => void loaders[domain]())
    }
    const refreshForecastConsumers = () => {
      if (has('forecasts')) scheduleDomain('forecasts')
      if (has('equity')) scheduleDomain('equity')
    }

    const forecastConsumers = has('forecasts') || has('equity')
    const subscriptions: Array<[
      boolean,
      string,
      () => void,
      ('*' | 'INSERT')?,
    ]> = [
      [has('markets'), 'market_observations', () => scheduleDomain('markets')],
      [has('trade'), 'trade_observations', () => scheduleDomain('trade')],
      [forecastConsumers, 'market_forecasts', refreshForecastConsumers],
      [forecastConsumers, 'forecast_reliability_snapshots', refreshForecastConsumers, 'INSERT'],
      [has('equity'), 'equity_research_scores', () => scheduleDomain('equity')],
    ]

    let scopedChannel = supabase.channel(`tradepulse-product-data-${activeHref.slice(1)}`)
    subscriptions.forEach(([enabled, table, refresh, event = '*']) => {
      if (enabled) {
        scopedChannel = scopedChannel.on(
          'postgres_changes',
          { event, schema: 'public', table },
          refresh,
        )
      }
    })

    const channel = scopedChannel.subscribe()

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer))
      void supabase.removeChannel(channel)
    }
  }, [activeHref])

  useEffect(() => {
    if (activeHref !== '#payments') return

    void loadProductData(
      () => import('./lib/queries/referenceData')
        .then(({ getPaymentCorridors }) => getPaymentCorridors()),
      setCorridors,
      setPaymentLoading,
      setPaymentError,
      'Payment corridor configuration is unavailable.',
    )
  }, [activeHref])

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
            <span className="brand-stage">Controlled beta</span>
          </div>
        </a>

        <ProductNavigation activeHref={activeHref} />

        <span className="environment-pill">Data intelligence</span>
      </header>

      <main className="dashboard" id="main-content" tabIndex={-1}>
        <ProductPageHeader activeHref={activeHref} />

        {activeHref === '#dashboard' ? (
          <div className="overview-workspace" aria-label="TradePulse workspaces">
            <PlatformReadiness />
            <SystemStatusPanel />
          </div>
        ) : null}

        {activeHref === '#system-status' ? <SystemStatusPanel /> : null}

        {activeHref === '#analytics-studio' ? <section id="analytics-studio" className="product-workspace">
          <ProductErrorBoundary title="Analytics Studio is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Governed Analytics Studio" />}>
              <AnalyticsStudioPanel
                marketAssets={marketAssets}
                forecasts={forecasts}
                equityResearch={equityResearch}
                tradeDashboard={tradeDashboard}
              />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#account-security' ? <section id="account-security" className="product-workspace">
          <ProductErrorBoundary title="Account security is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Account Security Center" />}>
              <AccountSecurityPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#beta-operations' ? <section id="beta-operations" className="product-workspace">
          <ProductErrorBoundary title="Beta operations are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Controlled-beta launch center" />}>
              <BetaOperationsPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#customer-privacy' ? <section id="customer-privacy" className="product-workspace">
          <ProductErrorBoundary title="Privacy controls are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Data Control Center" />}>
              <CustomerPrivacyPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#data-trust' ? <section id="data-trust" className="product-workspace">
          <ProductErrorBoundary title="Data trust controls are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Data Trust and Notifications" />}>
              <DataTrustNotificationPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#plans' ? <section id="plans" className="product-workspace">
          <ProductErrorBoundary title="Commercial plans are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Plans and Entitlements" />}>
              <MonetizationPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#customer-experience' ? <section id="customer-experience" className="product-workspace">
          <ProductErrorBoundary title="Customer experience controls are temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Customer Experience" />}>
              <CustomerExperiencePanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#customer-support' ? <section id="customer-support" className="product-workspace">
          <ProductErrorBoundary title="Customer support is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Customer Support" />}>
              <CustomerSupportPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#business-workspace' ? <section id="business-workspace" className="product-workspace">
          <ProductErrorBoundary title="Business workspace is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Business Workspace" />}>
              <BusinessWorkspacePanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#business-research' ? <section id="business-research" className="product-workspace">
          <ProductErrorBoundary title="Shared Business research is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Shared Business Research" />}>
              <BusinessResearchPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#stock-research' ? <section id="stock-research" className="product-workspace">
          <ProductErrorBoundary title="Stock research is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Stock research" />}>
              <GlobalEquityResearchPanel
                securities={equityResearch}
                loading={equityResearchLoading}
                error={equityResearchError}
              />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#research-copilot' ? <section id="research-copilot" className="product-workspace">
          <ProductErrorBoundary title="The research copilot is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="AI research copilot" />}>
              <ResearchCopilotPanel
                securities={equityResearch}
                researchLoading={equityResearchLoading}
              />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#academy' ? <section id="academy" className="product-workspace">
          <ProductErrorBoundary title="TradePulse Academy is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="TradePulse Academy" />}>
              <AcademyPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#markets' ? <section className="kpi-grid" aria-label="Trade performance indicators">
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
        </section> : null}

        {activeHref === '#markets' ? <section id="markets" className="product-workspace">
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
        </section> : null}

        {activeHref === '#forecasts' ? <section id="forecasts" className="product-workspace">
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
        </section> : null}

        {activeHref === '#paper-investing' ? <section id="paper-investing" className="product-workspace">
          <ProductErrorBoundary title="Paper investing is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Paper investing" />}>
              <PaperInvestingPanel marketAssets={marketAssets} />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#risk-command-center' ? <section id="risk-command-center" className="product-workspace">
          <ProductErrorBoundary title="The risk command center is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Portfolio risk command center" />}>
              <PortfolioRiskCommandCenter />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#brokerage-readiness' ? <section id="brokerage-readiness" className="product-workspace">
          <ProductErrorBoundary title="Brokerage readiness is temporarily unavailable">
            <Suspense fallback={<SectionLoader label="Brokerage readiness" />}>
              <BrokerageReadinessPanel />
            </Suspense>
          </ProductErrorBoundary>
        </section> : null}

        {activeHref === '#trade-data' ? <section className="panel table-panel product-workspace" id="trade-data">
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
        </section> : null}

        {activeHref === '#payments' ? <section id="payments" className="product-workspace">
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
        </section> : null}

        <footer className="product-footer">
          <span>TradePulse AI · Research, learning and regulated-trading foundation</span>
          <span>Research classifications and forecasts are not financial advice.</span>
        </footer>
      </main>
    </div>
  )
}

export default App
