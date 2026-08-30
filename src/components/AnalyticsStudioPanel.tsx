import {
  BookmarkPlus,
  Database,
  Download,
  GitBranch,
  RotateCcw,
  Search,
  ShieldCheck,
  TableProperties,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  EquityResearchSnapshot,
  MarketAssetSnapshot,
  MarketForecast,
  TradeDashboard,
} from '../types/domain'

type AnalyticsStudioPanelProps = {
  marketAssets: MarketAssetSnapshot[]
  forecasts: MarketForecast[]
  equityResearch: EquityResearchSnapshot[]
  tradeDashboard: TradeDashboard
}

type SubjectArea = 'markets' | 'forecasts' | 'equities' | 'trade'
type SortMode = 'measure-desc' | 'name-asc' | 'newest'

type AnalyticsRow = {
  id: string
  primary: string
  secondary: string
  segment: string
  segmentLabel: string
  measure: number | null
  value: string
  signal: string
  observedAt: string | null
  source: string
  details: Array<{ label: string; value: string }>
}

type MetricDefinition = {
  name: string
  formula: string
  grain: string
}

type ReportDefinition = {
  label: string
  description: string
  grain: string
  origin: string
  governedLayer: string
  segmentLabel: string
  measureLabel: string
  measureFormat: 'number' | 'percent' | 'usd'
  metrics: MetricDefinition[]
}

type SavedView = {
  id: string
  name: string
  subject: SubjectArea
  search: string
  segment: string
  sort: SortMode
}

const VIEW_STORAGE_KEY = 'tradepulse-analytics-views-v1'

const reportDefinitions: Record<SubjectArea, ReportDefinition> = {
  markets: {
    label: 'Market observations',
    description: 'Synchronized currency, commodity and index observations with source-level drill-through.',
    grain: 'One latest observation per market asset',
    origin: 'Licensed and approved market-data adapters',
    governedLayer: 'market_assets + market_observations',
    segmentLabel: 'Asset class',
    measureLabel: 'Observed price',
    measureFormat: 'number',
    metrics: [
      { name: 'Priced assets', formula: 'COUNT(price IS NOT NULL)', grain: 'Latest asset snapshot' },
      { name: 'Average move', formula: 'AVG(change_percent)', grain: 'Latest asset snapshot' },
      { name: 'Source coverage', formula: 'COUNT(DISTINCT source)', grain: 'Provider' },
    ],
  },
  forecasts: {
    label: 'Forecast governance',
    description: 'Display-qualified probabilistic forecasts with reliability state and model evidence.',
    grain: 'One governed model output per asset and horizon',
    origin: 'TradePulse forecasting service',
    governedLayer: 'display_qualified_market_forecasts',
    segmentLabel: 'Governance state',
    measureLabel: 'Confidence',
    measureFormat: 'percent',
    metrics: [
      { name: 'Qualified forecasts', formula: "COUNT(reliability_status = 'qualified')", grain: 'Model output' },
      { name: 'Average confidence', formula: 'AVG(confidence_score)', grain: 'Visible model output' },
      { name: 'Interval coverage', formula: 'AVG(production_interval_coverage)', grain: 'Model version' },
    ],
  },
  equities: {
    label: 'Equity research',
    description: 'Licensed coverage, governed research classifications and transparent component evidence.',
    grain: 'One latest research snapshot per covered security',
    origin: 'Approved equity and fundamental-data providers',
    governedLayer: 'equity coverage + research score views',
    segmentLabel: 'Research classification',
    measureLabel: 'Research score',
    measureFormat: 'number',
    metrics: [
      { name: 'Scored securities', formula: 'COUNT(research_score IS NOT NULL)', grain: 'Covered security' },
      { name: 'Average research score', formula: 'AVG(research_score)', grain: 'Scored security' },
      { name: 'Provider coverage', formula: 'COUNT(DISTINCT provider_name)', grain: 'Provider' },
    ],
  },
  trade: {
    label: 'Cross-border trade',
    description: 'Country-level imports, exports, balances and period-over-period growth.',
    grain: 'One latest verified period per tracked country',
    origin: 'Approved global trade datasets',
    governedLayer: 'countries + trade_observations',
    segmentLabel: 'Trade position',
    measureLabel: 'Tracked volume',
    measureFormat: 'usd',
    metrics: [
      { name: 'Tracked volume', formula: 'SUM(exports_usd + imports_usd)', grain: 'Verified period' },
      { name: 'Trade balance', formula: 'SUM(exports_usd - imports_usd)', grain: 'Verified period' },
      { name: 'Export growth', formula: 'PERIOD_GROWTH(SUM(exports_usd))', grain: 'Comparable period' },
    ],
  },
}

function compactUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function decimal(value: number | null, digits = 2) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}

function percent(value: number | null, scaled = false) {
  if (value === null) return '—'
  const percentage = scaled ? value * 100 : value
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
}

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
}

function readSavedViews(): SavedView[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((view): view is SavedView =>
      typeof view?.id === 'string' &&
      typeof view?.name === 'string' &&
      typeof view?.subject === 'string' &&
      view.subject in reportDefinitions,
    ).slice(0, 8)
  } catch {
    return []
  }
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function buildRows(
  subject: SubjectArea,
  marketAssets: MarketAssetSnapshot[],
  forecasts: MarketForecast[],
  equityResearch: EquityResearchSnapshot[],
  tradeDashboard: TradeDashboard,
): AnalyticsRow[] {
  if (subject === 'markets') {
    return marketAssets.map((asset) => ({
      id: `market-${asset.id}`,
      primary: asset.symbol,
      secondary: asset.name,
      segment: asset.asset_type,
      segmentLabel: readable(asset.asset_type),
      measure: asset.price,
      value: decimal(asset.price, asset.price !== null && asset.price < 10 ? 4 : 2),
      signal: percent(asset.change_percent),
      observedAt: asset.observed_at,
      source: asset.source ?? 'Source pending',
      details: [
        { label: 'Currency', value: asset.currency ?? 'Not specified' },
        { label: 'Asset class', value: readable(asset.asset_type) },
        { label: 'Observed move', value: percent(asset.change_percent) },
      ],
    }))
  }

  if (subject === 'forecasts') {
    return forecasts.map((forecast) => ({
      id: `forecast-${forecast.id}`,
      primary: forecast.symbol,
      secondary: `${forecast.modelName} · v${forecast.modelVersion}`,
      segment: forecast.governanceStatus,
      segmentLabel: readable(forecast.governanceStatus),
      measure: forecast.confidence === null ? null : forecast.confidence * 100,
      value: decimal(forecast.predictedPrice, forecast.predictedPrice < 10 ? 4 : 2),
      signal: `${readable(forecast.direction)} · ${forecast.horizonHours}h`,
      observedAt: forecast.generatedAt,
      source: 'TradePulse forecasting service',
      details: [
        { label: 'Confidence', value: percent(forecast.confidence, true) },
        { label: 'Governance', value: readable(forecast.governanceStatus) },
        { label: 'Reliability evidence', value: `${forecast.reliabilityEvaluationCount} outcomes` },
        { label: 'Target time', value: new Date(forecast.targetAt).toLocaleString() },
      ],
    }))
  }

  if (subject === 'equities') {
    return equityResearch.map((security) => ({
      id: `equity-${security.securityId}`,
      primary: security.symbol,
      secondary: security.companyName,
      segment: security.researchClassification ?? 'insufficient_data',
      segmentLabel: readable(security.researchClassification ?? 'insufficient_data'),
      measure: security.researchScore,
      value: decimal(security.price),
      signal: security.changePercent === null ? 'No market move' : percent(security.changePercent),
      observedAt: security.observedAt ?? security.lastSynchronizedAt,
      source: security.providerName,
      details: [
        { label: 'Exchange', value: security.exchangeName ?? security.exchangeCode },
        { label: 'Sector', value: security.sector ?? 'Not classified' },
        { label: 'Coverage', value: readable(security.coverageStatus ?? 'unavailable') },
        { label: 'Research confidence', value: percent(security.researchConfidence, true) },
      ],
    }))
  }

  return tradeDashboard.countries.map((country) => {
    const volume = country.exports + country.imports
    return {
      id: `trade-${country.isoCode}`,
      primary: country.country,
      secondary: country.isoCode,
      segment: country.balance >= 0 ? 'surplus' : 'deficit',
      segmentLabel: country.balance >= 0 ? 'Surplus' : 'Deficit',
      measure: volume,
      value: compactUsd(volume),
      signal: `Balance ${compactUsd(country.balance)}`,
      observedAt: `${country.periodDate}T00:00:00Z`,
      source: 'Verified trade observations',
      details: [
        { label: 'Exports', value: compactUsd(country.exports) },
        { label: 'Imports', value: compactUsd(country.imports) },
        { label: 'Trade balance', value: compactUsd(country.balance) },
        { label: 'Growth', value: percent(country.growthPercent) },
      ],
    }
  })
}

