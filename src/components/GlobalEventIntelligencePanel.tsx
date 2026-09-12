import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  Globe2,
  LoaderCircle,
  Network,
  Radar,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import {
  getGlobalEventIntelligence,
  saveGlobalEventAlertPolicy,
  type GlobalEventIntelligence,
} from '../lib/queries/globalEventIntelligence'

const eventTypes = [
  'resource_discovery', 'energy_supply', 'logistics_disruption',
  'monetary_policy', 'geopolitics', 'extreme_weather', 'macro_data',
] as const
const assets = ['XAUUSD', 'WTI', 'EURUSD', 'USDINR'] as const

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function signed(value: number | null) {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Global event intelligence is temporarily unavailable.'
}

export function GlobalEventIntelligencePanel() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [snapshot, setSnapshot] = useState<{
    ownerId: string | null
    board: GlobalEventIntelligence
  } | null>(null)
  const board = snapshot?.ownerId === (userId ?? null) ? snapshot.board : null
  const [country, setCountry] = useState('ALL')
  const [eventType, setEventType] = useState('ALL')
  const [policyId] = useState(() => `event-alert-${crypto.randomUUID()}`)
  const [policyName, setPolicyName] = useState('Global event watch')
  const [alertCountry, setAlertCountry] = useState('GLOBAL')
  const [alertType, setAlertType] = useState<(typeof eventTypes)[number]>('resource_discovery')
  const [alertAsset, setAlertAsset] = useState<(typeof assets)[number]>('XAUUSD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setError(null)
    void getGlobalEventIntelligence(userId).then((next) => {
      if (active) setSnapshot({ ownerId: userId ?? null, board: next })
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [userId])

  const visibleEvents = useMemo(() => board?.events.filter((event) =>
    (country === 'ALL' || event.countryCode === country || (country === 'GLOBAL' && !event.countryCode)) &&
    (eventType === 'ALL' || event.eventType === eventType),
  ) ?? [], [board, country, eventType])
  const visibleEventIds = useMemo(() => new Set(visibleEvents.map((event) => event.id)), [visibleEvents])
  const visibleImpacts = board?.impacts.filter((impact) => visibleEventIds.has(impact.eventId)) ?? []
  const terminalScenarios = visibleImpacts.filter((impact) => impact.terminalEdge)

  const saveAlert = async (event: FormEvent) => {
    event.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await saveGlobalEventAlertPolicy({
        clientPolicyId: policyId, name: policyName,
        countryCodes: [alertCountry], eventTypes: [alertType],
        assetSymbols: [alertAsset], minimumAuthenticityScore: 0.7,
        minimumConfidenceScore: 0.6, minimumSeverity: 'medium',
      })
      const next = await getGlobalEventIntelligence(userId)
      setSnapshot({ ownerId: userId, board: next })
      setMessage('Your private in-app event alert was saved.')
    } catch (saveError) {
      setError(safeError(saveError))
    } finally {
      setSaving(false)
    }
  }

  if (!board) {
    return error
      ? <section className="panel event-intelligence-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel event-intelligence-panel" role="status"><LoaderCircle className="spinning" /> Loading global event intelligence…</section>
  }

  return (
    <section className="panel event-intelligence-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Global intelligence · Phase 8F</p><h2>Event impact command center</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Evidence gated</span>
      </div>
      <p className="panel-description">
        Trace how country discoveries, energy supply, policy and logistics events could propagate into commodities and currencies. Every scenario is probabilistic, review-only and linked to its source state.
      </p>

      <div className="event-control-strip" aria-label="Global event safeguards">
        <span><Globe2 size={16} /> {board.status.cataloguedCountryCount} catalogued / {board.status.countryCoverageTarget} target</span>
        <span><DatabaseZap size={16} /> Approved structured sources only</span>
        <span><Network size={16} /> {board.status.scenarioCount} causal scenarios</span>
        <span><CircleAlert size={16} /> Rumor promotion off</span>
      </div>

      <div className="event-disclosure" role="note">
        <strong>Demonstration boundary</strong>
        <span>The current event set is synthetic and cannot train a model. Live web, news, logistics and geoscience providers remain disconnected until licensing, rights and authenticity reviews pass.</span>
      </div>
      {error ? <div className="error-message" role="alert">{error}</div> : null}
      {message ? <div className="success-message" role="status">{message}</div> : null}

      <div className="event-filter-bar">
        <label>Country scope
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="ALL">All scenarios</option>
            <option value="GLOBAL">Global / cross-border</option>
            {board.countries.map((item) => <option key={item.countryCode} value={item.countryCode}>{item.countryName}</option>)}
          </select>
        </label>
        <label>Event category
          <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="ALL">All categories</option>
            {eventTypes.map((item) => <option key={item} value={item}>{readable(item)}</option>)}
          </select>
        </label>
        <div className="event-filter-summary"><Radar size={17} /><span>{visibleEvents.length} events · {terminalScenarios.length} market scenarios</span></div>
      </div>

      <div className="event-intelligence-grid">
        <section className="event-signal-board" aria-labelledby="event-signals-title">
          <div className="event-card-heading"><div><Radar size={18} /><span id="event-signals-title">Source-governed event board</span></div><small>Source state visible</small></div>
          {visibleEvents.length ? visibleEvents.map((event) => (
            <article className="event-signal-card" key={event.id}>
              <div>
                <span className={`event-severity ${event.severity}`}>{readable(event.severity)}</span>
                <span className="event-synthetic">Synthetic scenario</span>
              </div>
              <h3>{readable(event.eventType)} · {event.countryName ?? event.regionCode}</h3>
              <p>{event.summary}</p>
              <dl>
                <div><dt>Verification</dt><dd>{readable(event.verificationStatus)}</dd></div>
                <div><dt>Corroboration</dt><dd>{event.corroborationCount} sources</dd></div>
                <div><dt>Novelty</dt><dd>{percent(event.noveltyScore)}</dd></div>
              </dl>
              <small>{event.sourceName} · {event.rightsStatus}</small>
            </article>
          )) : <p className="event-empty">No event matches these filters.</p>}
        </section>

        <section className="event-impact-board" aria-labelledby="event-impact-title">
          <div className="event-card-heading"><div><Network size={18} /><span id="event-impact-title">Causal impact graph</span></div><small>Not a price promise</small></div>
          {visibleImpacts.map((impact) => (
            <article className="event-impact-card" key={impact.id}>
              <div className="event-impact-path">
                <span>{impact.fromEntityName}</span><ArrowRight size={15} /><span>{impact.toEntityName}</span>
              </div>
              <div className="event-impact-meta">
                <span>{readable(impact.mechanism)}</span>
                <span className={`event-direction ${impact.impactDirection}`}>{readable(impact.impactDirection)}</span>
                <span>{percent(impact.probability)} probability</span>
                <span>{percent(impact.confidenceScore)} confidence</span>
              </div>
              <p>{impact.rationale}</p>
              <small>{impact.horizon} horizon · {impact.lagDescription}{impact.terminalEdge ? ` · ${impact.targetSymbol} ${signed(impact.estimatedEffectLowPct)} to ${signed(impact.estimatedEffectHighPct)}` : ''}</small>
            </article>
          ))}
        </section>
      </div>

      <div className="event-lower-grid">
        <section className="event-country-board" aria-labelledby="country-coverage-title">
          <div className="event-card-heading"><div><Globe2 size={18} /><span id="country-coverage-title">Country coverage ledger</span></div><small>Gaps are explicit</small></div>
          <div className="event-country-list">
            {board.countries.map((item) => (
              <div key={item.countryCode}>
                <strong>{item.countryCode}</strong><span>{item.countryName}</span>
                <small>{readable(item.evidenceState)} · {item.currentEventCount} current</small>
              </div>
            ))}
          </div>
        </section>

        <section className="event-alert-board" aria-labelledby="event-alert-title">
          <div className="event-card-heading"><div><BellRing size={18} /><span id="event-alert-title">Personal intelligence alerts</span></div><small>{board.alerts.length}/12 saved</small></div>
          {userId ? (
            <form onSubmit={saveAlert}>
              <label>Alert name<input value={policyName} minLength={3} maxLength={80} required onChange={(event) => setPolicyName(event.target.value)} /></label>
              <label>Country<select value={alertCountry} onChange={(event) => setAlertCountry(event.target.value)}><option value="GLOBAL">Global</option>{board.countries.map((item) => <option key={item.countryCode} value={item.countryCode}>{item.countryName}</option>)}</select></label>
              <label>Event<select value={alertType} onChange={(event) => setAlertType(event.target.value as typeof alertType)}>{eventTypes.map((item) => <option key={item} value={item}>{readable(item)}</option>)}</select></label>
              <label>Asset<select value={alertAsset} onChange={(event) => setAlertAsset(event.target.value as typeof alertAsset)}>{assets.map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spinning" size={16} /> : <Save size={16} />} Save private in-app alert</button>
            </form>
          ) : (
            <div className="event-alert-signin"><BellRing size={26} /><strong>Sign in to customize intelligence alerts</strong><span>Alert policies stay private to your account and cannot place a trade.</span><a className="primary-button" href="#account-security">Sign in to account</a></div>
          )}
          <div className="event-safety-note"><CheckCircle2 size={15} /> Human verification remains mandatory before any synthetic scenario becomes real evidence.</div>
        </section>
      </div>
    </section>
  )
}
