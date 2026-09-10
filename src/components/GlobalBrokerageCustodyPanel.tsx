import {
  AlertTriangle,
  Ban,
  Building2,
  ClipboardCheck,
  FileClock,
  Globe2,
  Landmark,
  Link2Off,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import {
  createGlobalBrokeragePreview,
  getGlobalBrokerageCustodyPrivate,
  getGlobalBrokerageCustodyReference,
  initializeGlobalBrokerageCase,
  reconcileGlobalBrokerageCase,
  rehearseGlobalBrokerageEvidence,
  type GlobalBrokerageCase,
  type GlobalBrokeragePrivateWorkspace,
  type GlobalBrokerageReference,
} from '../lib/queries/globalBrokerageCustody'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

function money(value: number | null, currency: string) {
  if (value === null) return 'Unavailable'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(value)
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The brokerage and custody rehearsal could not be completed.'
}

function CaseProgress({ caseRecord }: { caseRecord: GlobalBrokerageCase }) {
  const percent = caseRecord.requirementCount
    ? Math.round((caseRecord.rehearsedRequirementCount / caseRecord.requirementCount) * 100)
    : 0
  return <div className="custody-case-progress">
    <div><span>Evidence rehearsed</span><strong>{caseRecord.rehearsedRequirementCount}/{caseRecord.requirementCount}</strong></div>
    <div className="custody-progress-track" aria-label={`${percent}% of onboarding evidence rehearsed`}>
      <span style={{ width: `${percent}%` }} />
    </div>
    <small>{caseRecord.blockingRequirementCount} requirements still block activation—even after rehearsal.</small>
  </div>
}

export function GlobalBrokerageCustodyPanel() {
  const { session, loading: authLoading } = useAuth()
  const [reference, setReference] = useState<GlobalBrokerageReference | null>(null)
  const [privateWorkspace, setPrivateWorkspace] = useState<GlobalBrokeragePrivateWorkspace | null>(null)
  const [matrixId, setMatrixId] = useState('')
  const [caseId, setCaseId] = useState('')
  const [requirementKey, setRequirementKey] = useState('identity_kyc_kyb')
  const [listingId, setListingId] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [quantity, setQuantity] = useState('1')
  const [limitPrice, setLimitPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refreshPrivate = async () => {
    if (!session) {
      setPrivateWorkspace(null)
      return
    }
    const next = await getGlobalBrokerageCustodyPrivate()
    setPrivateWorkspace(next)
    setCaseId((current) => next.cases.some((item) => item.id === current)
      ? current : next.cases[0]?.id ?? '')
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      getGlobalBrokerageCustodyReference(),
      session ? getGlobalBrokerageCustodyPrivate() : Promise.resolve(null),
    ]).then(([nextReference, nextPrivate]) => {
      if (!active) return
      setReference(nextReference)
      setPrivateWorkspace(nextPrivate)
      setMatrixId((current) => current || String(nextReference.matrices[0]?.launchMatrixId ?? ''))
      setCaseId((current) => current || nextPrivate?.cases[0]?.id || '')
      setError(null)
    }).catch((nextError) => {
      if (active) setError(errorMessage(nextError))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [session])

  const selectedMatrix = reference?.matrices.find((matrix) => matrix.launchMatrixId === Number(matrixId)) ?? null
  const selectedCase = privateWorkspace?.cases.find((caseRecord) => caseRecord.id === caseId) ?? null
  const selectedCaseMatrix = reference?.matrices.find((matrix) => matrix.launchMatrixId === selectedCase?.launchMatrixId) ?? null
  const eligibleListings = useMemo(() => reference?.listings.filter((listing) => (
    listing.micCode === selectedCaseMatrix?.micCode && listing.assetClass === selectedCaseMatrix.assetClass
  )) ?? [], [reference?.listings, selectedCaseMatrix])
  const selectedListing = eligibleListings.find((listing) => listing.listingId === Number(listingId)) ?? eligibleListings[0] ?? null
  const latestPreview = privateWorkspace?.previews.find((preview) => preview.onboardingCaseId === caseId) ?? null
  const latestReconciliation = privateWorkspace?.reconciliations.find((run) => run.onboardingCaseId === caseId) ?? null
  const rehearsedKeys = new Set((privateWorkspace?.evidence ?? [])
    .filter((item) => item.onboardingCaseId === caseId && new Date(item.expiresAt) > new Date())
    .map((item) => item.requirementKey))

  useEffect(() => {
    if (!eligibleListings.length) {
      setListingId('')
      return
    }
    setListingId((current) => eligibleListings.some((item) => item.listingId === Number(current))
      ? current : String(eligibleListings[0].listingId))
    setLimitPrice((current) => current || String(eligibleListings[0].scenarioPrice))
  }, [caseId, eligibleListings])

  const run = async (action: () => Promise<unknown>, confirmation: string) => {
    setWorking(true)
    setError(null)
    setSuccess(null)
    try {
      await action()
      await refreshPrivate()
      setSuccess(confirmation)
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setWorking(false)
    }
  }

  const createCase = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedMatrix) return
    void run(() => initializeGlobalBrokerageCase({
      clientCaseId: `global-case-${crypto.randomUUID()}`,
      launchMatrixId: selectedMatrix.launchMatrixId,
      baseCurrency: selectedMatrix.settlementCurrency,
    }), 'A private review-only case was created. No account or permission was created.')
  }

  const recordEvidence = () => {
    if (!selectedCase) return
    void run(() => rehearseGlobalBrokerageEvidence({
      onboardingCaseId: selectedCase.id,
      clientEvidenceId: `evidence-${crypto.randomUUID()}`,
      requirementKey,
    }), 'Identity-bound expiring evidence was rehearsed with no approval effect.')
  }

  const createPreview = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedCase || !selectedListing) return
    void run(() => createGlobalBrokeragePreview({
      onboardingCaseId: selectedCase.id,
      clientPreviewId: `global-preview-${crypto.randomUUID()}`,
      listingId: selectedListing.listingId,
      side,
      orderType,
      quantity: Number(quantity),
      limitPrice: orderType === 'limit' ? Number(limitPrice) : null,
    }), 'A blocked cost preview was saved. No order or partner instruction was created.')
  }

  return <section className="global-custody-panel" aria-labelledby="global-custody-title">
    <div className="section-header global-custody-header">
      <div><p className="eyebrow">Global orchestration · Phase 8D</p><h2 id="global-custody-title">Brokerage and custody control plane</h2><p>Review exact launch matrices, coordinate expiring evidence, inspect complete deterministic costs and rehearse reconciliation without connecting a regulated partner.</p></div>
      <span className="status-badge global-custody-lock"><LockKeyhole size={15} /> Activation blocked</span>
    </div>

    <div className="global-custody-boundary" role="status">
      <Ban size={22} />
      <div><strong>Production credentials cannot activate a market</strong><span>Every country, residency, account, asset class and venue requires a separate written decision. A payment quote cannot become brokerage cash.</span></div>
      <small>{reference?.summary.policyVersion ?? 'global-brokerage-custody-v1'}</small>
    </div>

    <div className="global-custody-summary" aria-label="Global brokerage orchestration boundaries">
      <article><Globe2 size={18} /><span>Launch matrices</span><strong>{reference?.summary.launchMatrixCount ?? 4}</strong><small>All separately blocked</small></article>
      <article><Building2 size={18} /><span>Partner roles</span><strong>{reference?.summary.unassignedPartnerRoleCount ?? 5}</strong><small>All unassigned</small></article>
      <article><ClipboardCheck size={18} /><span>Onboarding gates</span><strong>{reference?.summary.onboardingRequirementCount ?? 10}</strong><small>Identity-bound and expiring</small></article>
      <article><WalletCards size={18} /><span>Live accounts</span><strong>0</strong><small>No custody or real cash</small></article>
    </div>

    {loading || authLoading ? <div className="global-custody-empty" role="status"><RefreshCw size={18} /> Loading the fail-closed orchestration map…</div> : null}
    {error ? <div className="inline-message error" role="alert"><AlertTriangle size={16} /> {error}</div> : null}

    <section className="global-custody-matrix" aria-labelledby="launch-matrix-title">
      <div className="paper-subheader"><strong id="launch-matrix-title">Exact launch matrix</strong><span>Approval for one row never activates another</span></div>
      <div className="global-custody-matrix-grid">{reference?.matrices.map((matrix) => <article key={matrix.launchMatrixId}>
        <header><div><span>{matrix.residencyCountry} resident · {matrix.accountType} account</span><strong>{matrix.micCode} · {matrix.assetClass.replace('_', ' ')}</strong></div><small>{matrix.matrixStatus}</small></header>
        <dl><div><dt>Approval gaps</dt><dd>{matrix.approvalGapCount}</dd></div><div><dt>Partner gaps</dt><dd>{matrix.partnerGapCount}</dd></div><div><dt>Settlement</dt><dd>{matrix.settlementCurrency}</dd></div></dl>
        <p>{matrix.venueName}</p>
      </article>)}</div>
    </section>

    <section className="global-custody-partners" aria-labelledby="partner-map-title">
      <div className="paper-subheader"><strong id="partner-map-title">Independent partner responsibilities</strong><span>No provider identifier or credential exists</span></div>
      <div className="global-custody-partner-grid">{reference?.partnerRoles.map((role) => <article key={role.roleKey}><Link2Off size={17} /><div><strong>{role.displayName}</strong><span>{role.responsibilitySummary}</span></div><small>{role.credentialStatus}</small></article>)}</div>
    </section>

    {!session ? <div className="global-custody-signin">
      <ShieldCheck size={22} /><div><strong>Your onboarding and preview rehearsals are private</strong><span>Sign in to create a review-only case. Guests can inspect the blocked launch matrix but cannot record evidence or previews.</span></div><a className="secondary-button" href="#paper-investing">Open secure sign-in</a>
    </div> : <div className="global-custody-private">
      <form className="global-custody-case-form" onSubmit={createCase}>
        <div className="global-custody-card-title"><Landmark size={19} /><div><strong>Create a scoped review case</strong><span>This coordinates a matrix rehearsal; it cannot create a brokerage or custody account.</span></div></div>
        <label>Blocked matrix<select value={matrixId} onChange={(event) => setMatrixId(event.target.value)}>{reference?.matrices.map((matrix) => <option value={matrix.launchMatrixId} key={matrix.launchMatrixId}>{matrix.matrixCode}</option>)}</select></label>
        <button className="primary-button" type="submit" disabled={working || !selectedMatrix}>Create review-only case</button>
      </form>

      {privateWorkspace?.cases.length ? <div className="global-custody-workspace">
        <div className="global-custody-toolbar"><label>Private case<select value={caseId} onChange={(event) => setCaseId(event.target.value)}>{privateWorkspace.cases.map((caseRecord) => <option value={caseRecord.id} key={caseRecord.id}>{caseRecord.matrixCode} · {caseRecord.createdAt.slice(0, 10)}</option>)}</select></label><span>{selectedCase?.activationStatus ?? 'blocked'} · review only</span></div>
        {selectedCase ? <CaseProgress caseRecord={selectedCase} /> : null}

        <div className="global-custody-action-grid">
          <section><div className="global-custody-card-title"><FileClock size={19} /><div><strong>Expiring evidence rehearsal</strong><span>A one-way digest is identity-bound for seven days; no raw document or approval is stored.</span></div></div><label>Requirement<select value={requirementKey} onChange={(event) => setRequirementKey(event.target.value)}>{reference?.requirements.map((requirement) => <option value={requirement.requirementKey} key={requirement.requirementKey}>{requirement.title}{rehearsedKeys.has(requirement.requirementKey) ? ' · rehearsed' : ''}</option>)}</select></label><button className="secondary-button" type="button" disabled={working || !selectedCase} onClick={recordEvidence}>Record evidence rehearsal</button></section>

          <form onSubmit={createPreview}><div className="global-custody-card-title"><ReceiptText size={19} /><div><strong>Complete cost preview</strong><span>Shows deterministic price, FX, commission, venue fee, tax and settlement currency while route and buying power stay unavailable.</span></div></div><label>Eligible scenario listing<select value={listingId} onChange={(event) => setListingId(event.target.value)}>{eligibleListings.map((listing) => <option value={listing.listingId} key={listing.listingId}>{listing.symbol} · {listing.quoteCurrency} {number.format(listing.scenarioPrice)}</option>)}</select></label><div className="global-custody-order-row"><label>Side<select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')}><option value="buy">Buy rehearsal</option><option value="sell">Sell rehearsal</option></select></label><label>Order type<select value={orderType} onChange={(event) => setOrderType(event.target.value as 'market' | 'limit')}><option value="market">Market scenario</option><option value="limit">Limit scenario</option></select></label><label>Quantity<input type="number" min="0.0001" max="1000000" step="0.0001" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label></div>{orderType === 'limit' ? <label>Scenario limit price<input type="number" min="0.0001" step="0.0001" value={limitPrice} onChange={(event) => setLimitPrice(event.target.value)} /></label> : null}<button className="primary-button" type="submit" disabled={working || !selectedCase || !selectedListing}>Generate blocked cost view</button></form>
        </div>

        {latestPreview ? <section className="global-custody-preview" aria-labelledby="cost-preview-title"><div className="paper-subheader"><strong id="cost-preview-title">Latest non-executable cost view</strong><span>{latestPreview.previewStatus} · route {latestPreview.routeStatus}</span></div><div className="global-custody-cost-grid"><article><span>Scenario notional</span><strong>{money(latestPreview.grossNotional, latestPreview.quoteCurrency)}</strong></article><article><span>Commission</span><strong>{money(latestPreview.commissionAmount, latestPreview.quoteCurrency)}</strong></article><article><span>Venue fee</span><strong>{money(latestPreview.venueFeeAmount, latestPreview.quoteCurrency)}</strong></article><article><span>Estimated tax</span><strong>{money(latestPreview.estimatedTaxAmount, latestPreview.quoteCurrency)}</strong></article><article><span>FX to base</span><strong>{number.format(latestPreview.fxRateToBase)}</strong></article><article><span>{latestPreview.side === 'buy' ? 'Estimated debit' : 'Estimated proceeds'} in {latestPreview.baseCurrency}</span><strong>{money(latestPreview.estimatedTotalBase, latestPreview.baseCurrency)}</strong></article></div><div className="global-custody-preview-lock"><LockKeyhole size={17} /><span>Buying power unavailable · 0 routes · {latestPreview.settlementCurrency} settlement reference · payment funding separate</span></div></section> : null}

        <section className="global-custody-reconciliation"><div className="global-custody-card-title"><ClipboardCheck size={19} /><div><strong>Independent ledger reconciliation</strong><span>Order, allocation, cash, custody and settlement domains remain independently unavailable.</span></div></div><div><strong>{latestReconciliation?.reconciliationStatus.replace('_', ' ') ?? 'Not rehearsed'}</strong><span>{latestReconciliation ? `${latestReconciliation.blockingDomainCount}/${latestReconciliation.domainCount} blocking domains` : 'No production evidence connected'}</span></div><button className="secondary-button" type="button" disabled={working || !selectedCase} onClick={() => selectedCase && void run(() => reconcileGlobalBrokerageCase({ onboardingCaseId: selectedCase.id, clientReconciliationId: `global-recon-${crypto.randomUUID()}` }), 'All five reconciliation domains remained safely blocked with no production effect.')}>Rehearse reconciliation</button></section>
      </div> : <div className="global-custody-empty"><WalletCards size={19} /> Create a review-only case to rehearse onboarding, costs and reconciliation.</div>}
    </div>}

    {success ? <div className="inline-message success" role="status">{success}</div> : null}
    <p className="global-market-method-note">Every price, FX rate, fee, tax and route is a deterministic policy scenario. This workspace stores no identity document, partner credential, real cash, position, order, allocation, custody account or settlement instruction.</p>
  </section>
}
