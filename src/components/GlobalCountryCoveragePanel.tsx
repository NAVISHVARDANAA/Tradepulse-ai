import {
  BookOpenCheck,
  CircleAlert,
  DatabaseZap,
  Globe2,
  Link2Off,
  ListFilter,
  LoaderCircle,
  MapPinned,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalCountryCoverage,
  type GlobalCountryCoverage,
} from '../lib/queries/globalCountryCoverage'

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
    : 'Global country coverage is temporarily unavailable.'
}

export function GlobalCountryCoveragePanel() {
  const [coverage, setCoverage] = useState<GlobalCountryCoverage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('ALL')
  const [selectedCode, setSelectedCode] = useState('IN')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let active = true
    void getGlobalCountryCoverage().then((next) => {
      if (!active) return
      setCoverage(next)
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
    coverage?.countries.map((country) => country.regionGroup) ?? [],
  )), [coverage])
  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return coverage?.countries.filter((country) =>
      (region === 'ALL' || country.regionGroup === region) &&
      (!normalizedQuery || country.countryName.toLocaleLowerCase().includes(normalizedQuery) ||
        country.countryCode.toLocaleLowerCase().includes(normalizedQuery)),
    ) ?? []
  }, [coverage, query, region])
  const displayedCountries = showAll ? visibleCountries : visibleCountries.slice(0, 30)
  const selectedCountry = coverage?.countries.find((country) => country.countryCode === selectedCode)
    ?? visibleCountries[0]

  if (!coverage) {
    return error
      ? <section className="panel country-coverage-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel country-coverage-panel" role="status"><LoaderCircle className="spinning" /> Loading the global country ledger…</section>
  }

  return (
    <section className="panel country-coverage-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8I</p><h2>Global country coverage fabric</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Explicit gaps</span>
      </div>
      <p className="panel-description">
        Establish one governed intelligence checklist for 193 UN members plus the Holy See and State of Palestine. Country identity is reference metadata; economic, resource, trade, logistics, market, climate and policy facts remain missing until approved evidence arrives.
      </p>

      <div className="country-coverage-boundary" role="note">
        <Link2Off size={22} />
        <div>
          <strong>No country fact is generated or inferred in Phase 8I</strong>
          <span>Live providers, automatic gap filling, country scoring, publication, model training and trade execution remain database-locked off.</span>
        </div>
        <small>{coverage.status.evidencedCountryCount} evidenced countries</small>
      </div>

      <div className="country-coverage-summary" aria-label="Global country coverage summary">
        <article><Globe2 /><strong>{coverage.status.referenceCountryCount}</strong><span>sovereign references</span><small>Coverage target complete</small></article>
        <article><DatabaseZap /><strong>{coverage.status.intelligenceDomainCount}</strong><span>intelligence domains</span><small>Same standard per country</small></article>
        <article><CircleAlert /><strong>{coverage.status.evidenceGapCount.toLocaleString()}</strong><span>visible evidence gaps</span><small>{coverage.status.coverageCellCount.toLocaleString()} total cells</small></article>
        <article><BookOpenCheck /><strong>{coverage.status.reviewGateCount}</strong><span>release gates</span><small>Human decision required</small></article>
      </div>

      <section className="country-domain-board" aria-labelledby="country-domain-title">
        <div className="country-coverage-heading">
          <div><ListFilter size={18} /><h3 id="country-domain-title">Country intelligence standard</h3></div>
          <small>Missing evidence is never replaced with a model guess</small>
        </div>
        <div className="country-domain-grid">
          {coverage.domains.map((domain) => (
            <article key={domain.domainKey}>
              <header><strong>{domain.displayName}</strong><span>{domain.missingCountryCount}/{domain.countryCount} gaps</span></header>
              <p>{domain.coverageQuestion}</p>
              <small>{domain.minimumIndependentSources}+ independent sources · primary required · max age {freshness(domain.maximumSourceAgeHours)}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="country-coverage-workspace">
        <section className="country-ledger-board" aria-labelledby="country-ledger-title">
          <div className="country-coverage-heading">
            <div><MapPinned size={18} /><h3 id="country-ledger-title">195-country reference ledger</h3></div>
            <small>{visibleCountries.length} matches</small>
          </div>
          <div className="country-ledger-filters">
            <label><Search size={15} /><span className="sr-only">Search countries</span><input value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false) }} placeholder="Search country or code" /></label>
            <label><span className="sr-only">Filter by region</span><select value={region} onChange={(event) => { setRegion(event.target.value); setShowAll(false) }}><option value="ALL">All regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="country-ledger-grid">
            {displayedCountries.map((country) => (
              <button className={country.countryCode === selectedCountry?.countryCode ? 'selected' : ''} key={country.countryCode} type="button" onClick={() => setSelectedCode(country.countryCode)}>
                <strong>{country.countryCode}</strong><span>{country.countryName}</span><small>{country.regionGroup} · {country.missingDomainCount}/{country.intelligenceDomainCount} gaps</small>
              </button>
            ))}
          </div>
          {!showAll && visibleCountries.length > displayedCountries.length ? <button className="secondary-button" type="button" onClick={() => setShowAll(true)}>Show all {visibleCountries.length} countries</button> : null}
        </section>

        <aside className="country-gap-detail" aria-labelledby="country-gap-title">
          <div className="country-coverage-heading"><div><CircleAlert size={18} /><h3 id="country-gap-title">Selected-country gaps</h3></div><small>Reference only</small></div>
          {selectedCountry ? <>
            <header><span>{selectedCountry.countryCode}</span><div><strong>{selectedCountry.countryName}</strong><small>{selectedCountry.regionGroup} · {readable(selectedCountry.completenessStatus)}</small></div></header>
            <p>No approved observation has completed the evidence workflow for this reference entry.</p>
            <div className="country-gap-list">{selectedCountry.missingDomainKeys.map((domain) => <span key={domain}><CircleAlert size={13} /> {readable(domain)}</span>)}</div>
            <small>{selectedCountry.mappedToProduct ? 'Linked to the existing product country catalogue.' : 'Awaiting a reviewed product-catalogue mapping.'}</small>
          </> : <p>No country matches the current filter.</p>}
        </aside>
      </div>

      <section className="country-gate-board" aria-labelledby="country-gate-title">
        <div className="country-coverage-heading"><div><ShieldCheck size={18} /><h3 id="country-gate-title">Seven gates before country intelligence</h3></div><small>No automatic approval</small></div>
        <ol>{coverage.gates.map((gate) => <li key={gate.gateKey}><span>{gate.sequenceNumber}</span><div><strong>{gate.displayName}</strong><small>{gate.requirementNote}</small></div></li>)}</ol>
      </section>

      <p className="country-coverage-footnote"><ShieldCheck size={15} /> Phase 8I completes the reference checklist, not real-world coverage. A later source-specific release must attach licensed, corroborated and fresh observations country by country.</p>
    </section>
  )
}
