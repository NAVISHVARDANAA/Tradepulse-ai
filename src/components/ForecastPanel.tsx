import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  Clock3,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { MarketForecast } from '../types/domain'

type ForecastPanelProps = {
  forecasts: MarketForecast[]
  loading: boolean
  error: string | null
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value)
}

function reliabilityLabel(forecast: MarketForecast) {
  if (forecast.governanceStatus === 'qualified') {
    return `Production qualified · ${forecast.reliabilityEvaluationCount} outcomes`
  }
  if (forecast.governanceStatus === 'watch') {
    return `Reliability watch · ${forecast.reliabilityEvaluationCount} outcomes`
  }
  return `Provisional · ${forecast.reliabilityEvaluationCount} outcomes`
}

function ReliabilityIcon({ status }: { status: MarketForecast['governanceStatus'] }) {
  if (status === 'qualified') return <BadgeCheck size={13} />
  if (status === 'watch') return <AlertTriangle size={13} />
  return <Clock3 size={13} />
}

export function ForecastPanel({
  forecasts,
  loading,
  error,
}: ForecastPanelProps) {
  const [symbol, setSymbol] = useState('all')
  const [governance, setGovernance] = useState('all')
  const [direction, setDirection] = useState('all')
  const [sort, setSort] = useState('confidence')
  const symbols = useMemo(
    () => Array.from(new Set(forecasts.map((forecast) => forecast.symbol))).sort(),
    [forecasts],
  )
  const filteredForecasts = useMemo(() => {
    const filtered = forecasts.filter((forecast) =>
      (symbol === 'all' || forecast.symbol === symbol) &&
      (governance === 'all' || forecast.governanceStatus === governance) &&
      (direction === 'all' || forecast.direction === direction),
    )

    return [...filtered].sort((left, right) => {
      if (sort === 'horizon') return left.horizonHours - right.horizonHours
      if (sort === 'symbol') return left.symbol.localeCompare(right.symbol)
      return (right.confidence ?? -1) - (left.confidence ?? -1)
    })
  }, [direction, forecasts, governance, sort, symbol])
  const qualified = forecasts.filter((forecast) => forecast.governanceStatus === 'qualified').length
  const monitored = forecasts.filter((forecast) => forecast.governanceStatus === 'watch').length
  const averageConfidence = forecasts.length
    ? Math.round(forecasts.reduce((total, forecast) => total + (forecast.confidence ?? 0), 0) / forecasts.length * 100)
    : null

  return (
    <section className="panel forecast-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Forecasting engine · Phase 4G</p>
          <h2>Probabilistic market outlook</h2>
        </div>

        <span className="status-badge">
          <ShieldCheck size={14} /> Decision support only
        </span>
      </div>

      <p className="panel-description">
        Forecasts must first beat a walk-forward baseline, then remain subject to
        production outcome, direction and interval-calibration monitoring.
        Suspended models disappear automatically. Output is not a promise,
        auto-trade signal or financial advice.
      </p>

      <div className="forecast-report-summary" aria-label="Forecast report summary">
        <div><span>Display-qualified</span><strong>{qualified}</strong></div>
        <div><span>Reliability watch</span><strong>{monitored}</strong></div>
        <div><span>Average confidence</span><strong>{averageConfidence === null ? '—' : `${averageConfidence}%`}</strong></div>
        <div><span>Visible after filters</span><strong>{filteredForecasts.length}</strong></div>
      </div>

      {forecasts.length > 0 ? (
        <div className="forecast-filter-bar" aria-label="Forecast report controls">
          <label>
            <span>Instrument</span>
            <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
              <option value="all">All instruments</option>
              {symbols.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Governance</span>
            <select value={governance} onChange={(event) => setGovernance(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="qualified">Production qualified</option>
              <option value="watch">Reliability watch</option>
              <option value="provisional">Provisional</option>
            </select>
          </label>
          <label>
            <span>Direction</span>
            <select value={direction} onChange={(event) => setDirection(event.target.value)}>
              <option value="all">Up and down</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
            </select>
          </label>
          <label>
            <span>Sort report</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="confidence">Highest confidence</option>
              <option value="horizon">Shortest horizon</option>
              <option value="symbol">Instrument A–Z</option>
            </select>
          </label>
        </div>
      ) : null}

      {loading ? (
        <div className="market-state" role="status">
          Loading model output…
        </div>
      ) : error ? (
        <div className="market-state" role="alert">
          {error}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="empty-feature" role="status">
          <BrainCircuit size={22} />
          <div>
            <strong>No display-qualified forecast is available.</strong>
            <span>
              The pipeline publishes only after baseline validation and removes
              models that breach production reliability thresholds.
            </span>
          </div>
        </div>
      ) : filteredForecasts.length === 0 ? (
        <div className="empty-feature" role="status">
          <BrainCircuit size={22} />
          <div>
            <strong>No forecast matches these report filters.</strong>
            <span>Adjust the instrument, governance or direction controls to widen the report.</span>
          </div>
        </div>
      ) : (
        <div className="forecast-grid">
          {filteredForecasts.map((forecast) => {
            const DirectionIcon =
              forecast.direction === 'down' ? TrendingDown : TrendingUp

            return (
              <article key={forecast.id} className="forecast-card">
                <div className="forecast-card-head">
                  <div>
                    <span className="market-label">{forecast.symbol}</span>
                    <span className="forecast-model">
                      {forecast.modelName} · v{forecast.modelVersion}
                    </span>
                  </div>

                  <span className={`direction-pill ${forecast.direction}`}>
                    <DirectionIcon size={13} /> {forecast.direction}
                  </span>
                </div>

                <div className={`forecast-reliability ${forecast.governanceStatus}`}>
                  <ReliabilityIcon status={forecast.governanceStatus} />
                  <span>{reliabilityLabel(forecast)}</span>
                </div>

                <div className="forecast-value">
                  {formatPrice(forecast.predictedPrice)}
                </div>

                <dl className="forecast-details">
                  <div>
                    <dt>Range</dt>
                    <dd>
                      {forecast.lowerBound === null ||
                      forecast.upperBound === null
                        ? 'Not available'
                        : `${formatPrice(forecast.lowerBound)}–${formatPrice(
                            forecast.upperBound,
                          )}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>
                      {forecast.confidence === null
                        ? 'Not scored'
                        : `${Math.round(forecast.confidence * 100)}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Horizon</dt>
                    <dd>{forecast.horizonHours} hours</dd>
                  </div>
                  <div>
                    <dt>Validation baseline lift</dt>
                    <dd>
                      {forecast.baselineMae === null ||
                      forecast.modelMae === null ||
                      forecast.baselineMae === 0
                        ? 'Not scored'
                        : `${Math.max(
                            0,
                            Math.round(
                              (1 - forecast.modelMae / forecast.baselineMae) *
                                100,
                            ),
                          )}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Validation direction</dt>
                    <dd>
                      {forecast.directionalAccuracy === null
                        ? 'Not scored'
                        : `${Math.round(
                            forecast.directionalAccuracy * 100,
                          )}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Production direction</dt>
                    <dd>
                      {forecast.productionDirectionalAccuracy === null
                        ? 'Building evidence'
                        : `${Math.round(
                            forecast.productionDirectionalAccuracy * 100,
                          )}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Interval coverage</dt>
                    <dd>
                      {forecast.productionIntervalCoverage === null
                        ? 'Building evidence'
                        : `${Math.round(
                            forecast.productionIntervalCoverage * 100,
                          )}%`}
                    </dd>
                  </div>
                </dl>

                {forecast.governanceStatus === 'watch' ? (
                  <p className="forecast-governance-note">
                    Production evidence is below one or more qualification
                    thresholds. Treat this outlook with additional caution.
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
