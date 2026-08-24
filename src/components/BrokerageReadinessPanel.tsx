import type { Session } from '@supabase/supabase-js'
import {
  Ban,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  LockKeyhole,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { AcademyLink } from './AcademyLink'
import {
  acceptBrokerageDisclosure,
  createBrokeragePreview,
  getBrokerageWorkspace,
  type BrokeragePreview,
  type BrokerageWorkspace,
} from '../lib/queries/brokerageReadiness'
import { supabase } from '../lib/supabase/client'

function displayError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'The brokerage-readiness request could not be completed.'
}

function statusLabel(value: string | null) {
  if (!value) return 'Not available'
  return value.replace(/_/g, ' ')
}

function compactDate(value: string | null) {
  if (!value) return 'Not accepted'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function money(value: number | null, currency: string) {
  if (value === null) return 'Not available'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function BrokerageReadinessPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [workspace, setWorkspace] = useState<BrokerageWorkspace | null>(null)
  const [instrumentId, setInstrumentId] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [quantity, setQuantity] = useState('1')
  const [limitPrice, setLimitPrice] = useState('')
  const [latestPreview, setLatestPreview] = useState<BrokeragePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const clientRequestId = useRef(crypto.randomUUID())

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const refresh = async () => {
    const next = await getBrokerageWorkspace()
    setWorkspace(next)
    setInstrumentId((current) =>
      next.instruments.some((item) => item.id === Number(current))
        ? current
        : next.instruments[0]?.id.toString() ?? '',
    )
  }

  useEffect(() => {
    if (!session) {
      setWorkspace(null)
      return
    }
    void refresh()
      .then(() => setError(null))
      .catch((loadError) => setError(displayError(loadError)))
  }, [session])

  const readiness = workspace?.readiness
  const provider = workspace?.providers[0]
  const certification = workspace?.certifications.find((item) => item.providerId === provider?.id)
  const certificationTests = workspace?.certificationTests.filter((item) => item.providerId === provider?.id) ?? []
  const adapterHealth = workspace?.adapterHealth.find((item) => item.providerId === provider?.id)
  const accountInventory = workspace?.accountInventoryHealth.find((item) => item.providerId === provider?.id)
  const certificationCompleted = certification
    ? certification.passedTests + certification.failedTests
    : 0
  const checks = useMemo(() => [
    {
      label: 'Verified residency and eligible jurisdiction',
      detail: readiness?.verifiedResidencyCountry
        ? `${readiness.verifiedResidencyCountry} · ${statusLabel(readiness.jurisdictionStatus)}`
        : 'A compliance team must verify residency.',
      passed: Boolean(readiness?.verifiedResidencyCountry && readiness.retailInvestingEnabled),
      owner: 'Compliance',
    },
    {
      label: 'Identity verification',
      detail: statusLabel(readiness?.kycStatus ?? null),
      passed: readiness?.kycStatus === 'verified',
      owner: 'Compliance',
    },
    {
      label: 'Sanctions and AML screening',
      detail: statusLabel(readiness?.sanctionsStatus ?? null),
      passed: readiness?.sanctionsStatus === 'clear',
      owner: 'Compliance',
    },
    {
      label: 'Investor suitability',
      detail: statusLabel(readiness?.suitabilityStatus ?? null),
      passed: readiness?.suitabilityStatus === 'suitable',
      owner: 'Compliance',
    },
    {
      label: 'Required disclosures',
      detail: `${readiness?.acceptedDisclosures ?? 0}/${readiness?.requiredDisclosures ?? 0} accepted`,
      passed: Boolean(readiness && readiness.requiredDisclosures > 0 && readiness.acceptedDisclosures === readiness.requiredDisclosures),
      owner: 'You',
    },
    {
      label: 'Approved broker account',
      detail: `${readiness?.connectedSandboxAccounts ?? 0} sandbox account(s) connected`,
      passed: Boolean(readiness?.connectedSandboxAccounts),
      owner: 'Broker',
    },
    {
      label: 'Broker integration approval',
      detail: provider
        ? `${statusLabel(provider.regulatoryStatus)} · ${statusLabel(provider.integrationStatus)}`
        : 'No provider contract configured',
      passed: Boolean(provider?.accountConnectionEnabled && provider.regulatoryStatus === 'approved'),
      owner: 'TradePulse',
    },
    {
      label: 'Global live-order authorization',
      detail: readiness?.executionEnabled ? 'Enabled' : 'Hard locked',
      passed: Boolean(readiness?.executionEnabled),
      owner: 'TradePulse',
    },
  ], [provider, readiness])
  const passedChecks = checks.filter((check) => check.passed).length
  const selectedInstrument = workspace?.instruments.find((item) => item.id === Number(instrumentId))

  const acceptDisclosure = async (disclosureId: string) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await acceptBrokerageDisclosure(disclosureId)
      await refresh()
      setMessage('Disclosure acceptance recorded in your private audit trail.')
    } catch (actionError) {
      setError(displayError(actionError))
    } finally {
      setLoading(false)
    }
  }

  const previewOrder = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const preview = await createBrokeragePreview({
        instrumentId: Number(instrumentId),
        side,
        orderType,
        quantity: Number(quantity),
        limitPrice: orderType === 'limit' ? Number(limitPrice) : null,
        clientRequestId: clientRequestId.current,
      })
      setLatestPreview(preview)
      clientRequestId.current = crypto.randomUUID()
      await refresh()
      setMessage('Readiness preview saved. No order was created or routed.')
    } catch (actionError) {
      setError(displayError(actionError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel brokerage-panel" id="brokerage-readiness">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Regulated execution runway · Phase 4D</p>
          <h2>Global brokerage readiness</h2>
        </div>
        <div className="panel-header-actions">
          <AcademyLink courseSlug="brokerage-readiness" lessonSlug="execution-vs-preview" />
          <span className="status-badge brokerage-lock-badge">
            <LockKeyhole size={14} /> Live orders hard locked
          </span>
        </div>
      </div>

      <p className="panel-description brokerage-description">
        See exactly what TradePulse, a regulated broker, compliance teams and
        you must complete before live investing could ever be enabled. Order
        previews are auditable readiness checks—not broker instructions.
        The sandbox certification matrix, provider-bound probe and aggregate
        account inventory prove adapter safety without exposing customer data.
      </p>

      <div className="brokerage-lock-banner" role="status">
        <ShieldAlert size={21} />
        <div>
          <strong>Execution is impossible in this release</strong>
          <span>The database enforces executable = false, every provider route is disabled, and no live-order endpoint exists.</span>
        </div>
        <span>{readiness?.policyVersion ?? 'brokerage-gate-v1'}</span>
      </div>

      {authLoading ? (
        <div className="brokerage-empty" role="status"><RefreshCw size={20} /> Checking secure session…</div>
      ) : !session ? (
        <div className="brokerage-empty">
          <ShieldCheck size={24} />
          <div>
            <strong>Your readiness record is private.</strong>
            <span>Sign in through Paper Investing to view disclosures and create a non-executable preview.</span>
          </div>
          <a className="secondary-button" href="#paper-investing">Go to secure sign-in</a>
        </div>
      ) : !workspace ? (
        <div className="brokerage-empty" role="status"><RefreshCw size={20} /> Loading brokerage readiness…</div>
      ) : (
        <>
          <div className="brokerage-summary-grid">
            <article><ClipboardCheck size={18} /><span>Readiness gates</span><strong>{passedChecks}/{checks.length}</strong></article>
            <article><Building2 size={18} /><span>Broker contract</span><strong>{statusLabel(provider?.integrationStatus ?? null)}</strong></article>
            <article><FileCheck2 size={18} /><span>Disclosures</span><strong>{readiness?.acceptedDisclosures ?? 0}/{readiness?.requiredDisclosures ?? 0}</strong></article>
            <article className="locked"><Ban size={18} /><span>Live routing</span><strong>Disabled</strong></article>
          </div>

          <section className="brokerage-certification" aria-labelledby="broker-certification-title">
            <div className="brokerage-card-head">
              <div>
                <span>Broker-neutral adapter contract</span>
                <strong id="broker-certification-title">Sandbox certification matrix</strong>
              </div>
              <ClipboardCheck size={19} />
            </div>

            <div className={`adapter-health-banner ${adapterHealth?.latestStatus ?? 'not_run'}`}>
              <ScanSearch size={18} />
              <div>
                <span>Provider-bound sandbox adapter</span>
                <strong>Alpaca Broker API · read-only asset capability</strong>
                <small>
                  {adapterHealth?.checkedAt
                    ? `Checked ${compactDate(adapterHealth.checkedAt)} · ${adapterHealth.latencyMs ?? 0} ms · ${adapterHealth.attemptCount ?? 0} attempt(s)`
                    : 'Not yet probed with server-side sandbox credentials'}
                </small>
              </div>
              <div className="adapter-health-state">
                <strong>{statusLabel(adapterHealth?.latestStatus ?? 'not_run')}</strong>
                <small>{adapterHealth?.errorCode ? statusLabel(adapterHealth.errorCode) : 'Orders and accounts disabled'}</small>
              </div>
            </div>

            <div className={`adapter-health-banner ${accountInventory?.latestStatus ?? 'not_run'}`}>
              <RefreshCw size={18} />
              <div>
                <span>Broker account reconciliation signal</span>
                <strong>Sandbox account inventory · aggregate only</strong>
                <small>
                  {accountInventory?.checkedAt
                    ? `Checked ${compactDate(accountInventory.checkedAt)} · ${accountInventory.latencyMs ?? 0} ms · ${accountInventory.attemptCount ?? 0} attempt(s)`
                    : 'Not yet synchronized with the read-only sandbox credential'}
                </small>
              </div>
              <div className="adapter-health-state">
                <strong>{statusLabel(accountInventory?.latestStatus ?? 'not_run')}</strong>
                <small>{accountInventory?.errorCode ? statusLabel(accountInventory.errorCode) : 'No account identifiers or PII stored'}</small>
              </div>
            </div>

            <div className="certification-overview">
              <div>
                <span>Sandbox accounts</span>
                <strong>{accountInventory?.totalAccounts ?? 0}</strong>
                <small>
                  {accountInventory?.pageLimitReached
                    ? 'Provider page limit reached; totals may be incomplete'
                    : accountInventory?.currencies.length
                      ? accountInventory.currencies.join(', ')
                      : 'No account currency observed'}
                </small>
              </div>
              <div>
                <span>Active</span>
                <strong>{accountInventory?.activeAccounts ?? 0}</strong>
                <small>{accountInventory?.pendingAccounts ?? 0} pending</small>
              </div>
              <div>
                <span>Action required</span>
                <strong>{accountInventory?.actionRequiredAccounts ?? 0}</strong>
                <small>{accountInventory?.rejectedAccounts ?? 0} rejected · {accountInventory?.closedAccounts ?? 0} closed</small>
              </div>
              <div>
                <span>Restricted</span>
                <strong>{accountInventory?.restrictedAccounts ?? 0}</strong>
                <small>{accountInventory?.changedSincePrevious ? 'Inventory changed since previous sync' : 'No detected inventory change'}</small>
              </div>
            </div>

            <div className="certification-overview">
              <div>
                <span>Provider contract</span>
                <strong>{certification?.displayName ?? provider?.displayName ?? 'Not configured'}</strong>
                <small>{certification?.adapterContractVersion ?? provider?.adapterContractVersion ?? 'No adapter version'}</small>
              </div>
              <div>
                <span>Latest certification</span>
                <strong className={`certification-status ${certification?.latestStatus ?? 'not-run'}`}>
                  {certification?.latestStatus ? statusLabel(certification.latestStatus) : 'Not run'}
                </strong>
                <small>{certification?.completedAt ? compactDate(certification.completedAt) : 'Awaiting a service-issued sandbox report'}</small>
              </div>
              <div>
                <span>Required controls</span>
                <strong>{certificationCompleted}/{certification?.requiredTests ?? certificationTests.length}</strong>
                <small>{certification?.failedTests ?? 0} failed · live routing never tested</small>
              </div>
              <div>
                <span>Evidence source</span>
                <strong>{certification?.suiteVersion ?? 'Pending'}</strong>
                <small>{certification?.sourceCommitSha ? `Commit ${certification.sourceCommitSha.slice(0, 7)}` : 'No certification evidence yet'}</small>
              </div>
            </div>

            <div className="certification-matrix">
              {certificationTests.map((test) => (
                <article className={`certification-test ${test.status}`} key={test.code}>
                  {test.status === 'passed'
                    ? <CheckCircle2 size={15} />
                    : test.status === 'failed'
                      ? <ShieldAlert size={15} />
                      : <Circle size={15} />}
                  <div>
                    <strong>{test.title}</strong>
                    <span>{test.description}</span>
                  </div>
                  <small>{statusLabel(test.status)}</small>
                </article>
              ))}
            </div>

            <p className="certification-boundary">
              Certification reports are service-only, sandbox-constrained and
              sanitized. The current provider adapter permits only a fixed asset
              read; account reads and all order operations are absent. Passing
              either check cannot enable production routing, approve a
              jurisdiction or authorize a customer to trade.
            </p>
          </section>

          <div className="brokerage-grid">
            <section className="brokerage-card readiness-card-panel">
              <div className="brokerage-card-head">
                <div><span>Launch gates</span><strong>What must be true</strong></div>
                <ScanSearch size={19} />
              </div>
              <div className="brokerage-check-list">
                {checks.map((check) => (
                  <div className={check.passed ? 'brokerage-check passed' : 'brokerage-check'} key={check.label}>
                    {check.passed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    <div><strong>{check.label}</strong><span>{check.detail}</span></div>
                    <small>{check.owner}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="brokerage-card disclosure-card">
              <div className="brokerage-card-head">
                <div><span>Authenticated clickwrap</span><strong>Required disclosures</strong></div>
                <FileCheck2 size={19} />
              </div>
              <div className="brokerage-disclosures">
                {workspace.disclosures.map((disclosure) => (
                  <article key={disclosure.id}>
                    <div>
                      <strong>{disclosure.title}</strong>
                      <span>{disclosure.summary}</span>
                    </div>
                    {disclosure.acceptedAt ? (
                      <small><Check size={13} /> Accepted {compactDate(disclosure.acceptedAt)}</small>
                    ) : (
                      <button className="secondary-button" type="button" disabled={loading} onClick={() => void acceptDisclosure(disclosure.id)}>
                        Review and accept v{disclosure.version}
                      </button>
                    )}
                  </article>
                ))}
              </div>
              <p className="brokerage-consent-note">
                Acceptance records acknowledgement only. It does not approve KYC,
                suitability, a broker account or live execution.
              </p>
            </section>
          </div>

          <div className="brokerage-preview-layout">
            <form className="brokerage-preview-form" onSubmit={previewOrder}>
              <div className="brokerage-card-head">
                <div><span>Server-evaluated check</span><strong>Create an order readiness preview</strong></div>
                <Landmark size={19} />
              </div>

              <div className="brokerage-form-grid">
                <label>
                  Instrument
                  <select value={instrumentId} required onChange={(event) => setInstrumentId(event.target.value)}>
                    {workspace.instruments.length === 0
                      ? <option value="">No research instruments available</option>
                      : workspace.instruments.map((instrument) => (
                          <option key={instrument.id} value={instrument.id}>
                            {instrument.symbol} · {instrument.name} · {instrument.quoteCurrency}
                          </option>
                        ))}
                  </select>
                </label>
                <label>
                  Side
                  <select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')}>
                    <option value="buy">Buy preview</option>
                    <option value="sell">Sell preview</option>
                  </select>
                </label>
                <label>
                  Order type
                  <select value={orderType} onChange={(event) => setOrderType(event.target.value as 'market' | 'limit')}>
                    <option value="market">Market reference</option>
                    <option value="limit">Limit reference</option>
                  </select>
                </label>
                <label>
                  Quantity
                  <input type="number" min="0.00000001" step="0.00000001" value={quantity} required onChange={(event) => setQuantity(event.target.value)} />
                </label>
                {orderType === 'limit' ? (
                  <label>
                    Limit price ({selectedInstrument?.quoteCurrency ?? 'USD'})
                    <input type="number" min="0.00000001" step="0.00000001" value={limitPrice} required onChange={(event) => setLimitPrice(event.target.value)} />
                  </label>
                ) : null}
              </div>

              <button className="primary-button brokerage-preview-button" type="submit" disabled={loading || !instrumentId}>
                {loading ? <RefreshCw size={15} /> : <ScanSearch size={15} />}
                Run blocked preview
              </button>
              <small>No cash is reserved. No order is created. No broker is contacted.</small>
            </form>

            <section className="brokerage-preview-result" aria-live="polite">
              {!latestPreview ? (
                <div className="preview-placeholder">
                  <ShieldAlert size={26} />
                  <strong>Every preview will remain blocked</strong>
                  <span>The value is the transparent evidence explaining each missing approval.</span>
                </div>
              ) : (
                <>
                  <div className="preview-result-head">
                    <div><span>{latestPreview.symbol ?? selectedInstrument?.symbol ?? 'Instrument'} · {latestPreview.side}</span><strong>Not executable</strong></div>
                    <Ban size={20} />
                  </div>
                  <div className="preview-values">
                    <div><span>Reference price</span><strong>{money(latestPreview.referencePrice, latestPreview.quoteCurrency)}</strong></div>
                    <div><span>Estimated notional</span><strong>{money(latestPreview.estimatedNotional, latestPreview.quoteCurrency)}</strong></div>
                    <div><span>Expires</span><strong>{compactDate(latestPreview.expiresAt)}</strong></div>
                  </div>
                  <div className="preview-blockers">
                    <span>{latestPreview.blockReasons.length} blocking controls</span>
                    {latestPreview.blockReasons.map((blocker) => (
                      <div key={blocker.code}>
                        <ShieldAlert size={14} />
                        <p><strong>{blocker.message}</strong><small>{blocker.owner.replace('_', ' ')}</small></p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          {workspace.previews.length > 0 ? (
            <div className="brokerage-history">
              <div><span>Private audit history</span><strong>Recent readiness previews</strong></div>
              <div className="brokerage-history-list">
                {workspace.previews.slice(0, 5).map((preview) => (
                  <article key={preview.id}>
                    <strong>{preview.symbol ?? `Instrument ${preview.instrumentId}`}</strong>
                    <span>{preview.side} · {preview.quantity} · {money(preview.estimatedNotional, preview.quoteCurrency)}</span>
                    <small><Ban size={12} /> Blocked · {compactDate(preview.createdAt)}</small>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? <div className="inline-message error" role="alert">{error}</div> : null}
      {message ? <div className="inline-message success" role="status">{message}</div> : null}
    </section>
  )
}
