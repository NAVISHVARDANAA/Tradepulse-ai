import {
  ArrowRight,
  Boxes,
  CircleAlert,
  DatabaseZap,
  GitBranch,
  Globe2,
  Link2Off,
  LoaderCircle,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalDependencyTransmission,
  type GlobalDependencyTransmission,
} from '../lib/queries/globalDependencyTransmission'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function freshness(hours: number) {
  if (hours < 24) return `${hours}h`
  if (hours % 168 === 0) return `${hours / 168}w`
  return `${Math.round(hours / 24)}d`
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Global dependency readiness is temporarily unavailable.'
}

export function GlobalDependencyTransmissionPanel() {
  const [fabric, setFabric] = useState<GlobalDependencyTransmission | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('ALL')
  const [selectedCode, setSelectedCode] = useState('IN')

  useEffect(() => {
    let active = true
    void getGlobalDependencyTransmission().then((next) => {
      if (!active) return
      setFabric(next)
      if (!next.countries.some((country) => country.countryCode === selectedCode)) {
        setSelectedCode(next.countries[0]?.countryCode ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const regions = useMemo(() => Array.from(new Set(
    fabric?.countries.map((country) => country.regionGroup) ?? [],
  )), [fabric])
  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return fabric?.countries.filter((country) =>
      (region === 'ALL' || country.regionGroup === region) &&
      (!normalizedQuery || country.countryName.toLocaleLowerCase().includes(normalizedQuery) ||
        country.countryCode.toLocaleLowerCase().includes(normalizedQuery)),
    ) ?? []
  }, [fabric, query, region])
  const selectedCountry = fabric?.countries.find((country) => country.countryCode === selectedCode)
    ?? visibleCountries[0]

  if (!fabric) {
    return error
      ? <section className="panel dependency-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel dependency-panel" role="status"><LoaderCircle className="spinning" /> Loading the global dependency fabric…</section>
  }

  return (
    <section className="panel dependency-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8J</p><h2>Global dependency and transmission fabric</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Evidence gated</span>
      </div>
      <p className="panel-description">
        Define how verified trade, commodity, energy, logistics, currency, policy, corporate and climate relationships must be represented before a country shock can enter an impact scenario.
      </p>

      <div className="dependency-boundary" role="note">
        <Link2Off size={22} />
        <div>
          <strong>No dependency relationship is inferred in Phase 8J</strong>
          <span>Live providers, generated links, impact scoring, scenario promotion, model training, publication and trade execution remain database-locked off.</span>
        </div>
        <small>{fabric.status.verifiedRelationshipCount} verified relationships</small>
      </div>

      <div className="dependency-summary" aria-label="Global dependency readiness summary">
        <article><Globe2 /><strong>{fabric.status.referenceCountryCount}</strong><span>country references</span><small>Same dependency standard</small></article>
        <article><DatabaseZap /><strong>{fabric.status.dependencyDomainCount}</strong><span>dependency domains</span><small>Direction and magnitude required</small></article>
        <article><CircleAlert /><strong>{fabric.status.relationshipGapCount.toLocaleString()}</strong><span>relationship gaps</span><small>{fabric.status.readinessCellCount.toLocaleString()} readiness cells</small></article>
        <article><GitBranch /><strong>{fabric.status.mechanismTemplateCount}</strong><span>mechanism templates</span><small>No probability or price effect</small></article>
      </div>

      <section className="dependency-domain-board" aria-labelledby="dependency-domain-title">
        <div className="dependency-heading">
          <div><Boxes size={18} /><h3 id="dependency-domain-title">Eight dependency evidence contracts</h3></div>
          <small>Missing relationships stay missing</small>
        </div>
        <div className="dependency-domain-grid">
          {fabric.domains.map((domain) => (
            <article key={domain.domainKey}>
              <header><span>{domain.sequenceNumber}</span><div><strong>{domain.displayName}</strong><small>{domain.missingCountryCount}/{domain.countryCount} gaps</small></div></header>
              <p>{domain.relationshipQuestion}</p>
              <div>{domain.requiredEvidenceClasses.map((item) => <small key={item}>{readable(item)}</small>)}</div>
              <footer>{domain.minimumIndependentSources}+ sources · max age {freshness(domain.maximumSourceAgeHours)} · substitutes reviewed</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="transmission-template-board" aria-labelledby="transmission-template-title">
        <div className="dependency-heading">
          <div><GitBranch size={18} /><h3 id="transmission-template-title">Six transmission templates</h3></div>
          <small>Evidence-empty templates, not market predictions</small>
        </div>
        <div className="transmission-template-grid">
          {fabric.mechanisms.map((mechanism) => (
            <article key={mechanism.templateKey}>
              <header><span>{mechanism.sequenceNumber}</span><strong>{mechanism.displayName}</strong><small>{readable(mechanism.templateStatus)}</small></header>
              <div className="transmission-path">
                <span>{mechanism.originState}</span><ArrowRight /><span>{mechanism.intermediaryState}</span><ArrowRight /><span>{mechanism.downstreamState}</span>
              </div>
              <p>{mechanism.explanation}</p>
              <footer>Probability — · confidence — · price effect —</footer>
            </article>
          ))}
        </div>
      </section>

      <div className="dependency-workspace">
        <section className="dependency-country-board" aria-labelledby="dependency-country-title">
          <div className="dependency-heading">
            <div><Globe2 size={18} /><h3 id="dependency-country-title">Country dependency readiness</h3></div>
            <small>{visibleCountries.length} matches</small>
          </div>
          <div className="dependency-filters">
            <label><Search size={15} /><span className="sr-only">Search dependency countries</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or code" /></label>
            <label><span className="sr-only">Filter dependency countries by region</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="ALL">All regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="dependency-country-grid">
            {visibleCountries.slice(0, 36).map((country) => (
              <button className={country.countryCode === selectedCountry?.countryCode ? 'selected' : ''} key={country.countryCode} type="button" onClick={() => setSelectedCode(country.countryCode)}>
                <strong>{country.countryCode}</strong><span>{country.countryName}</span><small>{country.missingDomainCount}/{country.dependencyDomainCount} relationship gaps</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="dependency-country-detail" aria-labelledby="dependency-country-detail-title">
          <div className="dependency-heading"><div><CircleAlert size={18} /><h3 id="dependency-country-detail-title">Selected-country dependency gaps</h3></div><small>Evidence required</small></div>
          {selectedCountry ? <>
            <header><span>{selectedCountry.countryCode}</span><div><strong>{selectedCountry.countryName}</strong><small>{selectedCountry.regionGroup}</small></div></header>
            <p>No directed upstream or downstream relationship has passed the Phase 8J evidence gates for this country.</p>
            <dl><div><dt>Verified links</dt><dd>{selectedCountry.verifiedRelationshipCount}</dd></div><div><dt>Upstream links</dt><dd>{selectedCountry.upstreamLinkCount}</dd></div><div><dt>Downstream links</dt><dd>{selectedCountry.downstreamLinkCount}</dd></div></dl>
            <div className="dependency-gap-list">{selectedCountry.missingDomainKeys.map((domain) => <span key={domain}><CircleAlert size={13} /> {readable(domain)}</span>)}</div>
          </> : <p>No country matches the current filter.</p>}
        </aside>
      </div>

      <section className="dependency-gate-board" aria-labelledby="dependency-gate-title">
        <div className="dependency-heading"><div><ShieldCheck size={18} /><h3 id="dependency-gate-title">Eight gates before scenario use</h3></div><small>No automatic approval</small></div>
        <ol>{fabric.gates.map((gate) => <li key={gate.gateKey}><span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.requirementNote}</small></div></li>)}</ol>
      </section>

      <p className="dependency-footnote"><ShieldCheck size={15} /> Phase 8J defines how evidence could support a transmission path. It does not assert that any country, company, commodity, route, currency or market is currently connected.</p>
    </section>
  )
}
