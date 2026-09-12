import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileSliders,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Newspaper,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import {
  getAgenticWorkspace,
  runInvestingAgent,
  saveAgenticPreferences,
  saveAgenticReport,
  type AgenticPreferences,
  type AgenticWorkspace,
} from '../lib/queries/agenticInvesting'
import type { EquityResearchSnapshot } from '../types/domain'

type AgentMode = 'market_brief' | 'stock_analysis' | 'risk_review' | 'report_builder'

const reportSectionOptions = [
  ['market_snapshot', 'Market snapshot'],
  ['forecast', 'Governed forecast'],
  ['news', 'Global news signals'],
  ['risk', 'Risk review'],
  ['fundamentals', 'Fundamentals'],
  ['trade', 'Cross-border context'],
  ['methodology', 'Methodology'],
] as const

const quickPrompts: Array<{ label: string; mode: AgentMode; prompt: string }> = [
  { label: 'Market brief', mode: 'market_brief', prompt: 'Summarize the latest grounded market evidence and important uncertainty.' },
  { label: 'Stock analysis', mode: 'stock_analysis', prompt: 'Analyze the selected stock using research, forecast and global-news evidence.' },
  { label: 'Risk review', mode: 'risk_review', prompt: 'Show the most important risks, evidence gaps and negative global-news signals.' },
  { label: 'Build report', mode: 'report_builder', prompt: 'Prepare a report outline using my saved preferences and report sections.' },
]

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The private AI workspace request could not be completed.'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function AgenticInvestingPanel({ securities }: { securities: EquityResearchSnapshot[] }) {
  const { session, loading: authLoading } = useAuth()
  const [workspace, setWorkspace] = useState<AgenticWorkspace | null>(null)
  const [preferences, setPreferences] = useState<AgenticPreferences | null>(null)
  const [prompt, setPrompt] = useState(quickPrompts[0].prompt)
  const [mode, setMode] = useState<AgentMode>('market_brief')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [reportId] = useState(() => `report-${crypto.randomUUID()}`)
  const [reportName, setReportName] = useState('My intelligence report')
  const [reportSubject, setReportSubject] = useState<'portfolio' | 'watchlist' | 'market' | 'stock' | 'cross_border'>('watchlist')
  const [reportSchedule, setReportSchedule] = useState<'on_demand' | 'weekdays' | 'weekly'>('on_demand')
  const [reportSections, setReportSections] = useState<string[]>(['market_snapshot', 'forecast', 'news', 'risk'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = async () => {
    if (!session) {
      setWorkspace(null)
      setPreferences(null)
      return
    }
    const next = await getAgenticWorkspace()
    setWorkspace(next)
    setPreferences(next.preferences)
    setReportSections(next.preferences.reportSections)
  }

  useEffect(() => {
    void refresh().catch((loadError) => setError(safeError(loadError)))
  }, [session])

  useEffect(() => {
    if (mode === 'stock_analysis' && !selectedAssetId && securities[0]) {
      setSelectedAssetId(String(securities[0].marketAssetId))
    }
  }, [mode, securities, selectedAssetId])

  const runAction = async (action: () => Promise<void>, success: string) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await action()
      setMessage(success)
    } catch (actionError) {
      setError(safeError(actionError))
    } finally {
      setLoading(false)
    }
  }

  const submitPrompt = async (event: FormEvent) => {
    event.preventDefault()
    if (!workspace || !prompt.trim()) return
    await runAction(async () => {
      await runInvestingAgent({
        prompt: prompt.trim(), mode,
        assetIds: selectedAssetId ? [Number(selectedAssetId)] : [],
        conversationId: workspace.conversationId,
      })
      await refresh()
      setPrompt('')
    }, 'The grounded agent completed its evidence review.')
  }

  const persistPreferences = async () => {
    if (!preferences) return
    await runAction(async () => {
      await saveAgenticPreferences(preferences)
      await refresh()
    }, 'Your private AI and report preferences were saved.')
  }

  const persistReport = async (event: FormEvent) => {
    event.preventDefault()
    if (reportSections.length === 0) {
      setError('Select at least one report section.')
      return
    }
    await runAction(async () => {
      await saveAgenticReport({
        clientReportId: reportId, name: reportName, subject: reportSubject,
        sections: reportSections, filters: selectedAssetId ? { assetIds: [Number(selectedAssetId)] } : {},
        schedule: reportSchedule, outputFormat: 'interactive',
      })
      await refresh()
    }, 'Your reusable report definition was saved to your account.')
  }

  const selectedSecurity = useMemo(
    () => securities.find((item) => item.marketAssetId === Number(selectedAssetId)),
    [securities, selectedAssetId],
  )

  if (authLoading) {
    return <section className="panel agentic-panel" role="status"><LoaderCircle className="spinning" /> Checking your secure account…</section>
  }

  if (!session) {
    return (
      <section className="panel agentic-panel">
        <div className="panel-header">
          <div><p className="eyebrow">Personal AI · Phase 8E</p><h2>TradePulse Agent</h2></div>
          <span className="status-badge"><LockKeyhole size={14} /> Account required</span>
        </div>
        <div className="agentic-signin-card">
          <Bot size={30} />
          <div>
            <strong>Your conversations, report designs and preferences are private.</strong>
            <span>Sign in with your controlled-beta account to open the personalized AI workspace.</span>
          </div>
          <a className="primary-button" href="#account-security">Sign in to account</a>
        </div>
      </section>
    )
  }

  if (!workspace || !preferences) {
    return <section className="panel agentic-panel" role="status"><LoaderCircle className="spinning" /> Loading your private agent workspace…</section>
  }

  return (
    <section className="panel agentic-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Personal AI · Phase 8E</p><h2>TradePulse Agent</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Grounded · account private</span>
      </div>
      <p className="panel-description">
        Ask TradePulse to coordinate market, news, forecast and risk analysts, then build reports around your own horizon and evidence needs. Every answer carries a source snapshot and can never place a trade.
      </p>

      <div className="agentic-control-strip" aria-label="Agent safeguards">
        <span><BrainCircuit size={16} /> Candidate learning {workspace.control.continuousCandidateTrainingEnabled ? 'on' : 'off'}</span>
        <span><CheckCircle2 size={16} /> Human promotion required</span>
        <span><Newspaper size={16} /> Licensed or synthetic signals only</span>
        <span><LockKeyhole size={16} /> Autonomous execution off</span>
      </div>

      {error ? <div className="error-message" role="alert">{error}</div> : null}
      {message ? <div className="success-message" role="status">{message}</div> : null}

      <div className="agentic-workspace-grid">
        <section className="agentic-chat-card" aria-labelledby="agent-chat-title">
          <div className="agentic-card-heading">
            <div><MessageSquareText size={18} /><span id="agent-chat-title">Private conversation</span></div>
            <small>{workspace.messages.length} messages</small>
          </div>
          <div className="agentic-quick-prompts">
            {quickPrompts.map((item) => (
              <button key={item.mode} type="button" onClick={() => { setMode(item.mode); setPrompt(item.prompt) }}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="agentic-thread" aria-live="polite">
            {workspace.messages.length === 0 ? (
              <div className="agentic-empty-message">
                <Sparkles size={22} />
                <strong>Start with a grounded question</strong>
                <span>The agent uses only display-qualified TradePulse evidence and normalized news signals.</span>
              </div>
            ) : workspace.messages.map((item) => (
              <article className={`agent-message ${item.role}`} key={item.id}>
                <div><strong>{item.role === 'assistant' ? 'TradePulse Agent' : 'You'}</strong><small>{formatDate(item.createdAt)}</small></div>
                <p>{item.content}</p>
                {item.role === 'assistant' ? (
                  <div className="agent-message-evidence">
                    <span>{item.evidence.length} evidence references · {readable(item.safetyStatus)}</span>
                    {item.evidence.slice(0, 4).map((evidence, index) => (
                      <small key={`${item.id}-evidence-${index}`}>
                        [{index + 1}] {readable(String(evidence.type ?? 'evidence'))}
                        {evidence.symbol ? ` · ${String(evidence.symbol)}` : ''}
                        {evidence.source ? ` · ${String(evidence.source)}` : ''}
                      </small>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <form className="agentic-prompt-form" onSubmit={submitPrompt}>
            <div className="agentic-prompt-controls">
              <label>Agent workflow
                <select value={mode} onChange={(event) => setMode(event.target.value as AgentMode)}>
                  <option value="market_brief">Market brief</option>
                  <option value="stock_analysis">Stock analysis</option>
                  <option value="risk_review">Risk review</option>
                  <option value="report_builder">Report builder</option>
                </select>
              </label>
              <label>Evidence scope
                <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
                  <option value="">My watchlist / available market</option>
                  {securities.map((security) => <option key={security.marketAssetId} value={security.marketAssetId}>{security.symbol} · {security.companyName}</option>)}
                </select>
              </label>
            </div>
            <label className="agentic-prompt-label">
              <span>Your question</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 1200))} rows={3} placeholder="Ask for evidence, uncertainty, risks, a comparison or a report…" required />
            </label>
            <div className="agentic-submit-row">
              <small>{prompt.length}/1,200 · {selectedSecurity ? `${selectedSecurity.symbol} selected` : 'Account evidence scope'}</small>
              <button className="primary-button" type="submit" disabled={loading || prompt.trim().length < 3}>
                {loading ? <LoaderCircle className="spinning" size={16} /> : <Send size={16} />} Run grounded agents
              </button>
            </div>
          </form>
        </section>

        <aside className="agentic-settings-stack">
          <section className="agentic-settings-card">
            <div className="agentic-card-heading"><div><FileSliders size={18} /><span>Personal AI settings</span></div></div>
            <div className="agentic-form-grid">
              <label>Answer style
                <select value={preferences.assistantStyle} onChange={(event) => setPreferences({ ...preferences, assistantStyle: event.target.value as AgenticPreferences['assistantStyle'] })}>
                  <option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option>
                </select>
              </label>
              <label>Risk lens
                <select value={preferences.riskLens} onChange={(event) => setPreferences({ ...preferences, riskLens: event.target.value as AgenticPreferences['riskLens'] })}>
                  <option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="growth">Growth</option>
                </select>
              </label>
              <label>Default horizon
                <select value={preferences.defaultHorizon} onChange={(event) => setPreferences({ ...preferences, defaultHorizon: event.target.value as AgenticPreferences['defaultHorizon'] })}>
                  <option value="1d">1 day</option><option value="1w">1 week</option><option value="1m">1 month</option><option value="3m">3 months</option>
                </select>
              </label>
              <label>Reporting currency
                <select value={preferences.defaultCurrency} onChange={(event) => setPreferences({ ...preferences, defaultCurrency: event.target.value })}>
                  <option>USD</option><option>INR</option><option>GBP</option><option>EUR</option>
                </select>
              </label>
            </div>
            <label className="agentic-consent-row">
              <input type="checkbox" checked={preferences.promptTrainingOptIn} onChange={(event) => setPreferences({ ...preferences, promptTrainingOptIn: event.target.checked })} />
              <span>Allow my future prompts to be considered for de-identified improvement datasets. Off by default.</span>
            </label>
            <button className="secondary-button" type="button" onClick={() => void persistPreferences()} disabled={loading}><Save size={15} /> Save preferences</button>
          </section>

          <form className="agentic-settings-card" onSubmit={persistReport}>
            <div className="agentic-card-heading"><div><FileSliders size={18} /><span>Custom report</span></div><small>{workspace.reports.length}/8 saved</small></div>
            <label>Report name<input value={reportName} onChange={(event) => setReportName(event.target.value.slice(0, 80))} minLength={3} required /></label>
            <div className="agentic-form-grid">
              <label>Subject<select value={reportSubject} onChange={(event) => setReportSubject(event.target.value as typeof reportSubject)}><option value="watchlist">Watchlist</option><option value="stock">Stock</option><option value="portfolio">Portfolio</option><option value="market">Market</option><option value="cross_border">Cross-border</option></select></label>
              <label>Schedule<select value={reportSchedule} onChange={(event) => setReportSchedule(event.target.value as typeof reportSchedule)}><option value="on_demand">On demand</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></label>
            </div>
            <fieldset className="agentic-section-picker"><legend>Report sections</legend>{reportSectionOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={reportSections.includes(value)} onChange={(event) => setReportSections(event.target.checked ? [...new Set([...reportSections, value])] : reportSections.filter((item) => item !== value))} /><span>{label}</span></label>)}</fieldset>
            <button className="primary-button" type="submit" disabled={loading || workspace.reports.length >= 8}><Save size={15} /> Save reusable report</button>
          </form>
        </aside>
      </div>

      <div className="agentic-evidence-grid">
        <section>
          <div className="agentic-card-heading"><div><Globe2 size={18} /><span>Global news signal board</span></div><small>Raw articles not stored</small></div>
          <div className="agentic-news-list">
            {workspace.news.map((item) => <article key={item.id}><div><strong>{item.symbol ?? item.regionCode}</strong><span className={`agentic-impact ${item.impactDirection}`}>{readable(item.impactDirection)}</span></div><p>{item.summary}</p><small>{item.sourceName} · {item.synthetic ? 'Synthetic scenario' : item.rightsStatus} · relevance {Math.round(item.relevanceScore * 100)}%</small></article>)}
          </div>
        </section>
        <section>
          <div className="agentic-card-heading"><div><BrainCircuit size={18} /><span>Continuous learning ledger</span></div><small>No silent promotion</small></div>
          {workspace.candidates.map((item) => <article className="agentic-model-card" key={item.candidateKey}><span>{item.modelName}</span><strong>{item.candidateVersion}</strong><p>{readable(item.candidateStatus)} · {readable(item.promotionStatus)}</p><small>{item.featureSchemaVersion} · cutoff {formatDate(item.trainingDataCutoff)}</small></article>)}
          <p className="agentic-boundary-note">Candidate models can retrain on time-bounded price data and licensed normalized news features. Walk-forward validation, leakage gaps, cost-aware testing and human review must all pass before a version can be promoted.</p>
        </section>
      </div>
    </section>
  )
}
