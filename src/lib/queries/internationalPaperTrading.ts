import { supabase } from '../supabase/client'

type NumericValue = number | string | null

const toNumber = (value: NumericValue) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string }
      if (payload.error) throw new Error(payload.error)
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) throw responseError
    }
  }
  throw error instanceof Error ? error : new Error('The international paper request failed.')
}

export type InternationalPaperCatalogItem = {
  listingId: number
  listingKey: string
  displaySymbol: string
  instrumentName: string
  instrumentType: 'equity' | 'etf' | 'depositary_receipt'
  quoteCurrency: string
  micCode: string
  venueName: string
  venueCountryCode: string
  sessionState: 'open_scenario' | 'closed_scenario' | 'halted_scenario'
  tickSize: number
  lotSize: number
  fractionalSimulationEnabled: boolean
  partialFillSimulationEnabled: boolean
  settlementDays: number
  scenarioPrice: number
  availableQuantity: number
  quoteStatus: 'available_scenario' | 'halted_scenario' | 'unavailable'
  quoteObservedAt: string
  commissionBps: number
  exchangeFeeBps: number
  taxAssumptionBps: number
  costStatus: 'modeled_scenario' | 'unavailable'
  ruleVersion: string
  quoteVersion: string
}

export type InternationalPaperCash = { currency: string; balance: number; availableBalance: number }
export type InternationalPaperPosition = {
  listingId: number
  listingKey: string
  displaySymbol: string
  instrumentName: string
  micCode: string
  quoteCurrency: string
  quantity: number
  averageCost: number
  realizedPnl: number
  openTaxLotQuantity: number
  openTaxLotCount: number
}
export type InternationalPaperOrder = {
  id: string
  listingKey: string
  displaySymbol: string
  micCode: string
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  filledQuantity: number
  status: string
  averageFillPrice: number | null
  quoteCurrency: string
  totalCost: number
  rejectionReason: string | null
  submittedAt: string
}
export type InternationalPaperSnapshot = {
  initialized: boolean
  accountStatus: 'active' | 'paused' | null
  baseCurrency: string | null
  cash: InternationalPaperCash[]
  positions: InternationalPaperPosition[]
  orders: InternationalPaperOrder[]
  latestReconciliation: {
    status: 'passed' | 'exception'
    issues: number
    reconciledAt: string
  } | null
}

export async function getInternationalPaperCatalog(): Promise<InternationalPaperCatalogItem[]> {
  const { data, error } = await supabase
    .from('international_paper_market_catalog')
    .select('*')
    .order('mic_code')
    .order('display_symbol')

  if (error) throw error
  return (data ?? []).map((row) => ({
    listingId: Number(row.listing_id),
    listingKey: row.listing_key,
    displaySymbol: row.display_symbol,
    instrumentName: row.instrument_name,
    instrumentType: row.instrument_type,
    quoteCurrency: row.quote_currency,
    micCode: row.mic_code,
    venueName: row.venue_name,
    venueCountryCode: row.venue_country_code,
    sessionState: row.session_state,
    tickSize: toNumber(row.tick_size),
    lotSize: toNumber(row.lot_size),
    fractionalSimulationEnabled: row.fractional_simulation_enabled,
    partialFillSimulationEnabled: row.partial_fill_simulation_enabled,
    settlementDays: Number(row.settlement_days),
    scenarioPrice: toNumber(row.scenario_price),
    availableQuantity: toNumber(row.available_quantity),
    quoteStatus: row.quote_status,
    quoteObservedAt: row.quote_observed_at,
    commissionBps: toNumber(row.commission_bps),
    exchangeFeeBps: toNumber(row.exchange_fee_bps),
    taxAssumptionBps: toNumber(row.tax_assumption_bps),
    costStatus: row.cost_status,
    ruleVersion: row.rule_version,
    quoteVersion: row.quote_version,
  }))
}

