import {
  Ban,
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  Gauge,
  KeyRound,
  LoaderCircle,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  getLicensedRealtimeDataActivation,
  type LicensedRealtimeDataActivation,
} from '../lib/queries/licensedRealtimeDataActivation'

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The licensed real-time activation cockpit is temporarily unavailable.'
}

export function LicensedRealtimeDataActivationPanel() {
  const [activation, setActivation] = useState<LicensedRealtimeDataActivation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getLicensedRealtimeDataActivation().then((next) => {
      if (!active) return
      setActivation(next)
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  if (!activation) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading licensed real-time activation readiness…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Licensed market-data delivery · Phase 8Z</p><h2>Real-time data activation cockpit</h2></div>
        <span className="status-badge warning"><Ban size={14} /> Production feed gated</span>
      </div>
      <p className="panel-description">
        Prepare a secure Twelve Data streaming path that can deliver licensed price observations through the existing database real-time channel, without exposing a provider key or claiming customer-ready coverage before contractual approval.
      </p>

      <div className="certification-boundary" role="note">
        <RadioTower size={22} />
        <div>
          <strong>The real-time adapter is implemented; customer display is not active</strong>
          <span>Commercial display and redistribution rights, production credentials and a successful zero-customer canary remain required.</span>
        </div>
        <small>Fail closed</small>
      </div>

      <div className="certification-summary" aria-label="Licensed real-time activation summary">
        <article><CheckCircle2 /><strong>{activation.implementedControlCount}/6</strong><span>controls implemented</span><small>Three external gates remain</small></article>
        <article><Gauge /><strong>{activation.symbolCeiling}</strong><span>canary symbol ceiling</span><small>Bounded configuration</small></article>
        <article><RadioTower /><strong>{activation.streamWindowSeconds}s</strong><span>maximum stream window</span><small>Edge-runtime safe</small></article>
        <article><KeyRound /><strong>0</strong><span>browser provider keys</span><small>Server secrets only</small></article>
      </div>

      <div className="certification-boundary" role="note">
        <DatabaseZap size={22} />
        <div>
          <strong>{activation.transport} → {activation.delivery}</strong>
          <span>Only validated, current, allow-listed observations can reach market_observations; existing route-scoped subscriptions then refresh visible market data.</span>
        </div>
        <small>No direct browser feed</small>
      </div>

      <section className="certification-gate-board" aria-labelledby="realtime-controls-title">
        <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="realtime-controls-title">Six activation controls</h3></div><small>Code plus external evidence</small></div>
        <ol>{activation.controls.map((control, index) => <li key={control.label}>
          <span>{index + 1}</span>
          <div><strong>{control.label}</strong><em>{control.status.replace(/-/g, ' ')}</em><small>{control.detail}</small></div>
        </li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8Z adds an activation-ready adapter and verifiable safety gates. It does not sign a data contract, provision credentials, run the canary, deploy a feed or enable a real-time label. Trading, payments, money movement, custody and settlement remain disabled.</p>
    </section>
  )
}

export default LicensedRealtimeDataActivationPanel
