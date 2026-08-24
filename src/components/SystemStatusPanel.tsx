import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  getPlatformStatus,
  type PlatformServiceStatus,
} from '../lib/queries/platformStatus'

const priority: Record<PlatformServiceStatus['status'], number> = {
  operational: 0,
  initializing: 1,
  degraded: 2,
  outage: 3,
}

const labels: Record<PlatformServiceStatus['status'], string> = {
  operational: 'Operational',
  initializing: 'Initializing',
  degraded: 'Degraded',
  outage: 'Service disruption',
}

function percentage(basisPoints: number | null) {
  if (basisPoints === null) return 'Collecting evidence'
  return `${(basisPoints / 100).toFixed(2)}% observed`
}

function compactTime(value: string | null) {
  if (!value) return 'Awaiting first check'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function StatusIcon({ status }: { status: PlatformServiceStatus['status'] }) {
  if (status === 'operational') return <CheckCircle2 size={19} />
  if (status === 'initializing') return <Clock3 size={19} />
  return <AlertTriangle size={19} />
}

export function SystemStatusPanel() {
  const [services, setServices] = useState<PlatformServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    try {
      setServices(await getPlatformStatus())
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const overallStatus = useMemo<PlatformServiceStatus['status']>(() => (
    services.length === 0 ? 'initializing' : services.reduce<PlatformServiceStatus['status']>(
      (current, service) => priority[service.status] > priority[current] ? service.status : current,
      'operational',
    )
  ), [services])
  const visualStatus: PlatformServiceStatus['status'] = unavailable ? 'degraded' : overallStatus

  const overallCopy = unavailable
    ? 'Status information is temporarily unavailable. Product safeguards remain active.'
    : overallStatus === 'operational'
      ? 'All monitored customer services are operating normally.'
      : overallStatus === 'initializing'
        ? 'Reliability monitoring is collecting its first production evidence.'
        : 'We are investigating a service issue. Safeguards remain active.'

  return (
    <section className={`system-status-panel ${visualStatus}`} id="system-status" aria-live="polite">
      <div className="system-status-summary">
        <div className="system-status-icon"><Activity size={20} /></div>
        <div>
          <span>Production reliability</span>
          <strong>{unavailable ? 'Status unavailable' : labels[overallStatus]}</strong>
          <p>{overallCopy}</p>
        </div>
        <button
          type="button"
          className="status-refresh-button"
          onClick={() => void load(true)}
          disabled={refreshing}
          aria-label="Refresh platform status"
        >
          <RefreshCw size={16} className={refreshing ? 'spinning' : undefined} />
          Refresh
        </button>
      </div>

      <div className="system-status-grid" aria-label="Monitored service status">
        {loading ? (
          <div className="status-loading" role="status">Loading customer-safe service health…</div>
        ) : services.length === 0 ? (
          <div className="status-loading">Reliability evidence is being initialized.</div>
        ) : services.map((service) => (
          <article key={service.serviceCode} className={`system-service-card ${service.status}`}>
            <StatusIcon status={service.status} />
            <div>
              <strong>{service.displayName}</strong>
              <span>{labels[service.status]}</span>
              <p>{service.message ?? 'No customer action is required.'}</p>
              <small>
                {percentage(service.observedAvailabilityBps)} · target{' '}
                {(service.targetAvailabilityBps / 100).toFixed(2)}%
              </small>
              <small>Checked {compactTime(service.lastCheckedAt)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
