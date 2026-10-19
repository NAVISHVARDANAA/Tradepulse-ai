import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Download,
  Gauge,
  Network,
  SearchCheck,
  ShieldCheck,
  TimerReset,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  MARKET_IMPACT_SCENARIOS,
  buildMarketImpactBrief,
  marketImpactBriefText,
  type MarketImpactDecisionLens,
  type MarketImpactHorizon,
  type MarketImpactScenarioId,
  type MarketImpactSeverity,
} from '../lib/marketImpactBrief'
import type { MarketAssetSnapshot } from '../types/domain'
import '../market-impact-brief.css'

type MarketImpactBriefPanelProps = {
  marketAssets: MarketAssetSnapshot[]
  marketLoading: boolean
  marketError: string | null
  demoMode: boolean
}

const evidenceOptions = [
  'Primary source checked',
  'Independent corroboration checked',
  'Market timestamp checked',
  'Direct exposure checked',
] as const

function formatPrice(value: number | null) {
  return value === null
    ? 'Unavailable'
    : value.toLocaleString('en-GB', { maximumFractionDigits: 4 })
}

function formatChange(value: number | null) {
  if (value === null) return 'Change unavailable'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function readable(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function MarketImpactBriefPanel({
  marketAssets,
  marketLoading,
  marketError,
  demoMode,
}: MarketImpactBriefPanelProps) {
  const firstScenario = MARKET_IMPACT_SCENARIOS[0]
  const [scenarioId, setScenarioId] = useState<MarketImpactScenarioId>(firstScenario.id)
  const [headline, setHeadline] = useState(firstScenario.defaultHeadline)
  const [decisionLens, setDecisionLens] = useState<MarketImpactDecisionLens>('operator')
  const [severity, setSeverity] = useState<MarketImpactSeverity>('high')
  const [horizon, setHorizon] = useState<MarketImpactHorizon>('7-days')
  const [evidenceChecks, setEvidenceChecks] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const brief = useMemo(() => buildMarketImpactBrief({
    headline, scenarioId, decisionLens, severity, horizon,
  }, marketAssets), [decisionLens, headline, horizon, marketAssets, scenarioId, severity])

  const chooseScenario = (nextId: MarketImpactScenarioId) => {
    const scenario = MARKET_IMPACT_SCENARIOS.find((item) => item.id === nextId) ?? firstScenario
    setScenarioId(nextId)
    setHeadline(scenario.defaultHeadline)
    setEvidenceChecks([])
    setNotice(null)
  }

  const toggleEvidence = (item: string) => {
    setEvidenceChecks((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item])
    setNotice(null)
  }

  const copyBrief = async () => {
    await navigator.clipboard.writeText(marketImpactBriefText(brief, evidenceChecks))
    setNotice('Local impact brief copied. Review every source and assumption before sharing it.')
  }

  const downloadBrief = () => {
    const blob = new Blob([marketImpactBriefText(brief, evidenceChecks)], { type: 'text/plain' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = 'tradepulse-market-impact-brief.txt'
    anchor.click()
    URL.revokeObjectURL(href)
    setNotice('Local impact brief downloaded. No event, evidence or market data was uploaded.')
  }

  return (
    <section id="market-impact-brief" className="market-impact-brief product-workspace" aria-labelledby="market-impact-title">
      <div className="impact-hero">
        <div>
          <span className="impact-status"><Network size={15} /> Phase 9F real-world decision workflow</span>
          <h2 id="market-impact-title">Turn a market-moving event into a five-minute impact brief.</h2>
          <p>
            Frame what changed, trace a testable transmission path, inspect the latest available market observations,
            and record what would confirm or invalidate the thesis. The workflow reduces research fragmentation;
            it does not claim that a market move was caused by the event.
          </p>
        </div>
        <aside className="impact-problem" aria-label="Problem statement">
          <strong>The real-time problem</strong>
          <p>Investors, analysts and globally exposed operators lose time switching between headlines, prices and business exposure while freshness and assumptions remain unclear.</p>
          <span><TimerReset size={15} /> One event → one reviewable decision frame</span>
        </aside>
      </div>

      <div className="impact-boundary" role="note">
        <ShieldCheck size={18} />
        <div>
          <strong>{demoMode ? 'Curated demo observations are active' : 'Source and timestamp stay attached to every observation'}</strong>
          <span>
            {demoMode
              ? 'The values are deterministic reference data, not a live feed. Use them to test the workflow, not to make a financial decision.'
              : 'Data may be reference or delayed. “Available now” never means licensed real-time unless the source entitlement explicitly says so.'}
          </span>
        </div>
      </div>

      <div className="impact-workbench">
        <section className="impact-inputs" aria-labelledby="impact-frame-title">
          <div className="impact-section-title"><Gauge size={18} /><h3 id="impact-frame-title">Frame the event</h3></div>
          <label>
            Event type
            <select value={scenarioId} onChange={(event) => chooseScenario(event.target.value as MarketImpactScenarioId)}>
              {MARKET_IMPACT_SCENARIOS.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
            </select>
          </label>
          <label>
            Event headline or working claim
            <textarea value={headline} onChange={(event) => setHeadline(event.target.value.slice(0, 140))} rows={3} maxLength={140} />
            <small>{headline.length}/140 · saved nowhere</small>
          </label>
          <div className="impact-input-grid">
            <label>
              Decision lens
              <select value={decisionLens} onChange={(event) => setDecisionLens(event.target.value as MarketImpactDecisionLens)}>
                <option value="operator">Business operator</option>
                <option value="investor">Investor</option>
                <option value="analyst">Analyst</option>
              </select>
            </label>
            <label>
              Severity
              <select value={severity} onChange={(event) => setSeverity(event.target.value as MarketImpactSeverity)}>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>
              Review horizon
              <select value={horizon} onChange={(event) => setHorizon(event.target.value as MarketImpactHorizon)}>
                <option value="24-hours">24 hours</option>
                <option value="7-days">7 days</option>
                <option value="30-days">30 days</option>
              </select>
            </label>
          </div>

          <fieldset className="impact-evidence">
            <legend>Evidence I have personally checked</legend>
            {evidenceOptions.map((option) => (
              <label key={option}>
                <input type="checkbox" checked={evidenceChecks.includes(option)} onChange={() => toggleEvidence(option)} />
                <span>{option}</span>
              </label>
            ))}
            <small>User-marked checklist · {evidenceChecks.length}/4 checked · not independently verified by TradePulse</small>
          </fieldset>
        </section>

        <section className="impact-output" aria-labelledby="impact-output-title">
          <div className="impact-section-title"><SearchCheck size={18} /><h3 id="impact-output-title">Impact hypothesis</h3></div>
          <div className="impact-output-heading">
            <div><span>{brief.scenarioLabel}</span><h3>{brief.title}</h3></div>
            <div><span>{readable(brief.severity)}</span><span>{readable(brief.horizon)}</span></div>
          </div>
          <p>{brief.framing}</p>
          <ol className="impact-transmission">
            {brief.transmission.map((step, index) => (
              <li key={step}><span>{index + 1}</span><p>{step}</p>{index < brief.transmission.length - 1 ? <ArrowRight size={15} /> : null}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="impact-observations" aria-labelledby="impact-observations-title">
        <div className="impact-section-title">
          <Network size={18} />
          <div><h3 id="impact-observations-title">Affected-market watchlist</h3><small>Observation ≠ causation</small></div>
        </div>
        {marketLoading ? <p className="impact-empty" role="status">Loading the latest available observations…</p> : null}
        {marketError ? <p className="impact-empty" role="alert">{marketError} The hypotheses remain visible, but no value is invented.</p> : null}
        <div className="impact-observation-grid">
          {brief.observations.map((item) => (
            <article key={item.symbol}>
              <header><div><strong>{item.symbol}</strong><span>{item.name}</span></div><span className={`impact-pressure ${item.pressure}`}>{readable(item.pressure)} pressure</span></header>
              <div className="impact-price"><strong>{formatPrice(item.price)}</strong><span>{formatChange(item.changePercent)}</span></div>
              <p>{item.hypothesis}</p>
              <footer><span>{item.source ?? 'Source unavailable'}</span><span>{item.freshness}</span></footer>
            </article>
          ))}
        </div>
        {brief.missingObservationCount > 0 ? <p className="impact-missing">{brief.missingObservationCount} linked observation{brief.missingObservationCount === 1 ? ' is' : 's are'} unavailable. The gap is preserved instead of filled with sample values.</p> : null}
      </section>

      <div className="impact-signal-grid">
        <section>
          <h3>What would confirm it?</h3>
          <ul>{brief.confirmingSignals.map((signal) => <li key={signal}><CheckCircle2 size={15} />{signal}</li>)}</ul>
        </section>
        <section>
          <h3>What would change my mind?</h3>
          <ul>{brief.counterSignals.map((signal) => <li key={signal}><TimerReset size={15} />{signal}</li>)}</ul>
        </section>
        <section>
          <h3>{readable(brief.decisionLens)} questions</h3>
          <ul>{brief.decisionQuestions.map((question) => <li key={question}><SearchCheck size={15} />{question}</li>)}</ul>
        </section>
      </div>

      <div className="impact-actions">
        <div>
          <strong>Keep the brief local until a human reviews the sources.</strong>
          <span>No account, message, alert, order or financial action is created.</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => void copyBrief()}><Clipboard size={15} /> Copy brief</button>
        <button className="primary-button" type="button" onClick={downloadBrief}><Download size={15} /> Download local brief</button>
      </div>
      {notice ? <p className="impact-notice" role="status">{notice}</p> : null}
    </section>
  )
}