export function AnalyticsStudioPanel({
  marketAssets,
  forecasts,
  equityResearch,
  tradeDashboard,
}: AnalyticsStudioPanelProps) {
  const [subject, setSubject] = useState<SubjectArea>('markets')
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [sort, setSort] = useState<SortMode>('measure-desc')
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [savedViews, setSavedViews] = useState<SavedView[]>(readSavedViews)
  const [message, setMessage] = useState<string | null>(null)
  const definition = reportDefinitions[subject]

  const rows = useMemo(
    () => buildRows(subject, marketAssets, forecasts, equityResearch, tradeDashboard),
    [equityResearch, forecasts, marketAssets, subject, tradeDashboard],
  )
  const segments = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    rows.forEach((row) => {
      const current = counts.get(row.segment)
      counts.set(row.segment, {
        label: row.segmentLabel,
        count: (current?.count ?? 0) + 1,
      })
    })
    return Array.from(counts.entries())
      .map(([value, item]) => ({ value, ...item }))
      .sort((left, right) => right.count - left.count)
  }, [rows])
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = rows.filter((row) =>
      (segment === 'all' || row.segment === segment) &&
      (!query || `${row.primary} ${row.secondary} ${row.source}`.toLowerCase().includes(query)),
    )
    return [...filtered].sort((left, right) => {
      if (sort === 'name-asc') return left.primary.localeCompare(right.primary)
      if (sort === 'newest') return (right.observedAt ?? '').localeCompare(left.observedAt ?? '')
      return (right.measure ?? Number.NEGATIVE_INFINITY) - (left.measure ?? Number.NEGATIVE_INFINITY)
    })
  }, [rows, search, segment, sort])
  const selectedRow = filteredRows.find((row) => row.id === selectedRowId) ?? null
  const completeRows = filteredRows.filter((row) => row.measure !== null).length
  const completeness = filteredRows.length ? Math.round(completeRows / filteredRows.length * 100) : 0
  const latestObservation = filteredRows
    .map((row) => row.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null
  const primaryMeasure = filteredRows.reduce((total, row) => total + (row.measure ?? 0), 0)
  const maximumSegmentCount = Math.max(...segments.map((item) => item.count), 1)

  const changeSubject = (nextSubject: SubjectArea) => {
    setSubject(nextSubject)
    setSegment('all')
    setSelectedRowId(null)
    setMessage(null)
  }

  const reset = () => {
    setSearch('')
    setSegment('all')
    setSort('measure-desc')
    setSelectedRowId(null)
    setMessage('Report controls reset.')
  }

  const saveView = () => {
    const view: SavedView = {
      id: `${Date.now()}`,
      name: `${definition.label} · view ${savedViews.filter((item) => item.subject === subject).length + 1}`,
      subject,
      search,
      segment,
      sort,
    }
    const nextViews = [view, ...savedViews].slice(0, 8)
    setSavedViews(nextViews)
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(nextViews))
    setMessage(`Saved “${view.name}” on this device.`)
  }

  const applySavedView = (id: string) => {
    const view = savedViews.find((item) => item.id === id)
    if (!view) return
    setSubject(view.subject)
    setSearch(view.search)
    setSegment(view.segment)
    setSort(view.sort)
    setMessage(`Applied “${view.name}”.`)
  }

  const exportCsv = () => {
    const headings = ['Entity', 'Description', definition.segmentLabel, definition.measureLabel, 'Displayed value', 'Signal', 'Observed at', 'Source']
    const lines = filteredRows.map((row) => [
      row.primary,
      row.secondary,
      row.segmentLabel,
      row.measure === null ? '' : `${row.measure}`,
      row.value,
      row.signal,
      row.observedAt ?? '',
      row.source,
    ])
    const csv = [headings, ...lines].map((line) => line.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const download = document.createElement('a')
    download.href = url
    download.download = `tradepulse-${subject}-report.csv`
    download.click()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${filteredRows.length} governed rows.`)
  }

  return (
    <section className="analytics-studio" aria-labelledby="analytics-studio-title">
      <div className="analytics-studio-toolbar">
        <div>
          <p className="eyebrow">Enterprise analytics · Phase 5B</p>
          <h2 id="analytics-studio-title">Governed Analytics Studio</h2>
          <p>Explore certified metrics through reusable semantic definitions, interactive filters and auditable drill-through.</p>
        </div>
        <div className="analytics-studio-actions">
          <button className="secondary-button" type="button" onClick={saveView}>
            <BookmarkPlus size={15} /> Save view
          </button>
          <button className="secondary-button" type="button" onClick={exportCsv} disabled={filteredRows.length === 0}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="analytics-architecture-note">
        <Database size={17} />
        <div>
          <strong>Warehouse-ready semantic contract</strong>
          <span>Current governed runtime: Supabase Postgres · Snowflake adapter: not connected · report patterns: enterprise BI</span>
        </div>
        <span className="status-badge"><ShieldCheck size={13} /> Certified definitions</span>
      </div>

      <div className="analytics-control-grid" aria-label="Analytics report controls">
        <label>
          <span>Subject area</span>
          <select value={subject} onChange={(event) => changeSubject(event.target.value as SubjectArea)}>
            {Object.entries(reportDefinitions).map(([value, report]) => (
              <option key={value} value={value}>{report.label}</option>
            ))}
          </select>
        </label>
        <label className="analytics-search-control">
          <span>Search report</span>
          <div><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Symbol, country, company or source" /></div>
        </label>
        <label>
          <span>{definition.segmentLabel}</span>
          <select value={segment} onChange={(event) => setSegment(event.target.value)}>
            <option value="all">All segments</option>
            {segments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          <span>Sort rows</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="measure-desc">Highest measure</option>
            <option value="name-asc">Entity A–Z</option>
            <option value="newest">Newest evidence</option>
          </select>
        </label>
        <label>
          <span>Saved views</span>
          <select defaultValue="" onChange={(event) => applySavedView(event.target.value)}>
            <option value="">Choose a saved view</option>
            {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
          </select>
        </label>
        <button className="analytics-reset-button" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button>
      </div>

      {message ? <div className="analytics-message" role="status">{message}</div> : null}

      <div className="analytics-semantic-summary" aria-label="Semantic report summary">
        <article><span>Visible rows</span><strong>{filteredRows.length}</strong><small>{definition.grain}</small></article>
        <article><span>Measure completeness</span><strong>{completeness}%</strong><small>{completeRows} rows carry the primary measure</small></article>
        <article>
          <span>{definition.measureLabel}</span>
          <strong>{definition.measureFormat === 'usd' ? compactUsd(primaryMeasure) : definition.measureFormat === 'percent' ? percent(filteredRows.length ? primaryMeasure / filteredRows.length : null) : decimal(filteredRows.length ? primaryMeasure / filteredRows.length : null)}</strong>
          <small>{definition.measureFormat === 'usd' ? 'Sum after current filters' : 'Average after current filters'}</small>
        </article>
        <article><span>Latest evidence</span><strong>{latestObservation ? new Date(latestObservation).toLocaleDateString() : 'Unknown'}</strong><small>Source timestamp remains visible</small></article>
      </div>

      <div className="analytics-workbench">
        <article className="analytics-visual-panel">
          <div className="analytics-section-heading">
            <div><span>Cross-filter</span><h3>{definition.segmentLabel} distribution</h3></div>
            <small>Select a bar to filter the table</small>
          </div>
          {segments.length === 0 ? <div className="analytics-empty">No governed rows are available for this subject area.</div> : (
            <div className="analytics-bars">
              {segments.map((item) => (
                <button key={item.value} type="button" aria-pressed={segment === item.value} onClick={() => setSegment(segment === item.value ? 'all' : item.value)}>
                  <span><strong>{item.label}</strong><small>{item.count} rows</small></span>
                  <span className="analytics-bar-track"><span style={{ width: `${Math.max(8, item.count / maximumSegmentCount * 100)}%` }} /></span>
                </button>
              ))}
            </div>
          )}
        </article>

        <aside className="analytics-lineage-panel" aria-label="Report lineage">
          <div className="analytics-section-heading"><div><span>Lineage</span><h3>Source to insight</h3></div><GitBranch size={18} /></div>
          <ol>
            <li><span>1</span><div><strong>Source</strong><small>{definition.origin}</small></div></li>
            <li><span>2</span><div><strong>Governed data</strong><small>{definition.governedLayer}</small></div></li>
            <li><span>3</span><div><strong>Semantic layer</strong><small>TradePulse certified metric catalog v1</small></div></li>
            <li><span>4</span><div><strong>Consumer</strong><small>Analytics Studio drill-through report</small></div></li>
          </ol>
        </aside>
      </div>

      <article className="analytics-table-panel">
        <div className="analytics-section-heading">
          <div><span>Drill-through table</span><h3>{definition.label}</h3><p>{definition.description}</p></div>
          <TableProperties size={19} />
        </div>
        {filteredRows.length === 0 ? <div className="analytics-empty">No rows match the current slicers.</div> : (
          <div className="analytics-table-wrap">
            <table>
              <thead><tr><th>Entity</th><th>{definition.segmentLabel}</th><th>Displayed value</th><th>{definition.measureLabel}</th><th>Signal</th><th>Evidence time</th><th>Details</th></tr></thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.primary}</strong><small>{row.secondary}</small></td>
                    <td><span className="analytics-segment-pill">{row.segmentLabel}</span></td>
                    <td>{row.value}</td>
                    <td>{row.measure === null ? '—' : definition.measureFormat === 'usd' ? compactUsd(row.measure) : definition.measureFormat === 'percent' ? percent(row.measure) : decimal(row.measure)}</td>
                    <td>{row.signal}</td>
                    <td>{row.observedAt ? new Date(row.observedAt).toLocaleString() : 'Unknown'}</td>
                    <td><button className="text-button" type="button" onClick={() => setSelectedRowId(row.id)}>Drill through</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <details className="analytics-metric-dictionary">
        <summary>Semantic metric dictionary</summary>
        <div>
          {definition.metrics.map((metric) => (
            <article key={metric.name}>
              <span><ShieldCheck size={13} /> Certified</span>
              <strong>{metric.name}</strong>
              <code>{metric.formula}</code>
              <small>Grain: {metric.grain}</small>
            </article>
          ))}
        </div>
      </details>

      {selectedRow ? (
        <aside className="analytics-drillthrough" aria-labelledby="analytics-drillthrough-title">
          <button type="button" aria-label="Close drill-through" onClick={() => setSelectedRowId(null)}><X size={17} /></button>
          <p className="eyebrow">Governed row detail</p>
          <h3 id="analytics-drillthrough-title">{selectedRow.primary}</h3>
          <p>{selectedRow.secondary}</p>
          <dl>
            {selectedRow.details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
            <div><dt>Evidence source</dt><dd>{selectedRow.source}</dd></div>
            <div><dt>Evidence time</dt><dd>{selectedRow.observedAt ? new Date(selectedRow.observedAt).toLocaleString() : 'Unknown'}</dd></div>
          </dl>
        </aside>
      ) : null}
    </section>
  )
}