export async function getInternationalPaperSnapshot(portfolioId: string): Promise<InternationalPaperSnapshot> {
  const [account, cash, positions, orders, reconciliation] = await Promise.all([
    supabase.from('international_paper_accounts').select('base_currency, account_status').eq('portfolio_id', portfolioId).maybeSingle(),
    supabase.from('international_paper_cash_balances').select('currency, balance, available_balance').eq('portfolio_id', portfolioId).order('currency'),
    supabase.from('international_paper_position_summary').select('*').eq('portfolio_id', portfolioId).neq('quantity', 0).order('mic_code'),
    supabase.from('international_paper_order_history').select('*').eq('portfolio_id', portfolioId).order('submitted_at', { ascending: false }).limit(12),
    supabase.from('international_paper_reconciliations').select('status, unbalanced_journals, cash_mismatches, position_mismatches, tax_lot_mismatches, reconciled_at').eq('portfolio_id', portfolioId).order('reconciled_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const firstError = [account.error, cash.error, positions.error, orders.error, reconciliation.error].find(Boolean)
  if (firstError) throw firstError
  return {
    initialized: Boolean(account.data),
    accountStatus: account.data?.account_status ?? null,
    baseCurrency: account.data?.base_currency ?? null,
    cash: (cash.data ?? []).map((row) => ({ currency: row.currency, balance: toNumber(row.balance), availableBalance: toNumber(row.available_balance) })),
    positions: (positions.data ?? []).map((row) => ({
      listingId: Number(row.listing_id), listingKey: row.listing_key,
      displaySymbol: row.display_symbol, instrumentName: row.instrument_name,
      micCode: row.mic_code, quoteCurrency: row.quote_currency,
      quantity: toNumber(row.quantity), averageCost: toNumber(row.average_cost),
      realizedPnl: toNumber(row.realized_pnl), openTaxLotQuantity: toNumber(row.open_tax_lot_quantity),
      openTaxLotCount: Number(row.open_tax_lot_count),
    })),
    orders: (orders.data ?? []).map((row) => ({
      id: row.id, listingKey: row.listing_key, displaySymbol: row.display_symbol,
      micCode: row.mic_code, side: row.side, orderType: row.order_type,
      quantity: toNumber(row.quantity), filledQuantity: toNumber(row.filled_quantity),
      status: row.status, averageFillPrice: row.average_fill_price === null ? null : toNumber(row.average_fill_price),
      quoteCurrency: row.quote_currency, totalCost: toNumber(row.total_cost),
      rejectionReason: row.rejection_reason, submittedAt: row.submitted_at,
    })),
    latestReconciliation: reconciliation.data ? {
      status: reconciliation.data.status,
      issues: Number(reconciliation.data.unbalanced_journals) + Number(reconciliation.data.cash_mismatches) + Number(reconciliation.data.position_mismatches) + Number(reconciliation.data.tax_lot_mismatches),
      reconciledAt: reconciliation.data.reconciled_at,
    } : null,
  }
}

async function manageInternationalPaper(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('manage-international-paper', { body })
  if (error) return throwFunctionError(error)
  return data?.result
}

export const initializeInternationalPaperAccount = (portfolioId: string, startingBalance: number) =>
  manageInternationalPaper({ action: 'initialize', portfolioId, startingBalance })

export const convertInternationalPaperCash = (input: {
  portfolioId: string; fromCurrency: string; toCurrency: string; fromAmount: number; clientConversionId: string
}) => manageInternationalPaper({ action: 'convert_cash', ...input })

export const submitInternationalPaperOrder = (input: {
  portfolioId: string; listingId: number; clientOrderId: string; side: 'buy' | 'sell'
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit'; timeInForce: 'day' | 'gtc' | 'ioc'
  quantity: number; limitPrice: number | null; stopPrice: number | null
}) => manageInternationalPaper({ action: 'submit_order', ...input })

export const reconcileInternationalPaperPortfolio = (portfolioId: string) =>
  manageInternationalPaper({ action: 'reconcile', portfolioId })
