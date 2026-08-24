import { Download, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth/AuthProvider'
import {
  cancelDeletionRequest, createPrivacyRequest, getPrivacyCenter,
  type PrivacyRequest, savePrivacyPreferences,
} from '../lib/queries/customerPrivacy'

export function CustomerPrivacyPanel() {
  const { session } = useAuth()
  const [analytics, setAnalytics] = useState(false)
  const [updates, setUpdates] = useState(false)
  const [requests, setRequests] = useState<PrivacyRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const center = await getPrivacyCenter()
      setAnalytics(center.preferences?.productAnalytics ?? false)
      setUpdates(center.preferences?.researchUpdates ?? false)
      setRequests(center.requests)
      setError(null)
    } catch { setError('Your privacy controls could not be loaded.') }
    finally { setLoading(false) }
  }, [session])

  useEffect(() => { void refresh() }, [refresh])
  if (!session) return null

  const save = async () => {
    setLoading(true); setMessage(null)
    try { await savePrivacyPreferences(analytics, updates); setMessage('Privacy preferences saved.') }
    catch { setError('Your privacy preferences could not be saved.') }
    finally { setLoading(false) }
  }

  const request = async (type: PrivacyRequest['requestType']) => {
    if (type === 'account_deletion' && !window.confirm('Request account deletion? No data is deleted immediately and you can cancel while it is pending.')) return
    setLoading(true); setMessage(null); setError(null)
    try { await createPrivacyRequest(type); await refresh(); setMessage(type === 'access_export' ? 'Data access request recorded.' : 'Account deletion request recorded for protected review.') }
    catch (requestError) {
      setError(requestError instanceof Error && requestError.message.includes('Authenticator')
        ? 'Complete authenticator verification in Security Center first.'
        : 'The privacy request could not be recorded.')
    } finally { setLoading(false) }
  }

  const pendingDeletion = requests.find((item) => item.requestType === 'account_deletion' && item.status === 'requested')
  return (
    <section className="panel account-security-panel">
      <div className="panel-header"><div><p className="eyebrow">Privacy · Phase 4L</p><h2>Data Control Center</h2></div><span className="status-badge"><ShieldCheck size={14} /> Private</span></div>
      <p className="panel-description">Choose optional data uses and exercise account rights through an auditable, identity-bound workflow.</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      <div className="privacy-controls">
        <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Allow privacy-safe product analytics</label>
        <label><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} /> Receive research and product updates</label>
        <button className="secondary-button" disabled={loading} onClick={() => void save()}>{loading ? <LoaderCircle className="spinning" size={16} /> : null} Save choices</button>
      </div>
      <div className="privacy-actions">
        <button className="secondary-button" disabled={loading} onClick={() => void request('access_export')}><Download size={16} /> Request my data</button>
        {!pendingDeletion ? <button className="secondary-button" disabled={loading} onClick={() => void request('account_deletion')}><Trash2 size={16} /> Request account deletion</button>
          : <button className="secondary-button" disabled={loading} onClick={() => void cancelDeletionRequest(pendingDeletion.id).then(refresh)}><Trash2 size={16} /> Cancel deletion request</button>}
      </div>
      <p className="data-source-note">Requests are queued for verified review. Account deletion, trading, payments, transfers, and fund movement never occur from this browser action.</p>
    </section>
  )
}
