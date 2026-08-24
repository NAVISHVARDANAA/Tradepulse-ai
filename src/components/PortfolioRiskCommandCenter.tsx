import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Gauge,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { useAuth } from '../lib/auth/AuthProvider'
import {
  getPaperPortfolios,
  type PaperPortfolio,
} from '../lib/queries/paperTrading'
import {
  getPortfolioRiskDashboard,
  refreshPaperRisk,
  setPaperTradingControl,
  type PortfolioRiskDashboard,
} from '../lib/queries/riskMonitoring'

const number = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function displayError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'The portfolio risk request could not be completed.'
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'Not run yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function PortfolioRiskCommandCenter() {
  const { session, loading: initialLoading } = useAuth()
  const [portfolios, setPortfolios] = useState<PaperPortfolio[]>([])
  const [portfolioId, setPortfolioId] = useState('')
  const [dashboard, setDashboard] =
    useState<PortfolioRiskDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      setPortfolios([])
      setPortfolioId('')
      setDashboard(null)
      return
    }

    void getPaperPortfolios()
      .then((nextPortfolios) => {
        setPortfolios(nextPortfolios)
        setPortfolioId((current) =>
          nextPortfolios.some((portfolio) => portfolio.id === current)
            ? current
            : nextPortfolios[0]?.id ?? '',
        )
      })
      .catch((loadError) => setError(displayError(loadError)))
  }, [session])

  const loadDashboard = async (selectedPortfolioId: string) => {
    if (!selectedPortfolioId) {
      setDashboard(null)
      return
    }

    setDashboard(await getPortfolioRiskDashboard(selectedPortfolioId))
  }

  useEffect(() => {
    void loadDashboard(portfolioId).catch((loadError) =>
      setError(displayError(loadError)),
    )
  }, [portfolioId])

  const selectedPortfolio = portfolios.find(
    (portfolio) => portfolio.id === portfolioId,
  )
  const latest = dashboard?.latest
  const limits = dashboard?.limits
  const control = dashboard?.control
  const criticalBreaches =
    latest?.breaches.filter((breach) => breach.severity === 'critical') ?? []

  const health = !latest
    ? { label: 'Not evaluated', tone: 'pending', icon: Activity }
    : control?.killSwitchActive
      ? { label: 'Trading paused', tone: 'critical', icon: Ban }
      : criticalBreaches.length
        ? { label: 'Action required', tone: 'critical', icon: ShieldAlert }
        : latest.breaches.length
          ? { label: 'Monitor limits', tone: 'warning', icon: AlertTriangle }
          : { label: 'Within limits', tone: 'healthy', icon: ShieldCheck }
  const HealthIcon = health.icon

  const chartData = useMemo(
    () =>
      dashboard?.history.map((point) => ({
        time: formatTimestamp(point.observedAt),
        nav: point.totalValue,
        exposure: point.grossExposure,
      })) ?? [],
    [dashboard?.history],
  )

  const handleRefresh = async () => {
    if (!portfolioId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await refreshPaperRisk(portfolioId)
      await loadDashboard(portfolioId)
      setSuccess('Risk snapshot and paper reconciliation completed.')
    } catch (requestError) {
      setError(displayError(requestError))
    } finally {
      setLoading(false)
    }
  }

  const handleTradingControl = async () => {
    if (!portfolioId || !control) return

    const tradingEnabled = control.killSwitchActive

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await setPaperTradingControl({
        portfolioId,
        tradingEnabled,
        reason: tradingEnabled ? undefined : 'Paused from Risk Command Center',
      })
      await loadDashboard(portfolioId)
      setSuccess(
        tradingEnabled
          ? 'Paper trading resumed.'
          : 'Paper trading paused. New simulated orders are blocked.',
      )
    } catch (requestError) {
      setError(displayError(requestError))
    } finally {
      setLoading(false)
    }
  }

  const guardrails = latest && limits
    ? [
        {
          label: 'Concentration',
          actual: latest.concentrationPercent,
          limit: limits.maxConcentrationPercent,
          suffix: '%',
          pass: latest.concentrationPercent <= limits.maxConcentrationPercent,
        },
        {
          label: 'Drawdown',
          actual: latest.drawdownPercent,
          limit: limits.maxDrawdownPercent,
          suffix: '%',
          pass: latest.drawdownPercent <= limits.maxDrawdownPercent,
        },
        {
          label: '95% one-day VaR',
          actual: latest.var95OneDay,
          limit: limits.varLimit,
          suffix: ` ${selectedPortfolio?.baseCurrency ?? ''}`,
          pass:
            latest.scenarioCount < 20 || latest.var95OneDay <= limits.varLimit,
          insufficient: latest.scenarioCount < 20,
        },
        {
          label: 'Cash reserve',
          actual: latest.cashPercent,
          limit: limits.minimumCashPercent,
          suffix: '%',
          pass: latest.cashPercent >= limits.minimumCashPercent,
          minimum: true,
        },
      ]
    : []

  return (
    <section className="panel risk-command-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Risk command center · Phase 3B</p>
          <h2>Portfolio controls and reconciliation</h2>
        </div>
        <div className="panel-header-actions">
          <AcademyLink courseSlug="paper-trading-risk" lessonSlug="risk-command-center" />
          <span className={`risk-health-badge ${health.tone}`}>
            <HealthIcon size={14} /> {health.label}
          </span>
        </div>
      </div>

      <p className="panel-description">
        Measure simulated NAV, exposure, concentration, drawdown and historical
        scenarios; reconcile every virtual balance and fill before execution
        integrations are considered.
      </p>

      {initialLoading ? (
        <div className="risk-empty" role="status">
          <RefreshCw size={20} /> Checking secure session…
        </div>
      ) : !session ? (
        <div className="risk-empty">
          <ShieldCheck size={22} />
          <div>
            <strong>Sign in through Paper Investing</strong>
            <span>Your private risk telemetry appears after authentication.</span>
          </div>
        </div>
      ) : portfolios.length === 0 ? (
        <div className="risk-empty">
          <Gauge size={22} />
          <div>
            <strong>Create a paper portfolio first</strong>
            <span>The risk engine only evaluates simulation portfolios.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="risk-toolbar">
            <label>
              Portfolio
              <select
                value={portfolioId}
                onChange={(event) => setPortfolioId(event.target.value)}
              >
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name} · {portfolio.baseCurrency}
                  </option>
                ))}
              </select>
            </label>
            <div className="risk-toolbar-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={loading}
                onClick={() => void handleRefresh()}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                Refresh risk and reconcile
              </button>
              {control ? (
                <button
                  className={control.killSwitchActive ? 'primary-button' : 'danger-button'}
                  type="button"
                  disabled={loading || (control.killSwitchActive && control.requiresReview)}
                  onClick={() => void handleTradingControl()}
                >
                  {control.killSwitchActive ? (
                    <><CheckCircle2 size={14} /> Resume paper trading</>
                  ) : (
                    <><Ban size={14} /> Pause paper trading</>
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {control?.killSwitchActive ? (
            <div className="kill-switch-banner" role="alert">
              <ShieldAlert size={20} />
              <div>
                <strong>Paper-trading kill switch is active</strong>
                <span>
                  {control.reason ?? 'New simulated orders are blocked.'}
                  {control.requiresReview
                    ? ' A risk review is required before resuming.'
                    : ''}
                </span>
              </div>
            </div>
          ) : null}

          {!latest ? (
            <div className="risk-empty">
              <Activity size={22} />
              <div>
                <strong>No risk snapshot yet</strong>
                <span>Run the first monitored valuation and reconciliation.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="risk-metric-grid">
                <article>
                  <span>Simulated NAV</span>
                  <strong>{number.format(latest.totalValue)} {selectedPortfolio?.baseCurrency}</strong>
                  <small>{formatTimestamp(latest.observedAt)}</small>
                </article>
                <article>
                  <span>Gross exposure</span>
                  <strong>{number.format(latest.grossExposure)} {selectedPortfolio?.baseCurrency}</strong>
                  <small>{latest.positionCount} open positions</small>
                </article>
                <article>
                  <span>Drawdown</span>
                  <strong>{number.format(latest.drawdownPercent)}%</strong>
                  <small>From monitored NAV peak</small>
                </article>
                <article>
                  <span>95% one-day scenario VaR</span>
                  <strong>
                    {latest.scenarioCount >= 20
                      ? `${number.format(latest.var95OneDay)} ${selectedPortfolio?.baseCurrency}`
                      : 'Building history'}
                  </strong>
                  <small>{latest.scenarioCount} daily scenarios</small>
                </article>
                <article>
                  <span>24-hour P&amp;L</span>
                  <strong className={(latest.dailyPnl ?? 0) >= 0 ? 'positive-text' : 'negative-text'}>
                    {latest.dailyPnl === null
                      ? 'Awaiting baseline'
                      : `${number.format(latest.dailyPnl)} ${selectedPortfolio?.baseCurrency}`}
                  </strong>
                  <small>Requires a snapshot at least 24h old</small>
                </article>
              </div>

              <div className="risk-content-grid">
                <div className="risk-chart-card">
                  <div className="paper-subheader">
                    <strong>Monitored NAV and exposure</strong>
                    <span>Last {chartData.length} snapshots</span>
                  </div>
                  <div className="risk-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="riskNavFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5ee7c4" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#5ee7c4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                        <XAxis dataKey="time" hide />
                        <YAxis tickFormatter={(value) => compactNumber.format(value)} width={48} />
                        <Tooltip
                          formatter={(value: number, name: string) => [number.format(value), name]}
                          contentStyle={{ background: '#101b31', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                        />
                        <Area type="monotone" dataKey="nav" name="NAV" stroke="#5ee7c4" fill="url(#riskNavFill)" strokeWidth={2} />
                        <Area type="monotone" dataKey="exposure" name="Gross exposure" stroke="#7aa2ff" fill="transparent" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="risk-guardrails-card">
                  <div className="paper-subheader">
                    <strong>Policy guardrails</strong>
                    <span>{limits?.ruleVersion}</span>
                  </div>
                  <div className="risk-guardrail-list">
                    {guardrails.map((guardrail) => (
                      <div key={guardrail.label} className="risk-guardrail-row">
                        <div>
                          <strong>{guardrail.label}</strong>
                          <span>
                            {guardrail.insufficient
                              ? 'Needs at least 20 scenarios'
                              : `${number.format(guardrail.actual)}${guardrail.suffix} / ${guardrail.minimum ? 'min' : 'max'} ${number.format(guardrail.limit)}${guardrail.suffix}`}
                          </span>
                        </div>
                        <span className={guardrail.insufficient ? 'pending' : guardrail.pass ? 'pass' : 'breach'}>
                          {guardrail.insufficient ? 'Building' : guardrail.pass ? 'Pass' : 'Breach'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="reconciliation-card">
                <div className="paper-subheader">
                  <strong>Paper reconciliation</strong>
                  <span>{formatTimestamp(dashboard?.reconciliation?.completedAt)}</span>
                </div>
                <div className="reconciliation-summary">
                  <div>
                    <span>Status</span>
                    <strong className={`reconciliation-status ${dashboard?.reconciliation?.status ?? 'pending'}`}>
                      {dashboard?.reconciliation?.status ?? 'Not run'}
                    </strong>
                  </div>
                  <div>
                    <span>Cash difference</span>
                    <strong>{number.format(dashboard?.reconciliation?.cashDifference ?? 0)} {selectedPortfolio?.baseCurrency}</strong>
                  </div>
                  <div>
                    <span>Positions checked</span>
                    <strong>{dashboard?.reconciliation?.positionsChecked ?? 0}</strong>
                  </div>
                  <div>
                    <span>Open exceptions</span>
                    <strong>{dashboard?.reconciliation?.issuesFound ?? 0}</strong>
                  </div>
                </div>
                {dashboard?.reconciliationIssues.length ? (
                  <div className="reconciliation-issues">
                    {dashboard.reconciliationIssues.map((issue) => (
                      <div key={issue.id}>
                        <AlertTriangle size={14} />
                        <span>{issue.issueType.replace(/_/g, ' ')}</span>
                        <strong>{issue.resourceId ?? 'Portfolio'}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="reconciliation-clean">
                    <CheckCircle2 size={16} /> Virtual cash, ledger and positions reconcile.
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <p className="risk-method-note">
        Scenario VaR uses the lower fifth percentile of available daily
        portfolio P&amp;L scenarios. It is a monitoring estimate—not a guarantee
        of maximum loss or permission to trade.
      </p>

      {error ? <div className="inline-message error" role="alert">{error}</div> : null}
      {success ? <div className="inline-message success" role="status">{success}</div> : null}
    </section>
  )
}
