import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  FileClock,
  Fingerprint,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth/AuthProvider'
import { supabase } from '../lib/supabase/client'
import {
  getSandboxOrderWorkspace,
  type SandboxOrderLifecycle,
  type SandboxOrderWorkspace,
} from '../lib/queries/sandboxOrderLifecycle'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const label = (value: string) => value.split('_').join(' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const when = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Awaiting provider time'
const shortId = (value: string) => `${value.slice(0, 11)}…${value.slice(-6)}`

function LifecycleCard({ order }: { order: SandboxOrderLifecycle }) {
  const terminal = ['filled', 'canceled', 'expired', 'rejected'].includes(order.providerStatus)
  return <article className="sandbox-order-card">
    <div className="sandbox-order-card-head">
      <div><strong>{order.symbol}</strong><span>limit · protected bracket · long only</span></div>
      <span className={terminal ? 'sandbox-order-state terminal' : 'sandbox-order-state'}>{label(order.providerStatus)}</span>
    </div>
    <div className="sandbox-order-values">
      <div><span>Quantity</span><strong>{order.quantity}</strong></div>
      <div><span>Bounded notional</span><strong>{money.format(order.estimatedNotionalUsd)}</strong></div>
      <div><span>Take profit</span><strong>{money.format(order.takeProfitLimitPrice)}</strong></div>
      <div><span>Stop loss</span><strong>{money.format(order.stopLossStopPrice)}</strong></div>
    </div>
    <div className="sandbox-order-card-foot">
      <span><FileClock size={14} /> {label(order.action)} · {when(order.providerRecordedAt ?? order.createdAt)}</span>
      <code>{shortId(order.clientOrderId)}</code>
    </div>
  </article>
}

export function SandboxOrderLifecyclePanel() {
  const { session, loading: authLoading } = useAuth()
  const [workspace, setWorkspace] = useState<SandboxOrderWorkspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      setWorkspace(await getSandboxOrderWorkspace())
      setError(null)
    } catch {
      setError('Sandbox lifecycle evidence could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!session) return undefined
    const channel = supabase
      .channel(`sandbox-order-receipts-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broker_sandbox_order_receipts',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => { void refresh() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [refresh, session])

  const totals = useMemo(() => ({
    orders: workspace?.lifecycles.length ?? 0,
    receipts: workspace?.receipts.length ?? 0,
    recovered: workspace?.receipts.filter((item) => item.recoveredAfterAmbiguous).length ?? 0,
  }), [workspace])

  return <section className="panel sandbox-order-panel">
    <div className="panel-header">
      <div><p className="eyebrow">Partner sandbox · Phase 6B</p><h2>Inspect the protected order lifecycle</h2></div>
      <span className="status-badge sandbox-order-lock"><LockKeyhole size={14} /> Internal service only</span>
    </div>
    <p className="panel-description">
      View sanitized Alpaca partner-sandbox submit, cancel, replace and reconciliation evidence. The browser has no order endpoint, provider credential or live route.
    </p>

    <div className="sandbox-order-boundaries" role="status">
      <article><ShieldCheck size={19} /><div><strong>Protected bracket orders</strong><span>Long-only US-equity orders require server-validated take-profit and stop-loss controls.</span></div></article>
      <article><Fingerprint size={19} /><div><strong>Private identifiers</strong><span>Provider account and order identifiers are reduced to one-way fingerprints before storage.</span></div></article>
      <article><Ban size={19} /><div><strong>Live execution locked</strong><span>No production routing, funding, custody, settlement, payments or money movement.</span></div></article>
    </div>

    {authLoading ? <div className="sandbox-order-empty"><RefreshCw size={18} /> Checking secure session…</div> : null}
    {!authLoading && !session ? <div className="sandbox-order-empty">
      <ShieldCheck size={24} />
      <div><strong>Your sandbox receipts are private.</strong><span>Sign in through Paper Investing to inspect approved-pilot lifecycle evidence.</span></div>
      <a className="secondary-button" href="#paper-investing">Go to secure sign-in</a>
    </div> : null}

    {session ? <>
      {error ? <p className="error-message" role="alert"><AlertTriangle size={15} /> {error}</p> : null}
      <div className="sandbox-order-summary">
        <article><span>Current lifecycles</span><strong>{totals.orders}</strong><small>Latest sanitized state per order</small></article>
        <article><span>Append-only receipts</span><strong>{totals.receipts}</strong><small>Submit, cancel, replace, reconcile</small></article>
        <article><span>Ambiguity recovered</span><strong>{totals.recovered}</strong><small>Lookup used instead of repeat POST</small></article>
        <article><span>Order ceiling</span><strong>{workspace ? money.format(workspace.control.maxOrderNotionalUsd) : '—'}</strong><small>Server and database enforced</small></article>
      </div>

      <div className="sandbox-order-section-head">
        <div><span>Customer-scoped lifecycle</span><strong>Partner-sandbox orders</strong></div>
        <button type="button" className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} /> Refresh evidence</button>
      </div>
      {!workspace && loading ? <div className="sandbox-order-empty"><RefreshCw size={18} /> Loading sandbox lifecycle…</div> : null}
      {workspace && workspace.lifecycles.length === 0 ? <div className="sandbox-order-empty">
        <FileClock size={22} /><div><strong>No sandbox lifecycle receipts yet.</strong><span>Approved internal pilot operations will appear here after append-only evidence is recorded.</span></div>
      </div> : null}
      <div className="sandbox-order-grid">{workspace?.lifecycles.map((order) => <LifecycleCard key={order.id} order={order} />)}</div>

      <div className="sandbox-order-lower-grid">
        <section className="sandbox-order-timeline">
          <div className="sandbox-order-section-head"><div><span>Immutable trust trail</span><strong>Recent lifecycle receipts</strong></div><ArrowRightLeft size={18} /></div>
          {workspace?.receipts.length ? workspace.receipts.slice(0, 10).map((receipt) => <article key={receipt.id}>
            <span className="sandbox-order-action"><RotateCcw size={14} /> {label(receipt.action)}</span>
            <div><strong>{receipt.symbol} · {label(receipt.providerStatus)}</strong><small>{when(receipt.createdAt)} · {shortId(receipt.clientOrderId)}</small></div>
            {receipt.recoveredAfterAmbiguous ? <span className="sandbox-order-recovered"><CheckCircle2 size={13} /> Recovered</span> : null}
          </article>) : <p>No receipt evidence recorded.</p>}
        </section>
        <section className="sandbox-order-reconciliation">
          <div className="sandbox-order-section-head"><div><span>Aggregate control</span><strong>Reconciliation health</strong></div><ShieldCheck size={18} /></div>
          {workspace?.reconciliation ? <>
            <span className={`sandbox-order-state ${workspace.reconciliation.status === 'passed' ? '' : 'terminal'}`}>{label(workspace.reconciliation.status)}</span>
            <div className="sandbox-order-values">
              <div><span>Checked</span><strong>{workspace.reconciliation.checkedOrders}</strong></div>
              <div><span>Matching</span><strong>{workspace.reconciliation.matchingOrders}</strong></div>
              <div><span>Mismatched</span><strong>{workspace.reconciliation.mismatchedOrders}</strong></div>
              <div><span>Missing</span><strong>{workspace.reconciliation.missingOrders}</strong></div>
            </div>
            <small>{when(workspace.reconciliation.createdAt)}</small>
          </> : <p>No aggregate reconciliation run recorded yet.</p>}
          <div className="sandbox-order-no-actions"><LockKeyhole size={16} /><span>Submit, cancel and replace controls are deliberately absent from this browser workspace.</span></div>
        </section>
      </div>
    </> : null}
  </section>
}
