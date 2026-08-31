import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  clearLocalTrustActivity,
  createSafeSupportContext,
  getTrustExperienceMode,
  readLocalTrustActivity,
  setTrustExperienceMode,
  subscribeToLocalTrustActivity,
  trustReceiptStandards,
  type LocalTrustActivity,
  type TrustExperienceMode,
} from '../lib/trustLayer'
import {
  getPlatformStatus,
  type PlatformServiceStatus,
} from '../lib/queries/platformStatus'

type AlertLevel = 'attention' | 'information'
type AlertFilter = 'all' | AlertLevel

type TrustAlert = {
  id: string
  level: AlertLevel
  title: string
  detail: string
}

const statusPriority: Record<PlatformServiceStatus['status'], number> = {
  operational: 0,
  initializing: 1,
  degraded: 2,
  outage: 3,
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function TrustCenterPanel() {
  const [services, setServices] = useState<PlatformServiceStatus[]>([])
  const [statusUnavailable, setStatusUnavailable] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [mode, setMode] = useState<TrustExperienceMode>(() => getTrustExperienceMode())
  const [activity, setActivity] = useState<LocalTrustActivity[]>(() => readLocalTrustActivity())
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all')
  const [copyState, setCopyState] = useState('Safe context is ready to copy.')

  const loadStatus = useCallback(async () => {
    try {
      setServices(await getPlatformStatus())
      setStatusUnavailable(false)
    } catch {
      setServices([])
      setStatusUnavailable(true)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    setTrustExperienceMode(mode)
  }, [mode])

  useEffect(() => subscribeToLocalTrustActivity(() => {
    setActivity(readLocalTrustActivity())
  }), [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const reliabilityState = useMemo(() => {
    if (statusUnavailable) return 'Status unavailable — safeguards active'
    if (statusLoading || services.length === 0) return 'Initializing'

    const worst = services.reduce<PlatformServiceStatus['status']>(
      (current, service) => statusPriority[service.status] > statusPriority[current]
        ? service.status
        : current,
      'operational',
    )
    if (worst === 'operational') return 'Operational'
    if (worst === 'initializing') return 'Initializing'
    if (worst === 'degraded') return 'Degraded — safeguards active'
    return 'Service disruption — safeguards active'
  }, [services, statusLoading, statusUnavailable])

  const alerts = useMemo<TrustAlert[]>(() => {
    const result: TrustAlert[] = []

    if (statusUnavailable) {
      result.push({
        id: 'status-unavailable',
        level: 'attention',
        title: 'Reliability evidence is temporarily unavailable',
        detail: 'The product fails safe: execution and money movement remain locked.',
      })
    } else {
      services.forEach((service) => {
        if (service.status === 'degraded' || service.status === 'outage') {
          result.push({
            id: service.serviceCode,
            level: 'attention',
            title: `${service.displayName}: ${service.status === 'outage' ? 'service disruption' : 'degraded'}`,
            detail: service.message ?? 'Safeguards remain active while the issue is reviewed.',
          })
        }
      })
    }

    if (statusLoading || (!statusUnavailable && services.length === 0)) {
      result.push({
        id: 'status-initializing',
        level: 'information',
        title: 'Reliability monitoring is initializing',
        detail: 'No customer action is required while the first evidence is collected.',
      })
    }

    result.push({
      id: 'hard-locks',
      level: 'information',
      title: 'Controlled-beta safety boundary',
      detail: 'Live orders, custody, checkout and cross-border money movement remain hard locked.',
    })

    return result
  }, [services, statusLoading, statusUnavailable])

  const filteredAlerts = alertFilter === 'all'
    ? alerts
    : alerts.filter((alert) => alert.level === alertFilter)
  const safeSupportContext = useMemo(
    () => createSafeSupportContext('#trust-center', reliabilityState),
    [reliabilityState],
  )

  const copySupportContext = async () => {
    try {
      await navigator.clipboard.writeText(safeSupportContext)
      setCopyState('Safe support context copied.')
    } catch {
      setCopyState('Copy was blocked. Select the visible context and copy it manually.')
    }
  }

  return (
    <section className="trust-center-panel" aria-labelledby="trust-center-heading">
      <div className="trust-center-toolbar">
        <div>
          <p className="eyebrow">TradePulse Trust Layer · Phase 5G</p>
          <h2 id="trust-center-heading">Evidence you can verify</h2>
          <p className="panel-description">
            Review what TradePulse must disclose before a forecast, brokerage preview or
            cross-border quote can be trusted. This workspace does not execute orders or move funds.
          </p>
        </div>
        <div className="trust-mode-control" role="group" aria-label="Product experience mode">
          {(['guided', 'professional'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
            >
              {option === 'guided' ? 'Guided' : 'Professional'}
            </button>
          ))}
        </div>
      </div>

      <article className={`trust-reliability-shield ${statusUnavailable ? 'attention' : ''}`}>
        <span className="trust-icon" aria-hidden="true">✓</span>
        <div>
          <span>Reliability Shield</span>
          <strong>{reliabilityState}</strong>
          <p className="trust-guidance">
            When evidence is stale, missing or degraded, TradePulse shows the limitation and
            preserves every safety lock instead of presenting a confident action state.
          </p>
        </div>
        <span className="trust-lock"><span aria-hidden="true">●</span> Safety locks active</span>
      </article>

      <div className="trust-section-heading">
        <div>
          <p className="eyebrow">Trust receipts</p>
          <h3>Know what supports every decision</h3>
        </div>
        <span><span aria-hidden="true">✓</span> Review standards</span>
      </div>
      <div className="trust-receipt-grid">
        {trustReceiptStandards.map((receipt) => (
          <article key={receipt.id} className="trust-receipt-card">
            <div className="trust-receipt-title">
              <span aria-hidden="true">✓</span>
              <div>
                <h4>{receipt.title}</h4>
                <p className="trust-guidance">{receipt.description}</p>
              </div>
            </div>
            <ul>
              {receipt.evidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <strong className="trust-boundary"><span aria-hidden="true">●</span> {receipt.boundary}</strong>
          </article>
        ))}
      </div>

      <div className="trust-two-column">
        <section className="trust-subpanel" aria-labelledby="trust-alerts-heading">
          <div className="trust-subpanel-heading">
            <div>
              <span className="trust-heading-symbol" aria-hidden="true">!</span>
              <h3 id="trust-alerts-heading">Smart alert inbox</h3>
            </div>
            <span>{alerts.length} active</span>
          </div>
          <div className="trust-alert-filters" role="group" aria-label="Filter trust alerts">
            {(['all', 'attention', 'information'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={alertFilter === filter}
                onClick={() => setAlertFilter(filter)}
              >
                {filter[0].toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          <div className="trust-alert-list" aria-live="polite">
            {filteredAlerts.length === 0 ? (
              <p className="trust-empty">No alerts match this filter.</p>
            ) : filteredAlerts.map((alert) => (
              <article key={alert.id} className={`trust-alert ${alert.level}`}>
                {alert.level === 'attention'
                  ? <span className="trust-alert-symbol" aria-hidden="true">!</span>
                  : <span className="trust-alert-symbol" aria-hidden="true">i</span>}
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="trust-subpanel" aria-labelledby="trust-activity-heading">
          <div className="trust-subpanel-heading">
            <div>
              <span className="trust-heading-symbol" aria-hidden="true">↺</span>
              <h3 id="trust-activity-heading">Financial flight recorder</h3>
            </div>
            <button
              type="button"
              className="trust-clear-button"
              onClick={() => clearLocalTrustActivity()}
              disabled={activity.length === 0}
            >
              <span aria-hidden="true">×</span> Clear local activity
            </button>
          </div>
          <p className="trust-local-note">
            Local to this browser. This history records workspace visits only—never holdings,
            payment details, credentials or advice.
          </p>
          <ol className="trust-activity-list">
            {activity.length === 0 ? (
              <li className="trust-empty">No local workspace activity recorded.</li>
            ) : activity.slice(0, 6).map((entry) => (
              <li key={entry.id}>
                <span aria-hidden="true">•</span>
                <div>
                  <a href={entry.href}>{entry.label}</a>
                  <time dateTime={entry.occurredAt}>{formatActivityTime(entry.occurredAt)}</time>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="trust-support-context" aria-labelledby="trust-support-heading">
        <div>
          <p className="eyebrow">Context-aware support</p>
          <h3 id="trust-support-heading">Share the problem, not your private data</h3>
          <p className="trust-guidance">
            This context includes only the release, workspace, reliability state and timestamp.
            It deliberately excludes identity, credentials, portfolio and payment data.
          </p>
          <button type="button" className="secondary-button" onClick={() => void copySupportContext()}>
            <span aria-hidden="true">⧉</span> Copy safe support context
          </button>
          <p role="status" className="trust-copy-state">{copyState}</p>
        </div>
        <pre aria-label="Safe support context">{safeSupportContext}</pre>
      </section>
    </section>
  )
}
