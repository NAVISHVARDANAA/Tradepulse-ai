import { supabase } from '../supabase/client'

export type SandboxOrderControl = {
  policyVersion: string
  environment: 'sandbox'
  internalSubmissionEnabled: boolean
  browserSubmissionEnabled: false
  liveOrderRoutingEnabled: false
  cancelEnabled: boolean
  replaceEnabled: boolean
  reconciliationEnabled: boolean
  protectiveOrdersRequired: boolean
  maxOrderNotionalUsd: number
}

export type SandboxOrderLifecycle = {
  id: string
  action: 'submit' | 'cancel' | 'replace' | 'reconcile'
  environment: 'sandbox'
  rootClientOrderId: string
  clientOrderId: string
  symbol: string
  side: 'buy'
  orderType: 'limit'
  orderClass: 'bracket'
  quantity: number
  limitPrice: number | null
  takeProfitLimitPrice: number
  stopLossStopPrice: number
  estimatedNotionalUsd: number
  providerStatus: string
  recoveredAfterAmbiguous: boolean
  providerRecordedAt: string | null
  createdAt: string
  browserSubmissionEnabled: false
  liveOrderRoutingEnabled: false
}

export type SandboxOrderReceipt = {
  id: string
  action: SandboxOrderLifecycle['action']
  rootClientOrderId: string
  clientOrderId: string
  priorClientOrderId: string | null
  symbol: string
  providerStatus: string
  recoveredAfterAmbiguous: boolean
  createdAt: string
}

export type SandboxReconciliationHealth = {
  status: 'passed' | 'attention_required' | 'failed'
  checkedOrders: number
  matchingOrders: number
  mismatchedOrders: number
  missingOrders: number
  createdAt: string
}

export type SandboxOrderWorkspace = {
  control: SandboxOrderControl
  lifecycles: SandboxOrderLifecycle[]
  receipts: SandboxOrderReceipt[]
  reconciliation: SandboxReconciliationHealth | null
}

const numberValue = (value: unknown) => Number(value)

export async function getSandboxOrderWorkspace(): Promise<SandboxOrderWorkspace> {
  const [controlResult, lifecycleResult, receiptResult, reconciliationResult] = await Promise.all([
    supabase
      .from('broker_sandbox_order_controls')
      .select('policy_version, environment, internal_submission_enabled, browser_submission_enabled, live_order_routing_enabled, cancel_enabled, replace_enabled, reconciliation_enabled, protective_orders_required, max_order_notional_usd')
      .eq('control_key', 'alpaca-sandbox-orders')
      .single(),
    supabase
      .from('broker_sandbox_order_lifecycle')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('broker_sandbox_order_receipts')
      .select('id, action, root_client_order_id, client_order_id, prior_client_order_id, symbol, provider_status, recovered_after_ambiguous, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('broker_sandbox_reconciliation_runs')
      .select('status, checked_orders, matching_orders, mismatched_orders, missing_orders, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const firstError = [
    controlResult.error,
    lifecycleResult.error,
    receiptResult.error,
    reconciliationResult.error,
  ].find(Boolean)
  if (firstError) throw firstError

  const control = controlResult.data
  if (!control) throw new Error('Sandbox order controls are unavailable.')
  return {
    control: {
      policyVersion: control.policy_version,
      environment: 'sandbox',
      internalSubmissionEnabled: control.internal_submission_enabled === true,
      browserSubmissionEnabled: false,
      liveOrderRoutingEnabled: false,
      cancelEnabled: control.cancel_enabled === true,
      replaceEnabled: control.replace_enabled === true,
      reconciliationEnabled: control.reconciliation_enabled === true,
      protectiveOrdersRequired: control.protective_orders_required === true,
      maxOrderNotionalUsd: numberValue(control.max_order_notional_usd),
    },
    lifecycles: (lifecycleResult.data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      environment: 'sandbox',
      rootClientOrderId: row.root_client_order_id,
      clientOrderId: row.client_order_id,
      symbol: row.symbol,
      side: 'buy',
      orderType: row.order_type,
      orderClass: 'bracket',
      quantity: numberValue(row.quantity),
      limitPrice: row.limit_price === null ? null : numberValue(row.limit_price),
      takeProfitLimitPrice: numberValue(row.take_profit_limit_price),
      stopLossStopPrice: numberValue(row.stop_loss_stop_price),
      estimatedNotionalUsd: numberValue(row.estimated_notional_usd),
      providerStatus: row.provider_status,
      recoveredAfterAmbiguous: row.recovered_after_ambiguous === true,
      providerRecordedAt: row.provider_recorded_at,
      createdAt: row.created_at,
      browserSubmissionEnabled: false,
      liveOrderRoutingEnabled: false,
    })),
    receipts: (receiptResult.data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      rootClientOrderId: row.root_client_order_id,
      clientOrderId: row.client_order_id,
      priorClientOrderId: row.prior_client_order_id,
      symbol: row.symbol,
      providerStatus: row.provider_status,
      recoveredAfterAmbiguous: row.recovered_after_ambiguous === true,
      createdAt: row.created_at,
    })),
    reconciliation: reconciliationResult.data ? {
      status: reconciliationResult.data.status,
      checkedOrders: reconciliationResult.data.checked_orders,
      matchingOrders: reconciliationResult.data.matching_orders,
      mismatchedOrders: reconciliationResult.data.mismatched_orders,
      missingOrders: reconciliationResult.data.missing_orders,
      createdAt: reconciliationResult.data.created_at,
    } : null,
  }
}
