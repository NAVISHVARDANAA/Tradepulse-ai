import { Bell, BellOff, CheckCircle2, DatabaseZap, LoaderCircle, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth/AuthProvider'
import {
  getDataTrustState, getNotificationPreferences, saveNotificationPreferences,
  type DataTrustState, type NotificationPreferences,
} from '../lib/queries/dataTrustNotifications'

const defaults: NotificationPreferences = {
  inAppEnabled: true, emailEnabled: false, pushEnabled: false,
  researchAlerts: true, platformIncidents: true, productUpdates: false,
  externalDeliveryEnabled: false,
}

const labels: Record<string, string> = {
  market_data: 'Market observations', trade_data: 'Global trade data', sync_operations: 'Source synchronization',
}

export function DataTrustNotificationPanel() {
  const { session } = useAuth()
  const [trust, setTrust] = useState<DataTrustState[]>([])
  const [preferences, setPreferences] = useState(defaults)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const dataTrust = await getDataTrustState()
      setTrust(dataTrust)
      if (session) setPreferences(await getNotificationPreferences())
      setError(null)
    } catch { setError('Data-trust and notification controls could not be loaded.') }
    finally { setLoading(false) }
  }, [session])
  useEffect(() => { void refresh() }, [refresh])

  const update = (key: keyof NotificationPreferences, value: boolean) => setPreferences((current) => ({ ...current, [key]: value }))
  const save = async () => {
    setLoading(true); setMessage(null); setError(null)
    try { await saveNotificationPreferences(preferences); setMessage('Notification choices and unsubscribe evidence were saved.') }
    catch { setError('Notification choices could not be saved.') }
    finally { setLoading(false) }
  }

  return <section className="panel data-trust-panel">
    <div className="panel-header"><div><p className="eyebrow">Data trust + notifications · Phase 4M</p><h2>Evidence before alerts</h2></div><span className="status-badge"><DatabaseZap size={14} /> Reconciled</span></div>
    <p className="panel-description">Freshness, completeness and duplicate checks stay visible. Alerts inform review and never authorize a trade or payment.</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="data-trust-grid">
      {loading && !trust.length ? <p role="status"><LoaderCircle className="spinning" size={16} /> Loading trust evidence…</p> : null}
      {!loading && !trust.length ? <div className="data-trust-empty"><ShieldAlert size={18} /><strong>Evaluation not run</strong><span>The protected production evaluator must publish the first evidence.</span></div> : null}
      {trust.map((item) => <article key={item.dataset} className={`data-trust-card ${item.status}`}>
        <div><strong>{labels[item.dataset] ?? item.dataset}</strong><span className={`quality-state ${item.status}`}>{item.status}</span></div>
        <dl><div><dt>Freshness</dt><dd>{item.freshnessMinutes === null ? 'Unknown' : `${item.freshnessMinutes} min`}</dd></div><div><dt>Rows checked</dt><dd>{item.recordsChecked}</dd></div><div><dt>Null rows</dt><dd>{item.nullRecords}</dd></div><div><dt>Duplicate groups</dt><dd>{item.duplicateGroups}</dd></div></dl>
      </article>)}
    </div>
    {session ? <div className="notification-preferences">
      <div><h3><Bell size={18} /> Notification choices</h3><p>Email and push record your intent but remain technically disabled until provider, privacy and regional approval.</p></div>
      <div className="notification-toggle-grid">
        <label><input type="checkbox" checked={preferences.inAppEnabled} onChange={(event) => update('inAppEnabled', event.target.checked)} /> In-app alerts</label>
        <label><input type="checkbox" checked={preferences.researchAlerts} onChange={(event) => update('researchAlerts', event.target.checked)} /> Research alerts</label>
        <label><input type="checkbox" checked={preferences.platformIncidents} onChange={(event) => update('platformIncidents', event.target.checked)} /> Platform incidents</label>
        <label><input type="checkbox" checked={preferences.productUpdates} onChange={(event) => update('productUpdates', event.target.checked)} /> Product updates</label>
        <label><input type="checkbox" checked={preferences.emailEnabled} onChange={(event) => update('emailEnabled', event.target.checked)} /> Email intent</label>
        <label><input type="checkbox" checked={preferences.pushEnabled} onChange={(event) => update('pushEnabled', event.target.checked)} /> Push intent</label>
      </div>
      <div className="notification-actions"><button className="secondary-button" disabled={loading} onClick={() => void save()}><CheckCircle2 size={16} /> Save choices</button><button className="secondary-button" disabled={loading} onClick={() => { setPreferences({ ...preferences, emailEnabled: false, pushEnabled: false, productUpdates: false }); setMessage('External channels are off. Save choices to record the unsubscribe event.') }}><BellOff size={16} /> Unsubscribe external channels</button></div>
      {message && <p className="success-message" role="status">{message}</p>}
    </div> : <p className="data-source-note">Sign in to choose notification categories and record unsubscribe preferences.</p>}
  </section>
}
