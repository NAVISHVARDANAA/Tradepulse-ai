import { ArrowRight, LockKeyhole, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { createIndicativePaymentQuote } from '../lib/payments'
import type { MarketAssetSnapshot, PaymentCorridor } from '../types/domain'

type PaymentQuotePanelProps = {
  corridors: PaymentCorridor[]
  marketAssets: MarketAssetSnapshot[]
  loading: boolean
  error: string | null
}

const money = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

export function PaymentQuotePanel({
  corridors,
  marketAssets,
  loading,
  error,
}: PaymentQuotePanelProps) {
  const [corridorCode, setCorridorCode] = useState('')
  const [amount, setAmount] = useState('1000')
  const selectedCorridor =
    corridors.find((corridor) => corridor.code === corridorCode) ??
    corridors[0]
  const sourceAmount = Number(amount)
  const quote = useMemo(
    () =>
      selectedCorridor
        ? createIndicativePaymentQuote(
            sourceAmount,
            selectedCorridor,
            marketAssets,
          )
        : null,
    [marketAssets, selectedCorridor, sourceAmount],
  )

  return (
    <section className="panel payment-panel" id="payments">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Cross-border payments · Foundation</p>
          <h2>Indicative corridor quote</h2>
        </div>

        <span className="status-badge sandbox">
          <LockKeyhole size={14} /> Sandbox · no money movement
        </span>
      </div>

      <div className="payment-layout">
        <form className="quote-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="corridor">Payment corridor</label>
          <select
            id="corridor"
            value={selectedCorridor?.code ?? ''}
            onChange={(event) => setCorridorCode(event.target.value)}
            disabled={loading || corridors.length === 0}
          >
            {corridors.map((corridor) => (
              <option key={corridor.code} value={corridor.code}>
                {corridor.sourceCurrency} → {corridor.destinationCurrency}
              </option>
            ))}
          </select>

          <label htmlFor="source-amount">You send</label>
          <div className="amount-input">
            <input
              id="source-amount"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <span>{selectedCorridor?.sourceCurrency ?? '—'}</span>
          </div>

          <p className="form-note">
            Final pricing, identity checks and settlement will be handled by a
            licensed provider when payment execution is activated.
          </p>
        </form>

        <div className="quote-result" aria-live="polite">
          {loading ? (
            <div className="quote-empty">
              <RefreshCw size={20} /> Loading corridors…
            </div>
          ) : error ? (
            <div className="quote-empty" role="alert">
              {error}
            </div>
          ) : corridors.length === 0 ? (
            <div className="quote-empty">No payment corridor is enabled.</div>
          ) : !quote ? (
            <div className="quote-empty">
              A synchronized {selectedCorridor?.fxSymbol} market rate is
              required to calculate an estimate.
            </div>
          ) : (
            <>
              <span className="quote-label">Estimated recipient amount</span>
              <div className="quote-amount">
                {money.format(quote.destinationAmount)}{' '}
                <small>{selectedCorridor.destinationCurrency}</small>
              </div>

              <div className="quote-route">
                <span>{money.format(quote.sourceAmount)}</span>
                <ArrowRight size={16} />
                <span>{money.format(quote.destinationAmount)}</span>
              </div>

              <dl className="quote-breakdown">
                <div>
                  <dt>Reference rate</dt>
                  <dd>{quote.referenceRate.toFixed(4)}</dd>
                </div>
                <div>
                  <dt>Indicative rate</dt>
                  <dd>{quote.customerRate.toFixed(4)}</dd>
                </div>
                <div>
                  <dt>Estimated fees</dt>
                  <dd>
                    {money.format(quote.totalFee)}{' '}
                    {selectedCorridor.sourceCurrency}
                  </dd>
                </div>
                <div>
                  <dt>Target settlement</dt>
                  <dd>~{selectedCorridor.settlementMinutes} min</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
