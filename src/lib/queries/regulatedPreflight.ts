import { supabase } from '../supabase/client'

export type PreflightInstrument = {
  id: number
  symbol: string
  name: string
  assetClass: string
  quoteCurrency: string
}

export type PreflightDisclosure = {
  id: string
  code: string
  version: string
  title: string
  summary: string
  acceptedAt: string | null
}

export type PreflightBlockReason = {
  code: string
  message: string
  owner: 'user' | 'tradepulse' | 'broker' | 'compliance' | 'market_data'
}

export type RegulatedPreflightReview = {
  id: string
  instrumentId: number
  symbol: string | null
  instrumentName: string | null
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  limitPrice: number | null
  referencePrice: number | null
  referenceObservedAt: string | null
  estimatedNotional: number | null
  quoteCurrency: string
  eligibilityStatus: 'not_verified' | 'review_required' | 'policy_match' | 'blocked'
  disclosureStatus: 'complete' | 'incomplete'
  suitabilityStatus: 'not_assessed' | 'pending' | 'suitable' | 'restricted'
  marketSessionStatus: 'not_verified'
  referenceDataStatus: 'current' | 'stale' | 'unavailable'
  costStatus: 'unavailable'
  costBreakdown: Record<string, unknown>
  riskStatus: 'review_required'
  riskSummary: Record<string, unknown>
  reviewStatus: 'blocked'
  executable: false
  blockReasons: PreflightBlockReason[]
  policyVersion: string
  expiresAt: string
  createdAt: string
}

export type RegulatedPreflightWorkspace = {
  policyVersion: string
  orderSubmissionEnabled: false
  marketSessionVerificationEnabled: false
  feeScheduleEnabled: false
  riskCapacityApprovalEnabled: false
  instruments: PreflightInstrument[]
  disclosures: PreflightDisclosure[]
  reviews: RegulatedPreflightReview[]
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function objectOrEmpty(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function blockReasons(value: unknown): PreflightBlockReason[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const owner = row.owner
    if (
      typeof row.code !== 'string'
      || typeof row.message !== 'string'
      || !['user', 'tradepulse', 'broker', 'compliance', 'market_data'].includes(String(owner))
    ) return []
    return [{
      code: row.code,
      message: row.message,
      owner: owner as PreflightBlockReason['owner'],
    }]
  })
}

function mapReview(row: Record<string, any>): RegulatedPreflightReview {
  const instrument = Array.isArray(row.investment_instruments)
    ? row.investment_instruments[0]
    : row.investment_instruments
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol ?? instrument?.display_symbol ?? null,
    instrumentName: row.instrumentName ?? row.instrument_name ?? instrument?.name ?? null,
    side: row.side,
    orderType: row.order_type,
    quantity: Number(row.quantity),
    limitPrice: numberOrNull(row.limit_price),
    referencePrice: numberOrNull(row.reference_price),
    referenceObservedAt: row.reference_observed_at,
    estimatedNotional: numberOrNull(row.estimated_notional),
    quoteCurrency: row.quote_currency,
    eligibilityStatus: row.eligibility_status,
    disclosureStatus: row.disclosure_status,
    suitabilityStatus: row.suitability_status,
    marketSessionStatus: 'not_verified',
    referenceDataStatus: row.reference_data_status,
    costStatus: 'unavailable',
    costBreakdown: objectOrEmpty(row.cost_breakdown),
    riskStatus: 'review_required',
    riskSummary: objectOrEmpty(row.risk_summary),
    reviewStatus: 'blocked',
    executable: false,
    blockReasons: blockReasons(row.block_reasons),
    policyVersion: row.policy_version,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string; requestId?: string }
      if (payload.error) {
        const reference = payload.requestId?.slice(0, 8)
        throw new Error(`${payload.error}${reference ? ` Reference: ${reference}` : ''}`)
      }
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) throw responseError
    }
  }
  throw error instanceof Error ? error : new Error('The regulated preflight could not be completed.')
}

export async function getRegulatedPreflightWorkspace(): Promise<RegulatedPreflightWorkspace> {
  const nowIso = new Date().toISOString()
  const { data: profile, error: profileError } = await supabase
    .from('user_investor_profiles')
    .select('verified_residency_country')
    .maybeSingle()
  if (profileError) throw profileError

  let disclosureQuery = supabase
    .from('brokerage_disclosures')
    .select('id, code, version, title, summary')
    .eq('required', true)
    .eq('published', true)
    .lte('effective_at', nowIso)
    .or(`superseded_at.is.null,superseded_at.gt.${nowIso}`)
  disclosureQuery = profile?.verified_residency_country
    ? disclosureQuery.or(
      `jurisdiction_code.is.null,jurisdiction_code.eq.${profile.verified_residency_country}`,
    )
    : disclosureQuery.is('jurisdiction_code', null)

  const [controlResult, instrumentResult, disclosureResult, consentResult, reviewResult] = await Promise.all([
    supabase
      .from('brokerage_preflight_controls')
      .select('*')
      .eq('control_key', 'regulated-preflight')
      .single(),
    supabase
      .from('investment_instruments')
      .select('id, display_symbol, name, asset_class, quote_currency')
      .eq('research_enabled', true)
      .not('market_asset_id', 'is', null)
      .order('display_symbol'),
    disclosureQuery.order('effective_at'),
    supabase
      .from('brokerage_consents')
      .select('disclosure_id, disclosure_version, accepted_at')
      .is('revoked_at', null),
    supabase
      .from('brokerage_preflight_reviews')
      .select('*, investment_instruments!inner(display_symbol, name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])
  const firstError = [
    controlResult.error,
    instrumentResult.error,
    disclosureResult.error,
    consentResult.error,
    reviewResult.error,
  ].find(Boolean)
  if (firstError) throw firstError

  const consentMap = new Map(
    (consentResult.data ?? []).map((item) => [
      item.disclosure_id,
      { version: item.disclosure_version, acceptedAt: item.accepted_at },
    ]),
  )
  const control = controlResult.data
  return {
    policyVersion: control.policy_version,
    orderSubmissionEnabled: false,
    marketSessionVerificationEnabled: false,
    feeScheduleEnabled: false,
    riskCapacityApprovalEnabled: false,
    instruments: (instrumentResult.data ?? []).map((item) => ({
      id: item.id,
      symbol: item.display_symbol,
      name: item.name,
      assetClass: item.asset_class,
      quoteCurrency: item.quote_currency,
    })),
    disclosures: (disclosureResult.data ?? []).map((item) => ({
      id: item.id,
      code: item.code,
      version: item.version,
      title: item.title,
      summary: item.summary,
      acceptedAt: consentMap.get(item.id)?.version === item.version
        ? consentMap.get(item.id)?.acceptedAt ?? null
        : null,
    })),
    reviews: (reviewResult.data ?? []).map(mapReview),
  }
}

export async function createRegulatedPreflight(input: {
  instrumentId: number
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  limitPrice: number | null
  clientRequestId: string
}) {
  const { data, error } = await supabase.functions.invoke('evaluate-regulated-preflight', { body: input })
  if (error) return throwFunctionError(error)
  return mapReview(data.review)
}
