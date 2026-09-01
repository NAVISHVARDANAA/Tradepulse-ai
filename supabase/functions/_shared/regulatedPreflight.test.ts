import { evaluateRegulatedPreflight } from './regulatedPreflight.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const baseInput = {
  verifiedResidencyCountry: 'US',
  kycStatus: 'verified',
  sanctionsStatus: 'clear',
  suitabilityStatus: 'suitable' as const,
  jurisdictionInvestingEnabled: true,
  instrumentEligibility: 'allowed' as const,
  disclosuresComplete: true,
  connectedSandboxAccount: true,
  instrumentExecutionEnabled: false,
  globalExecutionEnabled: false,
  marketSessionVerificationEnabled: false,
  feeScheduleEnabled: false,
  riskCapacityApprovalEnabled: false,
  referencePrice: 100,
  referenceObservedAt: '2026-08-31T12:00:00.000Z',
  orderPrice: 100,
  quantity: 2,
  limitPrice: null,
  quoteCurrency: 'USD',
}

Deno.test('an explicit policy match never makes a regulated preflight executable', () => {
  const result = evaluateRegulatedPreflight(baseInput, Date.parse('2026-08-31T12:05:00.000Z'))
  assert(result.eligibilityStatus === 'policy_match', 'explicit eligibility policy was not recognized')
  assert(result.referenceDataStatus === 'current', 'current reference was not recognized')
  assert(result.reviewStatus === 'blocked' && result.executable === false, 'preflight became executable')
  assert(result.blockReasons.some((item) => item.code === 'GLOBAL_EXECUTION_DISABLED'), 'global lock is missing')
  assert(result.costBreakdown.totalCost === null, 'unknown cost was represented as zero')
})

Deno.test('missing residency fails closed without claiming eligibility', () => {
  const result = evaluateRegulatedPreflight(
    { ...baseInput, verifiedResidencyCountry: null, instrumentEligibility: null },
    Date.parse('2026-08-31T12:05:00.000Z'),
  )
  assert(result.eligibilityStatus === 'not_verified', 'missing residency did not fail closed')
  assert(result.blockReasons.some((item) => item.code === 'RESIDENCY_NOT_VERIFIED'), 'residency blocker is missing')
})

Deno.test('stale reference evidence is distinct from market session state', () => {
  const result = evaluateRegulatedPreflight(baseInput, Date.parse('2026-08-31T13:00:00.000Z'))
  assert(result.referenceDataStatus === 'stale', 'stale reference was treated as current')
  assert(result.marketSessionStatus === 'not_verified', 'market session was inferred from a quote')
  assert(result.blockReasons.some((item) => item.code === 'REFERENCE_DATA_STALE'), 'stale blocker is missing')
})

Deno.test('future-dated reference evidence fails closed', () => {
  const result = evaluateRegulatedPreflight(
    { ...baseInput, referenceObservedAt: '2026-08-31T12:10:00.000Z' },
    Date.parse('2026-08-31T12:05:00.000Z'),
  )
  assert(result.referenceDataStatus === 'unavailable', 'future evidence was treated as current')
  assert(
    result.blockReasons.some((item) => item.code === 'REFERENCE_DATA_UNAVAILABLE'),
    'future evidence did not fail closed',
  )
})

Deno.test('limit distance and maximum exposure are transparent risk evidence', () => {
  const result = evaluateRegulatedPreflight(
    { ...baseInput, orderPrice: 105, limitPrice: 105, quantity: 3 },
    Date.parse('2026-08-31T12:05:00.000Z'),
  )
  assert(result.estimatedNotional === 315, 'notional was not calculated')
  assert(result.riskSummary.maximumOrderValue === 315, 'maximum order value is missing')
  assert(result.riskSummary.limitDistancePercent === 5, 'limit distance is incorrect')
  assert(result.riskStatus === 'review_required', 'calculation incorrectly approved risk capacity')
})
