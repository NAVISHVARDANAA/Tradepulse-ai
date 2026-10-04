import {
  Ban,
  CircleAlert,
  ClipboardCheck,
  Gauge,
  LoaderCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  getControlledAudiencePilotOperatingModel,
  type ControlledAudiencePilotOperatingModel,
} from '../lib/queries/controlledAudiencePilotOperatingModel'

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The controlled-audience pilot operating model is temporarily unavailable.'
}

export function ControlledAudiencePilotOperatingModelPanel() {
  const [model, setModel] = useState<ControlledAudiencePilotOperatingModel | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getControlledAudiencePilotOperatingModel().then((next) => {
      if (!active) return
      setModel(next)
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  if (!model) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading controlled-audience pilot operating model…</section>
  }

  const participantTarget = model.cohorts.reduce((total, cohort) => total + cohort.target, 0)

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Customer discovery foundation · Phase 8X</p><h2>Controlled-audience pilot operating model</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Plan only</span>
      </div>
      <p className="panel-description">
        Prepare a free, four-week research and paper-simulation pilot for at most 30 approved participants while the separate real-time-data track remains blocked.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No participant invitations or public signup are enabled in Phase 8X</strong>
          <span>No automated provisioning, payment collection, live provider connection, production payload, live display, order routing, money movement, custody or settlement is authorized.</span>
        </div>
        <small>{model.readyFoundationCount}/3 foundations ready</small>
      </div>

      <div className="certification-summary" aria-label="Controlled-audience pilot summary">
        <article><Users /><strong>{participantTarget}</strong><span>participant ceiling</span><small>Five cohorts</small></article>
        <article><Gauge /><strong>4</strong><span>pilot weeks</span><small>Free evaluation</small></article>
        <article><ClipboardCheck /><strong>{model.workstreams.length}</strong><span>workstreams</span><small>Human owned</small></article>
        <article><ShieldCheck /><strong>{model.metrics.length}</strong><span>decision metrics</span><small>Zero safety breaches</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="pilot-cohort-title">
          <div className="certification-heading"><div><Users size={18} /><h3 id="pilot-cohort-title">Five learning cohorts</h3></div><small>Targets, not invitations</small></div>
          <div className="certification-profile-grid">
            {model.cohorts.map((cohort, index) => (
              <article key={cohort.label}>
                <span>{index + 1}</span><div><strong>{cohort.label}</strong><small>{cohort.learningGoal}</small></div><em>{cohort.target} target</em>
              </article>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="pilot-foundation-title">
          <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="pilot-foundation-title">Three prerequisite foundations</h3></div><small>Read-only status</small></div>
          <div className="contract-fixture-list">
            {model.foundations.map((foundation) => <article key={foundation.key}>
              <strong>{foundation.label}</strong>
              <small>{foundation.dimensionCount} dimensions · {foundation.gateCount} gates · {foundation.readinessCellCount} cells</small>
              <em>{foundation.ready ? 'Ready' : `${foundation.blockedReadinessCellCount} blocked · ${foundation.authorizedReadinessCellCount} authorized`}</em>
            </article>)}
          </div>
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="pilot-workstream-title">
        <div className="certification-heading"><div><ClipboardCheck size={18} /><h3 id="pilot-workstream-title">Eight operating workstreams</h3></div><small>Evidence before activation</small></div>
        <ol>{model.workstreams.map((workstream, index) => <li key={workstream.label}><span>{index + 1}</span><div><strong>{workstream.label}</strong><em>Manual owner required</em><small>{workstream.deliverable}</small></div></li>)}</ol>
      </section>

      <section className="certification-gate-board" aria-labelledby="pilot-metric-title">
        <div className="certification-heading"><div><Gauge size={18} /><h3 id="pilot-metric-title">Seven go / no-go measures</h3></div><small>Four-week learning loop</small></div>
        <ol>{model.metrics.map((metric, index) => <li key={metric.label}><span>{index + 1}</span><div><strong>{metric.label}: {metric.threshold}</strong><em>Decision evidence</em><small>{metric.decisionUse}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Phase 8X separates a controlled research/paper pilot from the real-time-data path. Launch still requires an approved participant roster, consent language, staffed support, privacy-safe telemetry, an explicit cost ceiling, rollback ownership and an accountable human go/no-go decision.</p>
    </section>
  )
}

export default ControlledAudiencePilotOperatingModelPanel
