import { useMemo, useState } from 'react'
import { Globe2, LockKeyhole, ShieldCheck } from 'lucide-react'

import type { GlobalMarketAccessRecord } from '../types/domain'

type Props = {
  records: GlobalMarketAccessRecord[]
  loading: boolean
  error: string | null
}

const residencyLabels: Record<GlobalMarketAccessRecord['residencyCountry'], string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  CA: 'Canada',
}

function readable(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/^./, (character: string) => character.toUpperCase())
}

export function GlobalMarketAccessPanel({ records, loading, error }: Props) {
  const [residency, setResidency] = useState<GlobalMarketAccessRecord['residencyCountry']>('IN')
  const [instrumentType, setInstrumentType] = useState('all')
  const scoped = useMemo(() => records.filter((item) =>
    item.residencyCountry === residency &&
    (instrumentType === 'all' || item.instrumentType === instrumentType),
  ), [instrumentType, records, residency])
  const venues = useMemo(() => Array.from(new Map(scoped.map((item) => [item.micCode, item])).values()), [scoped])
  const venueCountries = new Set(records.map((item) => item.venueCountryCode)).size
  const listingCount = new Set(records.map((item) => item.listingKey)).size

  return (
    <section className="panel global-market-access-panel">
      <div className="panel-header global-market-access-header">
        <div>
          <p className="eyebrow">Global markets · Phase 8A</p>
          <h2>Venue and instrument intelligence</h2>
        </div>
        <span className="status-badge"><LockKeyhole size={14} /> Research reference only</span>
      </div>

      <p className="panel-description">
        Inspect venue-qualified listing identities, calendar evidence, display rights and
        hypothetical residency outcomes before relying on a global market. Missing legal,
        licensing or calendar evidence remains visibly unresolved.
      </p>

      <div className="global-market-lock" role="note">
        <ShieldCheck size={18} />
        <div><strong>Global execution remains unavailable</strong><span>No order routing, broker connection, funding, custody or settlement.</span></div>
      </div>

      <div className="global-market-summary" aria-label="Global market intelligence summary">
        <div><span>Reference venues</span><strong>{new Set(records.map((item) => item.micCode)).size}</strong></div>
        <div><span>Venue countries</span><strong>{venueCountries}</strong></div>
        <div><span>Reference listings</span><strong>{listingCount}</strong></div>
        <div><span>Executable markets</span><strong>0</strong></div>
      </div>

      <div className="global-market-controls" aria-label="Global market reference filters">
        <label><span>Hypothetical residency</span><select value={residency} onChange={(event) => setResidency(event.target.value as GlobalMarketAccessRecord['residencyCountry'])}>
          {Object.entries(residencyLabels).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
        </select></label>
        <label><span>Instrument class</span><select value={instrumentType} onChange={(event) => setInstrumentType(event.target.value)}>
          <option value="all">All initial classes</option><option value="equity">Equities</option><option value="etf">ETFs</option><option value="depositary_receipt">Depositary receipts</option>
        </select></label>
      </div>

      {loading ? <div className="market-state" role="status">Loading global venue references…</div>
        : error ? <div className="market-state" role="alert">{error}</div>
          : records.length === 0 ? <div className="market-state" role="status">Global venue reference data is unavailable.</div>
            : scoped.length === 0 ? <div className="market-state" role="status">No reference listing matches this scenario.</div>
              : <div className="global-venue-grid" aria-label={`Venue references for ${residencyLabels[residency]}`}>
                {venues.map((venue) => {
                  const listings = scoped.filter((item) => item.micCode === venue.micCode)
                  return <article className="global-venue-card" key={venue.micCode}>
                    <header><div><span>{venue.micCode} · {venue.venueCountryCode}</span><h3>{venue.venueName}</h3></div><Globe2 size={19} /></header>
                    <dl className="global-venue-facts">
                      <div><dt>Reference currency</dt><dd>{venue.primaryCurrency}</dd></div>
                      <div><dt>Time zone</dt><dd>{venue.timezone}</dd></div>
                      <div><dt>Calendar</dt><dd>{readable(venue.calendarStatus)}</dd></div>
                      <div><dt>Settlement</dt><dd>{readable(venue.settlementConvention)}</dd></div>
                    </dl>
                    <div className="global-listing-stack">
                      {listings.map((listing) => <div className="global-listing-row" key={listing.listingKey}>
                        <div><strong>{listing.displaySymbol}</strong><span>{listing.instrumentName}</span><small>{listing.listingKey} · {readable(listing.instrumentType)}</small></div>
                        <div><span className={`global-access-pill ${listing.accessStatus}`}>{readable(listing.accessStatus)}</span><small>Prices: {readable(listing.priceDisplayStatus)}</small><small>Actions: {readable(listing.corporateActionStatus)}</small></div>
                      </div>)}
                    </div>
                    <footer><span>Reviewed {venue.referenceAsOf} · rights {readable(venue.referenceLicenseStatus)}</span><span>Reason: {readable(venue.reasonCode)}</span></footer>
                  </article>
                })}
              </div>}

      <p className="global-market-method-note">
        This selector is an educational scenario, not a customer eligibility result. A real
        decision would require verified residency, citizenship, entity type, disclosures,
        instrument identity, market-data rights and jurisdiction-specific legal approval.
      </p>
    </section>
  )
}
