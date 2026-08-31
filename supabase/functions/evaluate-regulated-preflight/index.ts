import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'
import { evaluateRegulatedPreflight } from '../_shared/regulatedPreflight.ts'

type PreflightRequest = {
  instrumentId?: number
  side?: 'buy' | 'sell'
  orderType?: 'market' | 'limit'
  quantity?: number
  limitPrice?: number | null
  clientRequestId?: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function numeric(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

Deno.serve(observeEdgeHandler('regulated-preflight', async (request) => {
  if (request.method === 'OPTIONS') return corsPreflightResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request, { requireVerifiedMfaWhenEnrolled: true })
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: PreflightRequest
  try {
    input = await parseJsonBody<PreflightRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const instrumentId = Number(input.instrumentId)
  const quantity = Number(input.quantity)
  const orderType = input.orderType ?? 'market'
  const limitPrice = input.limitPrice === null || input.limitPrice === undefined
    ? null
    : Number(input.limitPrice)
  const clientRequestId = input.clientRequestId ?? ''

  if (
    !Number.isInteger(instrumentId)
    || instrumentId <= 0
    || !['buy', 'sell'].includes(input.side ?? '')
    || !['market', 'limit'].includes(orderType)
    || !Number.isFinite(quantity)
    || quantity <= 0
    || quantity > 1_000_000
    || (orderType === 'limit' && (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0))
    || !UUID_PATTERN.test(clientRequestId)
  ) {
    return jsonResponse({ error: 'Invalid regulated preflight details' }, 400)
  }

  const admin = userContext.admin
  const { data: existing, error: existingError } = await admin
    .from('brokerage_preflight_reviews')
    .select('*, investment_instruments!inner(display_symbol, name)')
    .eq('user_id', userContext.user.id)
    .eq('client_request_id', clientRequestId)
    .maybeSingle()
  if (existingError) return jsonResponse({ error: 'Unable to check preflight idempotency' }, 500)
  if (existing) return jsonResponse({ review: existing, executable: false, idempotent: true })

  const nowIso = new Date().toISOString()
  const profileResult = await admin
    .from('user_investor_profiles')
    .select('verified_residency_country, investor_type, kyc_status, sanctions_status, suitability_status')
    .eq('user_id', userContext.user.id)
    .maybeSingle()
  if (profileResult.error) return jsonResponse({ error: 'Unable to evaluate regulated preflight' }, 500)

  const profile = profileResult.data
  let disclosureQuery = admin
    .from('brokerage_disclosures')
    .select('id, version')
    .eq('required', true)
    .eq('published', true)
    .lte('effective_at', nowIso)
    .or(`superseded_at.is.null,superseded_at.gt.${nowIso}`)
  disclosureQuery = profile?.verified_residency_country
    ? disclosureQuery.or(
      `jurisdiction_code.is.null,jurisdiction_code.eq.${profile.verified_residency_country}`,
    )
    : disclosureQuery.is('jurisdiction_code', null)

  const [instrumentResult, controlResult, accountResult, disclosureResult, consentResult] = await Promise.all([
    admin
      .from('investment_instruments')
      .select('id, display_symbol, name, quote_currency, market_asset_id, venue_id, research_enabled, live_execution_enabled')
      .eq('id', instrumentId)
      .eq('research_enabled', true)
      .maybeSingle(),
    admin
      .from('brokerage_preflight_controls')
      .select('*')
      .eq('control_key', 'regulated-preflight')
      .single(),
    admin
      .from('brokerage_accounts')
      .select('id')
      .eq('user_id', userContext.user.id)
      .eq('environment', 'sandbox')
      .eq('connection_status', 'connected')
      .limit(1),
    disclosureQuery,
    admin
      .from('brokerage_consents')
      .select('disclosure_id, disclosure_version')
      .eq('user_id', userContext.user.id)
      .is('revoked_at', null),
  ])

  const firstError = [
    instrumentResult.error,
    controlResult.error,
    accountResult.error,
    disclosureResult.error,
    consentResult.error,
  ].find(Boolean)
  if (firstError) return jsonResponse({ error: 'Unable to evaluate regulated preflight' }, 500)

  const instrument = instrumentResult.data
  const control = controlResult.data
  if (!instrument || !control?.preflight_enabled) {
    return jsonResponse({ error: 'Regulated preflight is unavailable for this instrument' }, 409)
  }

  let jurisdictionInvestingEnabled = false
  let instrumentEligibility: 'allowed' | 'restricted' | 'blocked' | 'review_required' | null = null
  if (profile?.verified_residency_country) {
    const [jurisdictionResult, eligibilityResult] = await Promise.all([
      admin
        .from('jurisdictions')
        .select('retail_investing_enabled')
        .eq('country_code', profile.verified_residency_country)
        .maybeSingle(),
      admin
        .from('instrument_eligibility')
        .select('availability')
        .eq('instrument_id', instrument.id)
        .eq('jurisdiction_code', profile.verified_residency_country)
        .eq('investor_type', profile.investor_type)
        .lte('effective_from', nowIso)
        .or(`effective_until.is.null,effective_until.gt.${nowIso}`)
        .maybeSingle(),
    ])
    if (jurisdictionResult.error || eligibilityResult.error) {
      return jsonResponse({ error: 'Unable to evaluate jurisdiction policy' }, 500)
    }
    jurisdictionInvestingEnabled = jurisdictionResult.data?.retail_investing_enabled === true
    instrumentEligibility = eligibilityResult.data?.availability ?? null
  }

  let referencePrice: number | null = null
  let referenceObservedAt: string | null = null
  if (instrument.market_asset_id) {
    const { data: observation, error } = await admin
      .from('market_observations')
      .select('price, observed_at')
      .eq('asset_id', instrument.market_asset_id)
      .not('price', 'is', null)
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return jsonResponse({ error: 'Unable to evaluate reference evidence' }, 500)
    referencePrice = numeric(observation?.price)
    referenceObservedAt = observation?.observed_at ?? null
  }

  const consentByDisclosure = new Map(
    (consentResult.data ?? []).map((item) => [item.disclosure_id, item.disclosure_version]),
  )
  const currentDisclosures = disclosureResult.data ?? []
  const disclosuresComplete = currentDisclosures.length > 0 && currentDisclosures.every(
    (item) => consentByDisclosure.get(item.id) === item.version,
  )
  const orderPrice = orderType === 'limit' ? limitPrice : referencePrice
  const evaluation = evaluateRegulatedPreflight({
    verifiedResidencyCountry: profile?.verified_residency_country ?? null,
    kycStatus: profile?.kyc_status ?? null,
    sanctionsStatus: profile?.sanctions_status ?? null,
    suitabilityStatus: profile?.suitability_status ?? null,
    jurisdictionInvestingEnabled,
    instrumentEligibility,
    disclosuresComplete,
    connectedSandboxAccount: (accountResult.data ?? []).length > 0,
    instrumentExecutionEnabled: instrument.live_execution_enabled === true,
    globalExecutionEnabled: control.order_submission_enabled === true,
    marketSessionVerificationEnabled: control.market_session_verification_enabled === true,
    feeScheduleEnabled: control.fee_schedule_enabled === true,
    riskCapacityApprovalEnabled: control.risk_capacity_approval_enabled === true,
    referencePrice,
    referenceObservedAt,
    orderPrice,
    quantity,
    limitPrice,
    quoteCurrency: instrument.quote_currency,
  })

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { data: review, error: reviewError } = await admin.rpc(
    'persist_regulated_preflight_review',
    {
      p_user_id: userContext.user.id,
      p_client_request_id: clientRequestId,
      p_instrument_id: instrument.id,
      p_side: input.side,
      p_order_type: orderType,
      p_quantity: quantity,
      p_limit_price: orderType === 'limit' ? limitPrice : null,
      p_reference_price: referencePrice,
      p_reference_observed_at: referenceObservedAt,
      p_estimated_notional: evaluation.estimatedNotional,
      p_quote_currency: instrument.quote_currency,
      p_eligibility_status: evaluation.eligibilityStatus,
      p_disclosure_status: evaluation.disclosureStatus,
      p_suitability_status: evaluation.suitabilityStatus,
      p_reference_data_status: evaluation.referenceDataStatus,
      p_cost_breakdown: evaluation.costBreakdown,
      p_risk_summary: evaluation.riskSummary,
      p_block_reasons: evaluation.blockReasons,
      p_policy_version: control.policy_version,
      p_expires_at: expiresAt,
    },
  )
  if (reviewError || !review) return jsonResponse({ error: 'Unable to save regulated preflight evidence' }, 500)

  return jsonResponse({
    review: {
      ...review,
      symbol: instrument.display_symbol,
      instrumentName: instrument.name,
    },
    executable: false,
    submitted: false,
  })
}))
