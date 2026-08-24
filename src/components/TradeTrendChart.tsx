import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { TradeDashboard } from '../types/domain'

type TradeTrendChartProps = {
  dashboard: TradeDashboard
  loading: boolean
  error: string | null
}

export function TradeTrendChart({ dashboard, loading, error }: TradeTrendChartProps) {
  return (
    <article className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Global trade trends</p>
          <h2>Tracked export vs import volume</h2>
        </div>
        <span className="source-label">USD billions</span>
      </div>

      {loading ? (
        <div className="chart-empty" role="status">Loading trade series…</div>
      ) : error ? (
        <div className="chart-empty" role="alert">{error}</div>
      ) : dashboard.trend.length === 0 ? (
        <div className="chart-empty" role="status">
          The chart will appear after the first verified trade-data sync.
        </div>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dashboard.trend}
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
  )
}
