import { BrainCircuit, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'

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

export function ForecastPanel({
  forecasts,
  loading,
  error,
}: ForecastPanelProps) {
  return (
    <section className="panel forecast-panel" id="forecasts">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Forecasting engine · Phase 2</p>
          <h2>Probabilistic market outlook</h2>
        </div>

        <span className="status-badge">
          <ShieldCheck size={14} /> Decision support only
        </span>
      </div>

      <p className="panel-description">
        Forecasts are versioned, time-stamped and displayed with uncertainty.
        They are not promises, signals to auto-trade, or financial advice.
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
            <strong>No production forecast has been generated yet.</strong>
            <span>
              The model pipeline will publish results after enough verified
              observations are available.
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
                    <dt>Baseline lift</dt>
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
                    <dt>Direction score</dt>
                    <dd>
                      {forecast.directionalAccuracy === null
                        ? 'Not scored'
                        : `${Math.round(
                            forecast.directionalAccuracy * 100,
                          )}%`}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
