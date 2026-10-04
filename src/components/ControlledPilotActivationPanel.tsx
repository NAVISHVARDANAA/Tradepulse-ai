import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  DatabaseZap,
  Gauge,
  LoaderCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  getControlledPilotActivation,
  type ControlledPilotActivation,
} from '../lib/queries/controlledPilotActivation'

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The controlled pilot activation cockpit is temporarily unavailable.'
}

export function ControlledPilotActivationPanel() {
  const [activation, setActivation] = useState<ControlledPilotActivation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getControlledPilotActivation().then((next) => {
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
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading controlled pilot activation readiness…</section>
  }

  const blockedFoundationCount = activation.operatingModel.foundations.length
    - activation.operatingModel.readyFoundationCount

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Operational launch readiness · Phase 8Y</p><h2>Controlled pilot activation cockpit</h2></div>
        <span className="status-badge warning"><Ban size={14} /> Activation blocked</span>
      </div>
      <p className="panel-description">
        Turn the Phase 8X operating model into a human-owned launch sequence for a free, four-week research and paper-simulation pilot, without enabling public signup or financial execution.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No participant invitation or pilot access is authorized in Phase 8Y</strong>
          <span>All eight activation gates require independent evidence and a separate accountable go / no-go decision before the first invitation.</span>
        </div>
        <small>{activation.readyGateCount}/{activation.gates.length} gates ready</small>
      </div>

      <div className="certification-summary" aria-label="Controlled pilot activation summary">
        <article><ClipboardCheck /><strong>{activation.readyGateCount}/{activation.gates.length}</strong><span>activation gates</span><small>Human verification required</small></article>
        <article><Users /><strong>{activation.participantCeiling}</strong><span>participant ceiling</span><small>Three progressive waves</small></article>
        <article><Gauge /><strong>{activation.stopConditions.length}</strong><span>stop conditions</span><small>Fail closed</small></article>
        <article><ShieldCheck /><strong>{blockedFoundationCount}</strong><span>blocked foundations</span><small>Read-only status</small></article>
      </div>

      <div className="certification-boundary" role="note">
        <DatabaseZap size={22} />
        <div>
          <strong>Real-time market data is not active</strong>
          <span>The pilot may use clearly labelled authorized reference or delayed data. Real-time display requires a contracted licensed provider, entitlements, vaulted credentials, certified integration and a zero-customer canary.</span>
        </div>
        <small>{activation.realTimeDataEnabled ? 'Real time' : 'Reference / delayed'}</small>
      </div>

      <section className="certification-gate-board" aria-labelledby="activation-gates-title">
        <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="activation-gates-title">Eight activation gates</h3></div><small>Evidence before invitation</small></div>
        <ol>{activation.gates.map((gate, index) => <li key={gate.key}><span>{index + 1}</span><div><strong>{gate.label}</strong><em>{gate.accountableOwner} · Verification required</em><small>{gate.requiredEvidence}</small></div></li>)}</ol>
      </section>

      <section className="certification-profile-board" aria-labelledby="activation-waves-title">
        <div className="certification-heading"><div><Users size={18} /><h3 id="activation-waves-title">Three progressive pilot waves</h3></div><small>5 + 10 + 15 = 30 maximum</small></div>
        <div className="certification-profile-grid">
          {activation.waves.map((wave, index) => <article key={wave.label}>
            <span>{index + 1}</span><div><strong>{wave.label}</strong><small>{wave.audience}</small><small>{wave.advanceWhen}</small></div><em>{wave.participantCeiling} people</em>
          </article>)}
        </div>
      </section>

      <section className="certification-gate-board" aria-labelledby="pilot-stop-title">
        <div className="certification-heading"><div><CircleAlert size={18} /><h3 id="pilot-stop-title">Eight immediate stop conditions</h3></div><small>Pause, revoke or roll back</small></div>
        <ol>{activation.stopConditions.map((condition, index) => <li key={condition.label}><span>{index + 1}</span><div><strong>{condition.label}</strong><em>Stop condition</em><small>{condition.response}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8Y prepares the pilot launch decision; it does not make that decision. Invitations, provisioning, real-time provider connectivity, live display, trading, payments, money movement, custody and settlement remain disabled.</p>
    </section>
  )
}

export default ControlledPilotActivationPanel
