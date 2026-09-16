import {
  Ban,
  CircleAlert,
  Database,
  FileKey2,
  Filter,
  GitCompareArrows,
  LoaderCircle,
  LockKeyhole,
  Network,
  PackageSearch,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalObservationProvenance,
  type GlobalObservationProvenance,
} from '../lib/queries/globalObservationProvenance'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Global observation provenance is temporarily unavailable.'
}

export function GlobalObservationProvenancePanel() {
  const [fabric, setFabric] = useState<GlobalObservationProvenance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sourceClass, setSourceClass] = useState('ALL')
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalObservationProvenance().then((next) => {
      if (!active) return
      setFabric(next)
      if (!next.sources.some((source) => source.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.sources[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const sourceClasses = useMemo(() => Array.from(new Set(
    fabric?.sources.map((source) => source.sourceClass) ?? [],
  )), [fabric])
  const visibleSources = useMemo(() => fabric?.sources.filter((source) =>
    sourceClass === 'ALL' || source.sourceClass === sourceClass) ?? [], [fabric, sourceClass])
  const selectedSource = fabric?.sources.find((source) => source.sourceFamilyKey === selectedKey)
    ?? visibleSources[0]

  if (!fabric) {
    return error
      ? <section className="panel observation-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel observation-panel" role="status"><LoaderCircle className="spinning" /> Loading the observation quarantine fabric…</section>
  }

  return (
    <section className="panel observation-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8K</p><h2>Global observation provenance and quarantine fabric</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Fail closed</span>
      </div>
      <p className="panel-description">
        Define how a future source observation must preserve identity, meaning, unit, scope, time, revision and rights before it can leave quarantine.
      </p>

      <div className="observation-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider or observation is connected in Phase 8K</strong>
          <span>Production ingestion, automatic normalization, conflict resolution, release, model training, publication and trade execution remain database-locked off.</span>
        </div>
        <small>{fabric.status.releasedObservationCount} released observations</small>
      </div>

      <div className="observation-summary" aria-label="Global observation intake summary">
        <article><Network /><strong>{fabric.status.sourceFamilyCount}</strong><span>source families</span><small>{fabric.status.disconnectedSourceCount} disconnected</small></article>
        <article><FileKey2 /><strong>{fabric.status.normalizationContractCount}</strong><span>normalization contracts</span><small>Null fabrication forbidden</small></article>
        <article><PackageSearch /><strong>{fabric.status.quarantineLaneCount}</strong><span>quarantine lanes</span><small>{fabric.status.candidateObservationCount} candidates</small></article>
        <article><LockKeyhole /><strong>{fabric.status.releaseGateCount}</strong><span>release gates</span><small>Human decision required</small></article>
      </div>

      <div className="observation-source-workspace">
        <section className="observation-source-board" aria-labelledby="observation-source-title">
          <div className="observation-heading">
            <div><Database size={18} /><h3 id="observation-source-title">Disconnected source contracts</h3></div>
            <label><Filter size={14} /><span className="sr-only">Filter source families by class</span><select value={sourceClass} onChange={(event) => setSourceClass(event.target.value)}><option value="ALL">All source classes</option>{sourceClasses.map((item) => <option value={item} key={item}>{readable(item)}</option>)}</select></label>
          </div>
          <div className="observation-source-grid">
            {visibleSources.map((source) => (
              <button type="button" className={source.sourceFamilyKey === selectedSource?.sourceFamilyKey ? 'selected' : ''} key={source.sourceFamilyKey} onClick={() => setSelectedKey(source.sourceFamilyKey)}>
                <span>{source.sequenceNumber}</span><div><strong>{source.displayName}</strong><small>{readable(source.sourceClass)}</small></div><em>{readable(source.connectorStatus)}</em>
              </button>
            ))}
          </div>
        </section>

        <aside className="observation-source-detail" aria-labelledby="observation-source-detail-title">
          <div className="observation-heading"><div><CircleAlert size={18} /><h3 id="observation-source-detail-title">Selected quarantine gap</h3></div><small>No data received</small></div>
          {selectedSource ? <>
            <header><span>{selectedSource.sequenceNumber}</span><div><strong>{selectedSource.displayName}</strong><small>{readable(selectedSource.laneStatus)}</small></div></header>
            <p>{selectedSource.intendedObservationScope}</p>
            <div className="observation-chip-list">{selectedSource.requiredRights.map((right) => <span key={right}>{readable(right)}</span>)}</div>
            <dl><div><dt>Candidates</dt><dd>{selectedSource.candidateObservationCount}</dd></div><div><dt>Corroborated</dt><dd>{selectedSource.corroboratedCount}</dd></div><div><dt>Released</dt><dd>{selectedSource.releasedObservationCount}</dd></div></dl>
            <small>{selectedSource.gapReason}</small>
          </> : <p>No source family matches the current filter.</p>}
        </aside>
      </div>

      <section className="normalization-board" aria-labelledby="normalization-title">
        <div className="observation-heading"><div><GitCompareArrows size={18} /><h3 id="normalization-title">Nine canonical normalization contracts</h3></div><small>Source value and missingness are preserved</small></div>
        <div className="normalization-grid">{fabric.contracts.map((contract) => (
          <article key={contract.contractKey}>
            <header><span>{contract.sequenceNumber}</span><strong>{contract.displayName}</strong></header>
            <p>{contract.canonicalRequirement}</p>
            <small><CircleAlert size={12} /> Invalid: {contract.invalidExample}</small>
          </article>
        ))}</div>
      </section>

      <section className="observation-gate-board" aria-labelledby="observation-gate-title">
        <div className="observation-heading"><div><ShieldCheck size={18} /><h3 id="observation-gate-title">Eight gates before any release</h3></div><small>No automatic approval</small></div>
        <ol>{fabric.gates.map((gate) => <li key={gate.gateKey}><span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.requirementNote}</small></div></li>)}</ol>
      </section>

      <p className="observation-footnote"><ShieldCheck size={15} /> Phase 8K defines a future intake boundary. It does not contain a provider payload, normalized fact, inferred relationship, model feature, market score, publication or production action.</p>
    </section>
  )
}
