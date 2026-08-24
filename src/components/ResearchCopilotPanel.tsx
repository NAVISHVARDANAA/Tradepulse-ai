import {
  Bell,
  BellRing,
  BrainCircuit,
  CalendarDays,
  Check,
  ListPlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { AcademyLink } from './AcademyLink'
import { useAuth } from '../lib/auth/AuthProvider'
import {
  addResearchWatchlistItem,
  createResearchAlert,
  deleteResearchAlert,
  generateResearchBrief,
  getResearchCopilotWorkspace,
  markResearchAlertRead,
  removeResearchWatchlistItem,
  type ResearchCopilotWorkspace,
} from '../lib/queries/researchCopilot'
import type { EquityResearchSnapshot } from '../types/domain'

type ResearchCopilotPanelProps = {
  securities: EquityResearchSnapshot[]
  researchLoading: boolean
}

function displayError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'The research copilot request could not be completed.'
}

function classificationLabel(value: string | null) {
  if (value === 'research_positive') return 'Positive'
  if (value === 'research_cautious') return 'Cautious'
  if (value === 'research_neutral') return 'Neutral'
  return 'Pending'
}

function compactDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ResearchCopilotPanel({
  securities,
  researchLoading,
}: ResearchCopilotPanelProps) {
  const { session, loading: authLoading } = useAuth()
  const [workspace, setWorkspace] = useState<ResearchCopilotWorkspace | null>(null)
  const [candidateAssetId, setCandidateAssetId] = useState('')
  const [alertAssetId, setAlertAssetId] = useState('')
  const [alertCondition, setAlertCondition] = useState<
    'research_score_above' | 'research_score_below'
  >('research_score_above')
  const [alertTarget, setAlertTarget] = useState('65')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refreshWorkspace = async () => {
    if (!session) {
      setWorkspace(null)
      return
    }

    setWorkspace(await getResearchCopilotWorkspace())
  }

  useEffect(() => {
    void refreshWorkspace().catch((loadError) => setError(displayError(loadError)))
  }, [session])

  const securityByAsset = useMemo(
    () => new Map(securities.map((security) => [security.marketAssetId, security])),
    [securities],
  )
  const watchlistAssetIds = useMemo(
    () => new Set(workspace?.items.map((item) => item.assetId) ?? []),
    [workspace?.items],
  )
  const candidates = useMemo(
    () => securities.filter((security) => !watchlistAssetIds.has(security.marketAssetId)),
    [securities, watchlistAssetIds],
  )
  const watchlistRows = workspace?.items.map((item) => ({
    ...item,
    security: securityByAsset.get(item.assetId),
  })) ?? []

  useEffect(() => {
    if (!candidates.some((item) => item.marketAssetId === Number(candidateAssetId))) {
      setCandidateAssetId(candidates[0]?.marketAssetId.toString() ?? '')
    }
  }, [candidateAssetId, candidates])

  useEffect(() => {
    if (!watchlistRows.some((item) => item.assetId === Number(alertAssetId))) {
      setAlertAssetId(watchlistRows[0]?.assetId.toString() ?? '')
    }
  }, [alertAssetId, watchlistRows])

  const runAction = async (action: () => Promise<void>, message: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await action()
      await refreshWorkspace()
      setSuccess(message)
    } catch (actionError) {
      setError(displayError(actionError))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!workspace || !candidateAssetId) return
    await runAction(
      () => addResearchWatchlistItem(workspace.watchlist.id, Number(candidateAssetId)),
      'Stock added to your private research watchlist.',
    )
  }

  const handleGenerate = async () => {
    await runAction(async () => {
      await generateResearchBrief()
    }, 'Your evidence-linked research brief is ready.')
  }

  const handleAlert = async (event: FormEvent) => {
    event.preventDefault()
    if (!alertAssetId) return
    const target = Number(alertTarget)
    if (!Number.isFinite(target) || target < 0 || target > 100) {
      setError('Research-score thresholds must be between 0 and 100.')
      return
    }

    await runAction(
      () => createResearchAlert({
        assetId: Number(alertAssetId),
        condition: alertCondition,
        targetValue: target,
      }),
      'Explainable in-app research alert created.',
    )
  }

  const brief = workspace?.brief
  const unreadEvents = workspace?.events.filter((event) => !event.readAt).length ?? 0

  return (
    <section className="panel copilot-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Daily intelligence · Phase 3D</p>
          <h2>AI research copilot</h2>
        </div>
        <div className="panel-header-actions">
          <AcademyLink courseSlug="research-copilot" lessonSlug="daily-evidence-brief" />
          <span className="status-badge">
            <ShieldCheck size={14} /> Private · evidence linked
          </span>
        </div>
      </div>

      <p className="panel-description copilot-description">
        Turn a private stock watchlist into a concise daily briefing with model
        evidence, confidence, stale-data warnings and research-score alerts.
        Every statement is generated from stored, display-qualified inputs.
      </p>

      {authLoading ? (
        <div className="copilot-empty" role="status">
          <RefreshCw size={20} /> Checking secure session…
        </div>
      ) : !session ? (
        <div className="copilot-empty">
          <BrainCircuit size={24} />
          <div>
            <strong>Your research feed is private.</strong>
            <span>Sign in through the Paper Investing section, then return here to build your watchlist and daily brief.</span>
          </div>
          <a className="secondary-button" href="#paper-investing">Go to secure sign-in</a>
        </div>
      ) : !workspace ? (
        <div className="copilot-empty" role="status">
          <RefreshCw size={20} /> Loading your research workspace…
        </div>
      ) : (
        <>
          <div className="copilot-metrics">
            <div><ListPlus size={17} /><span>Watchlist</span><strong>{workspace.items.length}</strong></div>
            <div><CalendarDays size={17} /><span>Latest brief</span><strong>{brief?.briefDate ?? 'Pending'}</strong></div>
            <div><Bell size={17} /><span>Active rules</span><strong>{workspace.alerts.filter((item) => item.enabled).length}</strong></div>
            <div><BellRing size={17} /><span>Unread events</span><strong>{unreadEvents}</strong></div>
          </div>

          <div className="copilot-grid">
            <section className="copilot-card watchlist-card">
              <div className="copilot-card-head">
                <div><span>Private watchlist</span><strong>{workspace.watchlist.name}</strong></div>
                <ListPlus size={18} />
              </div>

              <div className="watchlist-add-row">
                <label>
                  <span className="sr-only">Covered stock</span>
                  <select
                    value={candidateAssetId}
                    disabled={researchLoading || candidates.length === 0}
                    onChange={(event) => setCandidateAssetId(event.target.value)}
                  >
                    {candidates.length === 0
                      ? <option value="">No additional covered stocks</option>
                      : candidates.map((security) => (
                          <option key={security.marketAssetId} value={security.marketAssetId}>
                            {security.symbol} · {security.companyName}
                          </option>
                        ))}
                  </select>
                </label>
                <button
                  className="icon-action-button"
                  type="button"
                  title="Add to watchlist"
                  disabled={loading || !candidateAssetId}
                  onClick={() => void handleAdd()}
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="copilot-watchlist">
                {watchlistRows.length === 0 ? (
                  <div className="copilot-list-empty">Add a covered stock to start your daily research feed.</div>
                ) : watchlistRows.map((item) => (
                  <div className="copilot-watchlist-row" key={item.id}>
                    <div>
                      <strong>{item.security?.symbol ?? `Asset ${item.assetId}`}</strong>
                      <span>{item.security?.companyName ?? 'Coverage pending'}</span>
                    </div>
                    <div className="copilot-watch-score">
                      <span>{classificationLabel(item.security?.researchClassification ?? null)}</span>
                      <strong>{item.security?.researchScore === null || item.security?.researchScore === undefined
                        ? '—'
                        : Math.round(item.security.researchScore)}</strong>
                    </div>
                    <button
                      className="quiet-icon-button"
                      type="button"
                      title="Remove from watchlist"
                      disabled={loading}
                      onClick={() => void runAction(
                        () => removeResearchWatchlistItem(item.id),
                        'Stock removed from your watchlist.',
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="copilot-card daily-brief-card">
              <div className="copilot-card-head">
                <div><span>Evidence-linked briefing</span><strong>Daily research pulse</strong></div>
                <Sparkles size={18} />
              </div>

              {!brief ? (
                <div className="brief-empty">
                  <BrainCircuit size={25} />
                  <strong>No brief generated yet</strong>
                  <span>Add covered stocks, then generate the first transparent briefing.</span>
                </div>
              ) : (
                <>
                  <div className="brief-meta">
                    <span>{brief.title}</span>
                    <span>{compactDate(brief.generatedAt)}</span>
                  </div>
                  <p className="brief-summary">{brief.executiveSummary}</p>

                  <div className="brief-section-title">Highest current research scores</div>
                  <div className="brief-highlights">
                    {brief.highlights.slice(0, 4).map((item) => (
                      <article key={item.assetId}>
                        <div><strong>{item.symbol}</strong><span>{classificationLabel(item.classification)}</span></div>
                        <strong>{item.researchScore === null ? '—' : Math.round(item.researchScore)}</strong>
                      </article>
                    ))}
                  </div>

                  <div className="brief-risk-line">
                    <BellRing size={15} />
                    <span>{brief.risks.length} watchlist names have published risk or freshness flags.</span>
                  </div>
                  <small className="brief-method">{brief.methodologyVersion} · source data through {compactDate(brief.sourceMaxTimestamp)}</small>
                </>
              )}

              <button
                className="primary-button generate-brief-button"
                type="button"
                disabled={loading || workspace.items.length === 0}
                onClick={() => void handleGenerate()}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                {brief ? 'Refresh evidence brief' : 'Generate first brief'}
              </button>
            </section>

            <section className="copilot-card alert-card">
              <div className="copilot-card-head">
                <div><span>Explainable monitoring</span><strong>Research alerts</strong></div>
                <Bell size={18} />
              </div>

              <form className="research-alert-form" onSubmit={handleAlert}>
                <select
                  value={alertAssetId}
                  disabled={watchlistRows.length === 0}
                  onChange={(event) => setAlertAssetId(event.target.value)}
                >
                  {watchlistRows.length === 0
                    ? <option value="">Add a watchlist stock first</option>
                    : watchlistRows.map((item) => (
                        <option key={item.assetId} value={item.assetId}>
                          {item.security?.symbol ?? `Asset ${item.assetId}`}
                        </option>
                      ))}
                </select>
                <select
                  value={alertCondition}
                  onChange={(event) => setAlertCondition(event.target.value as typeof alertCondition)}
                >
                  <option value="research_score_above">Score moves above</option>
                  <option value="research_score_below">Score moves below</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={alertTarget}
                  aria-label="Research score threshold"
                  onChange={(event) => setAlertTarget(event.target.value)}
                />
                <button className="secondary-button" type="submit" disabled={loading || !alertAssetId}>
                  <Plus size={14} /> Add rule
                </button>
              </form>

              <div className="alert-rule-list">
                {workspace.alerts.length === 0 ? (
                  <div className="copilot-list-empty">No monitoring rules yet.</div>
                ) : workspace.alerts.slice(0, 6).map((alert) => (
                  <div key={alert.id}>
                    <span>
                      {securityByAsset.get(alert.assetId)?.symbol ?? `Asset ${alert.assetId}`}
                      {' · '}{alert.condition.replace(/_/g, ' ')} {alert.targetValue ?? ''}
                    </span>
                    <button
                      className="quiet-icon-button"
                      type="button"
                      title="Delete alert"
                      disabled={loading}
                      onClick={() => void runAction(
                        () => deleteResearchAlert(alert.id),
                        'Research alert deleted.',
                      )}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="brief-section-title alert-events-title">Recent evidence events</div>
              <div className="research-event-list">
                {workspace.events.length === 0 ? (
                  <div className="copilot-list-empty">Events appear when a new research snapshot crosses a rule.</div>
                ) : workspace.events.slice(0, 5).map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    className={event.readAt ? 'research-event read' : 'research-event'}
                    onClick={() => {
                      if (!event.readAt) {
                        void runAction(
                          () => markResearchAlertRead(event.id),
                          'Alert marked as reviewed.',
                        )
                      }
                    }}
                  >
                    <span className={`event-dot ${event.severity}`} />
                    <div><strong>{event.title}</strong><span>{compactDate(event.triggeredAt)}</span></div>
                    {event.readAt ? <Check size={13} /> : null}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <p className="copilot-boundary">
            Copilot output is non-personalized research, not a buy/sell/hold
            instruction, suitability assessment or return guarantee. Email and
            push delivery remain disabled until reviewed providers and consent
            controls are configured.
          </p>
        </>
      )}

      {error ? <div className="inline-message error" role="alert">{error}</div> : null}
      {success ? <div className="inline-message success" role="status">{success}</div> : null}
    </section>
  )
}
