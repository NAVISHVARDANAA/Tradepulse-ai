import {
  Ban,
  CircleAlert,
  FlaskConical,
  KeyRound,
  LoaderCircle,
  ServerOff,
  ShieldCheck,
  Siren,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderCertification,
  type GlobalProviderCertification,
} from '../lib/queries/globalProviderCertification'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider certification readiness is temporarily unavailable.'
}

export function GlobalProviderCertificationPanel() {
  const [fabric, setFabric] = useState<GlobalProviderCertification | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderCertification().then((next) => {
      if (!active) return
      setFabric(next)
      if (!next.profiles.some((profile) => profile.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.profiles[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const selectedProfile = useMemo(() => fabric?.profiles.find(
    (profile) => profile.sourceFamilyKey === selectedKey,
  ), [fabric, selectedKey])
  const selectedIsolation = fabric?.isolation.find(
    (profile) => profile.sourceFamilyKey === selectedKey,
  )

  if (!fabric) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider certification readiness…</section>
  }

  return (
    <section className="panel certification-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8L</p><h2>Provider certification and isolated intake readiness</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Disconnected</span>
      </div>
      <p className="panel-description">
        Define the legal, rights, privacy, security, schema and operational evidence required before one narrowly bounded provider test can be considered.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider is selected or connected in Phase 8L</strong>
          <span>No provider name, endpoint, credential, payload or candidate observation exists. Intake, release, training, publication and execution remain database-locked off.</span>
        </div>
        <small>{fabric.status.certifiedProviderCount} certified providers</small>
      </div>

      <div className="certification-summary" aria-label="Global provider certification summary">
        <article><ServerOff /><strong>{fabric.status.unselectedProviderCount}</strong><span>unselected providers</span><small>{fabric.status.sourceFamilyCount} source families</small></article>
        <article><KeyRound /><strong>{fabric.status.certificationGateCount}</strong><span>certification gates</span><small>No automatic approval</small></article>
        <article><FlaskConical /><strong>{fabric.status.unprovisionedIsolationCount}</strong><span>unprovisioned labs</span><small>Zero candidate capacity</small></article>
        <article><Siren /><strong>{fabric.status.failureDrillCount}</strong><span>failure drills</span><small>{fabric.status.observedDrillCount} observed</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="certification-profile-title">
          <div className="certification-heading"><div><ServerOff size={18} /><h3 id="certification-profile-title">Provider-family certification gaps</h3></div><small>No provider identity stored</small></div>
          <div className="certification-profile-grid">
            {fabric.profiles.map((profile) => (
              <button type="button" className={profile.sourceFamilyKey === selectedKey ? 'selected' : ''} key={profile.sourceFamilyKey} onClick={() => setSelectedKey(profile.sourceFamilyKey)}>
                <span>{profile.sequenceNumber}</span><div><strong>{profile.sourceFamilyName}</strong><small>{readable(profile.sourceClass)}</small></div><em>{readable(profile.certificationStatus)}</em>
              </button>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="certification-detail-title">
          <div className="certification-heading"><div><CircleAlert size={18} /><h3 id="certification-detail-title">Selected certification gap</h3></div><small>No test allowed</small></div>
          {selectedProfile ? <>
            <header><span>{selectedProfile.sequenceNumber}</span><div><strong>{selectedProfile.sourceFamilyName}</strong><small>{readable(selectedProfile.certificationStatus)}</small></div></header>
            <p>{selectedProfile.gapReason}</p>
            <dl>
              <div><dt>Rights</dt><dd>{readable(selectedProfile.rightsReviewStatus)}</dd></div>
              <div><dt>Security</dt><dd>{readable(selectedProfile.privacySecurityReviewStatus)}</dd></div>
              <div><dt>Schema</dt><dd>{readable(selectedProfile.schemaReviewStatus)}</dd></div>
              <div><dt>Isolation</dt><dd>{readable(selectedIsolation?.environmentStatus ?? 'not_provisioned')}</dd></div>
            </dl>
            <small>Candidate capacity: {selectedIsolation?.maximumCandidateRows ?? 0} rows · network egress disabled</small>
          </> : <p>No certification profile is available.</p>}
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="certification-gate-title">
        <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="certification-gate-title">Ten gates before an endpoint test</h3></div><small>Every gate blocks candidate intake and release</small></div>
        <ol>{fabric.gates.map((gate) => <li key={gate.gateKey}><span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><em>{readable(gate.evidenceClass)}</em><small>{gate.certificationRequirement}</small></div></li>)}</ol>
      </section>

      <section className="certification-drill-board" aria-labelledby="certification-drill-title">
        <div className="certification-heading"><div><Siren size={18} /><h3 id="certification-drill-title">Six evidence-required failure drills</h3></div><small>No drill is represented as observed</small></div>
        <div>{fabric.drills.map((drill) => <article key={drill.drillKey}><header><span>{drill.sequenceNumber}</span><strong>{drill.displayName}</strong></header><p>{drill.drillRequirement}</p><small>Safe state: {drill.expectedSafeState}</small></article>)}</div>
      </section>

      <p className="certification-footnote"><ShieldCheck size={15} /> Phase 8L defines certification and isolation evidence only. A later provider-specific change still requires signed rights, approved secrets, deterministic test fixtures, observed drills and accountable human authorization.</p>
    </section>
  )
}
