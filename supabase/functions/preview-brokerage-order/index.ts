import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'

type PreviewRequest = {
  instrumentId?: number
  side?: 'buy' | 'sell'
  orderType?: 'market' | 'limit'
  quantity?: number
  limitPrice?: number | null
  clientRequestId?: string
}

type BlockReason = {
  code: string
  message: string
  owner: 'user' | 'tradepulse' | 'broker' | 'compliance' | 'market_data'
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_REFERENCE_AGE_MS = 24 * 60 * 60 * 1000

function reason(
  code: string,
  message: string,
  owner: BlockReason['owner'],
): BlockReason {
  return { code, message, owner }
}

function numeric(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request)
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: PreviewRequest
  try {
    input = await parseJsonBody<PreviewRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const instrumentId = Number(input.instrumentId)
  const quantity = Number(input.quantity)
  const limitPrice = input.limitPrice === null || input.limitPrice === undefined
    ? null
    : Number(input.limitPrice)
  const orderType = input.orderType ?? 'market'
  const clientRequestId = input.clientRequestId ?? ''

  if (
    !Number.isInteger(instrumentId) ||
    instrumentId <= 0 ||
    !['buy', 'sell'].includes(input.side ?? '') ||
    !['market', 'limit'].includes(orderType) ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 1_000_000 ||
    (orderType === 'limit' && (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0)) ||
    !UUID_PATTERN.test(clientRequestId)
  ) {
    return jsonResponse({ error: 'Invalid brokerage preview details' }, 400)
  }

  const admin = userContext.admin
  const { data: existing, error: existingError } = await admin
    .from('brokerage_order_previews')
    .select('*')
    .eq('user_id', userContext.user.id)
    .eq('client_request_id', clientRequestId)
    .maybeSingle()

  if (existingError) {
    return jsonResponse({ error: 'Unable to check preview idempotency' }, 500)
  }
  if (existing) {
    return jsonResponse({ preview: existing, executable: false, idempotent: true })
  }

  const [instrumentResult, investorResult, controlResult, accountResult, disclosureResult, consentResult] = await Promise.all([
    admin
      .from('investment_instruments')
      .select('id, display_symbol, name, asset_class, market_asset_id, quote_currency, live_execution_enabled')
      .eq('id', instrumentId)
      .eq('research_enabled', true)
      .maybeSingle(),
    admin
      .from('user_investor_profiles')
      .select('verified_residency_country, kyc_status, suitability_status, sanctions_status, onboarding_state')
      .eq('user_id', userContext.user.id)
      .maybeSingle(),
    admin
      .from('brokerage_execution_controls')
      .select('execution_enabled, preview_enabled, policy_version')
      .eq('control_key', 'global-live-orders')
      .single(),
    admin
      .from('brokerage_accounts')
      .select('id')
      .eq('user_id', userContext.user.id)
      .eq('connection_status', 'connected')
      .eq('environment', 'sandbox')
      .limit(1),
    admin
      .from('brokerage_disclosures')
      .select('id, version')
      .eq('required', true)
      .eq('published', true)
      .lte('effective_at', new Date().toISOString())
      .or(`superseded_at.is.null,superseded_at.gt.${new Date().toISOString()}`),
    admin
      .from('brokerage_consents')
      .select('disclosure_id, disclosure_version')
      .eq('user_id', userContext.user.id)
      .is('revoked_at', null),
  ])

  const firstError = [
    instrumentResult.error,
    investorResult.error,
    controlResult.error,
    accountResult.error,
    disclosureResult.error,
    consentResult.error,
  ].find(Boolean)

  if (firstError) {
    return jsonResponse({ error: 'Unable to evaluate brokerage readiness' }, 500)
  }

  const instrument = instrumentResult.data
  const control = controlResult.data
  if (!instrument || !control?.preview_enabled) {
    return jsonResponse({ error: 'Brokerage preview is unavailable for this instrument' }, 409)
  }

  let referencePrice: number | null = null
  let referenceObservedAt: string | null = null
  if (instrument.market_asset_id) {
    const { data: observation, error: observationError } = await admin
      .from('market_observations')
      .select('price, observed_at')
      .eq('asset_id', instrument.market_asset_id)
      .not('price', 'is', null)
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!observationError && observation) {
      referencePrice = numeric(observation.price)
      referenceObservedAt = observation.observed_at
    }
  }

  const reasons: BlockReason[] = [
    reason(
      'GLOBAL_EXECUTION_DISABLED',
      'TradePulse live order routing is globally disabled until all regulated-launch approvals are recorded.',
      'tradepulse',
    ),
  ]
  const investor = investorResult.data

  if (!investor?.verified_residency_country) {
    reasons.push(reason('RESIDENCY_NOT_VERIFIED', 'Verified investor residency is required.', 'compliance'))
  }
  if (investor?.kyc_status !== 'verified') {
    reasons.push(reason('KYC_NOT_VERIFIED', 'Identity verification is not complete.', 'compliance'))
  }
  if (investor?.sanctions_status !== 'clear') {
    reasons.push(reason('SANCTIONS_NOT_CLEAR', 'Sanctions screening is not clear and current.', 'compliance'))
  }
  if (investor?.suitability_status !== 'suitable') {
    reasons.push(reason('SUITABILITY_NOT_APPROVED', 'Suitability has not been approved for live investing.', 'compliance'))
  }
  if (investor?.onboarding_state !== 'execution_ready') {
    reasons.push(reason('EXECUTION_ONBOARDING_INCOMPLETE', 'Regulated execution onboarding is incomplete.', 'compliance'))
  }
  if ((accountResult.data ?? []).length === 0) {
    reasons.push(reason('BROKER_ACCOUNT_NOT_CONNECTED', 'No approved broker sandbox account is connected.', 'broker'))
  }

  const consentByDisclosure = new Map(
    (consentResult.data ?? []).map((item) => [item.disclosure_id, item.disclosure_version]),
  )
  const missingDisclosures = (disclosureResult.data ?? []).filter(
    (item) => consentByDisclosure.get(item.id) !== item.version,
  )
  if (missingDisclosures.length > 0) {
    reasons.push(reason('DISCLOSURES_NOT_ACCEPTED', `${missingDisclosures.length} required disclosure(s) remain unaccepted.`, 'user'))
  }
  if (!instrument.live_execution_enabled) {
    reasons.push(reason('INSTRUMENT_EXECUTION_DISABLED', 'This instrument is not enabled for live execution.', 'tradepulse'))
  }

  const referenceAge = referenceObservedAt
    ? Date.now() - new Date(referenceObservedAt).getTime()
    : Number.POSITIVE_INFINITY
  if (!referencePrice || referenceAge > MAX_REFERENCE_AGE_MS) {
    reasons.push(reason('REFERENCE_PRICE_UNAVAILABLE', 'A sufficiently fresh verified reference price is unavailable.', 'market_data'))
  }

  const previewPrice = orderType === 'limit' ? Number(limitPrice) : referencePrice
  const estimatedNotional = previewPrice ? previewPrice * quantity : null
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { data: preview, error: previewError } = await admin.rpc(
    'persist_brokerage_order_preview',
    {
      p_user_id: userContext.user.id,
      p_client_request_id: clientRequestId,
      p_brokerage_account_id: accountResult.data?.[0]?.id ?? null,
      p_instrument_id: instrument.id,
      p_side: input.side,
      p_order_type: orderType,
      p_quantity: quantity,
      p_limit_price: orderType === 'limit' ? limitPrice : null,
      p_reference_price: referencePrice,
      p_estimated_notional: estimatedNotional,
      p_quote_currency: instrument.quote_currency,
      p_block_reasons: reasons,
      p_policy_version: control.policy_version,
      p_reference_observed_at: referenceObservedAt,
      p_expires_at: expiresAt,
    },
  )

  if (previewError || !preview) {
    return jsonResponse({ error: 'Unable to save brokerage preview' }, 500)
  }

  return jsonResponse({
    preview: {
      ...preview,
      symbol: instrument.display_symbol,
      instrumentName: instrument.name,
    },
    executable: false,
    disclaimer: 'Readiness preview only. No order was created, routed, or sent to a broker.',
  })
})
