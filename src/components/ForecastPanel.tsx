import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  Clock3,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

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
  return (
    <section className="panel forecast-panel" id="forecasts">
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
      ) : (
        <div className="forecast-grid">
          {forecasts.map((forecast) => {
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
