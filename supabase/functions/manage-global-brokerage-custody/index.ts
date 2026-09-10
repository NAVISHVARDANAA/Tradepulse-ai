import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type OrchestrationRequest = {
  action?: 'initialize_case' | 'rehearse_evidence' | 'create_preview' | 'reconcile'
  clientCaseId?: string
  launchMatrixId?: number
  baseCurrency?: string
  onboardingCaseId?: string
  clientEvidenceId?: string
  requirementKey?: string
  clientPreviewId?: string
  listingId?: number
  side?: 'buy' | 'sell'
  orderType?: 'market' | 'limit'
  quantity?: number
  limitPrice?: number | null
  clientReconciliationId?: string
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const clientIdPattern = /^[A-Za-z0-9:_-]{8,100}$/
const requirementPattern = /^[a-z][a-z0-9_]{2,63}$/

function safeOrchestrationError(message: string) {
  if (message.includes('reused with different input')) return 'This request identifier was already used for different orchestration inputs.'
  if (message.includes('outside the blocked launch matrix')) return 'The selected listing does not belong to this exact launch matrix.'
  if (message.includes('Deterministic preview inputs')) return 'The deterministic price, FX, or cost scenario is unavailable.'
  if (message.includes('requirement')) return 'The selected onboarding requirement is unavailable.'
  if (message.includes('case') || message.includes('matrix')) return 'The blocked launch-matrix review case is unavailable or expired.'
  return 'The global brokerage and custody rehearsal could not be completed.'
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(observeEdgeHandler('global-brokerage-custody', async (request) => {
  if (request.method === 'OPTIONS') return corsPreflightResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request, { requireVerifiedMfaWhenEnrolled: true })
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: OrchestrationRequest
  try {
    input = await parseJsonBody<OrchestrationRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  let rpc: string
  let args: Record<string, unknown>

  if (input.action === 'initialize_case') {
    const clientCaseId = input.clientCaseId?.trim() ?? ''
    const launchMatrixId = Number(input.launchMatrixId)
    const baseCurrency = input.baseCurrency?.trim().toUpperCase() ?? ''
    if (
      !clientIdPattern.test(clientCaseId) ||
      !Number.isInteger(launchMatrixId) || launchMatrixId <= 0 ||
      !/^[A-Z]{3}$/.test(baseCurrency)
    ) return jsonResponse({ error: 'Invalid global brokerage case' }, 400)
    rpc = 'initialize_global_brokerage_case'
    args = {
      p_user_id: userContext.user.id,
      p_client_case_id: clientCaseId,
      p_launch_matrix_id: launchMatrixId,
      p_base_currency: baseCurrency,
    }
  } else if (input.action === 'rehearse_evidence') {
    const onboardingCaseId = input.onboardingCaseId?.trim() ?? ''
    const clientEvidenceId = input.clientEvidenceId?.trim() ?? ''
    const requirementKey = input.requirementKey?.trim() ?? ''
    if (
      !uuidPattern.test(onboardingCaseId) ||
      !clientIdPattern.test(clientEvidenceId) ||
      !requirementPattern.test(requirementKey)
    ) return jsonResponse({ error: 'Invalid evidence rehearsal' }, 400)
    const observedAt = new Date()
    const expiresAt = new Date(observedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    const evidenceDigest = await sha256([
      'phase-8d-evidence-rehearsal-v1', userContext.user.id,
      onboardingCaseId, clientEvidenceId, requirementKey,
    ].join(':'))
    rpc = 'record_global_brokerage_evidence_rehearsal'
    args = {
      p_user_id: userContext.user.id,
      p_onboarding_case_id: onboardingCaseId,
      p_client_evidence_id: clientEvidenceId,
      p_requirement_key: requirementKey,
      p_evidence_digest: evidenceDigest,
      p_observed_at: observedAt.toISOString(),
      p_expires_at: expiresAt.toISOString(),
    }
  } else if (input.action === 'create_preview') {
    const onboardingCaseId = input.onboardingCaseId?.trim() ?? ''
    const clientPreviewId = input.clientPreviewId?.trim() ?? ''
    const listingId = Number(input.listingId)
    const quantity = Number(input.quantity)
    const orderType = input.orderType
    const limitPrice = input.limitPrice == null ? null : Number(input.limitPrice)
    if (
      !uuidPattern.test(onboardingCaseId) ||
      !clientIdPattern.test(clientPreviewId) ||
      !Number.isInteger(listingId) || listingId <= 0 ||
      !input.side || !['buy', 'sell'].includes(input.side) ||
      !orderType || !['market', 'limit'].includes(orderType) ||
      !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 ||
      (orderType === 'limit' && (limitPrice === null || !Number.isFinite(limitPrice) || limitPrice <= 0)) ||
      (orderType === 'market' && limitPrice !== null)
    ) return jsonResponse({ error: 'Invalid global brokerage preview' }, 400)
    rpc = 'create_global_brokerage_order_preview'
    args = {
      p_user_id: userContext.user.id,
      p_onboarding_case_id: onboardingCaseId,
      p_client_preview_id: clientPreviewId,
      p_listing_id: listingId,
      p_side: input.side,
      p_order_type: orderType,
      p_quantity: quantity,
      p_limit_price: limitPrice,
    }
  } else if (input.action === 'reconcile') {
    const onboardingCaseId = input.onboardingCaseId?.trim() ?? ''
    const clientReconciliationId = input.clientReconciliationId?.trim() ?? ''
    if (!uuidPattern.test(onboardingCaseId) || !clientIdPattern.test(clientReconciliationId)) {
      return jsonResponse({ error: 'Invalid global brokerage reconciliation' }, 400)
    }
    rpc = 'reconcile_global_brokerage_case'
    args = {
      p_user_id: userContext.user.id,
      p_onboarding_case_id: onboardingCaseId,
      p_client_reconciliation_id: clientReconciliationId,
    }
  } else {
    return jsonResponse({ error: 'Unsupported global brokerage orchestration action' }, 400)
  }

  const { data, error } = await userContext.admin.rpc(rpc, args)
  if (error) return jsonResponse({ error: safeOrchestrationError(error.message) }, 409)
  return jsonResponse({
    result: data,
    activationStatus: 'blocked',
    executable: false,
    custodyEnabled: false,
    crossBorderFundingLinked: false,
  })
}))
