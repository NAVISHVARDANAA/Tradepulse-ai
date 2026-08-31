export type PreflightBlockOwner =
  | 'user'
  | 'tradepulse'
  | 'broker'
  | 'compliance'
  | 'market_data'

export type PreflightBlockReason = {
  code: string
  message: string
  owner: PreflightBlockOwner
}

export type PreflightEvaluationInput = {
  verifiedResidencyCountry: string | null
  kycStatus: string | null
  sanctionsStatus: string | null
  suitabilityStatus: 'not_assessed' | 'pending' | 'suitable' | 'restricted' | null
  jurisdictionInvestingEnabled: boolean
  instrumentEligibility: 'allowed' | 'restricted' | 'blocked' | 'review_required' | null
  disclosuresComplete: boolean
  connectedSandboxAccount: boolean
  instrumentExecutionEnabled: boolean
  globalExecutionEnabled: boolean
  marketSessionVerificationEnabled: boolean
  feeScheduleEnabled: boolean
  riskCapacityApprovalEnabled: boolean
  referencePrice: number | null
  referenceObservedAt: string | null
  orderPrice: number | null
  quantity: number
  limitPrice: number | null
  quoteCurrency: string
}

const MAX_REFERENCE_AGE_MS = 15 * 60 * 1000

function reason(
  code: string,
  message: string,
  owner: PreflightBlockOwner,
): PreflightBlockReason {
  return { code, message, owner }
}

function rounded(value: number | null, digits = 8) {
  if (value === null || !Number.isFinite(value)) return null
  return Number(value.toFixed(digits))
}

export function evaluateRegulatedPreflight(
  input: PreflightEvaluationInput,
  now = Date.now(),
) {
  const reasons: PreflightBlockReason[] = []

  if (!input.globalExecutionEnabled) {
    reasons.push(reason(
      'GLOBAL_EXECUTION_DISABLED',
      'Live order routing is globally disabled until separately reviewed launch approvals are recorded.',
      'tradepulse',
    ))
  }

  let eligibilityStatus: 'not_verified' | 'review_required' | 'policy_match' | 'blocked'
  if (!input.verifiedResidencyCountry) {
    eligibilityStatus = 'not_verified'
    reasons.push(reason('RESIDENCY_NOT_VERIFIED', 'Verified residency is required for an eligibility review.', 'compliance'))
  } else if (
    input.instrumentEligibility === 'blocked'
    || input.instrumentEligibility === 'restricted'
    || input.sanctionsStatus === 'blocked'
  ) {
    eligibilityStatus = 'blocked'
    reasons.push(reason('ELIGIBILITY_BLOCKED', 'A compliance-managed eligibility control blocks this instrument.', 'compliance'))
  } else if (
    input.kycStatus === 'verified'
    && input.sanctionsStatus === 'clear'
    && input.jurisdictionInvestingEnabled
    && input.instrumentEligibility === 'allowed'
  ) {
    eligibilityStatus = 'policy_match'
  } else {
    eligibilityStatus = 'review_required'
    reasons.push(reason('ELIGIBILITY_REVIEW_REQUIRED', 'Identity, sanctions, jurisdiction or instrument policy still requires review.', 'compliance'))
  }

  const suitabilityStatus = input.suitabilityStatus ?? 'not_assessed'
  if (suitabilityStatus !== 'suitable') {
    reasons.push(reason('SUITABILITY_NOT_APPROVED', 'Suitability has not been approved for regulated investing.', 'compliance'))
  }

  const disclosureStatus = input.disclosuresComplete ? 'complete' : 'incomplete'
  if (!input.disclosuresComplete) {
    reasons.push(reason('DISCLOSURES_INCOMPLETE', 'Current required disclosures have not all been accepted.', 'user'))
  }

  const observedAtMs = input.referenceObservedAt
    ? new Date(input.referenceObservedAt).getTime()
    : Number.NaN
  const referenceAgeMs = Number.isFinite(observedAtMs) && observedAtMs <= now
    ? now - observedAtMs
    : null
  const referenceDataStatus = input.referencePrice === null || referenceAgeMs === null
    ? 'unavailable'
    : referenceAgeMs <= MAX_REFERENCE_AGE_MS
      ? 'current'
      : 'stale'

  if (referenceDataStatus !== 'current') {
    reasons.push(reason(
      referenceDataStatus === 'stale' ? 'REFERENCE_DATA_STALE' : 'REFERENCE_DATA_UNAVAILABLE',
      referenceDataStatus === 'stale'
        ? 'The latest verified reference is older than the preflight freshness limit.'
        : 'A verified reference price is unavailable.',
      'market_data',
    ))
  }

  if (!input.marketSessionVerificationEnabled) {
    reasons.push(reason(
      'MARKET_SESSION_NOT_VERIFIED',
      'A reference price does not prove that an executable market session is open.',
      'market_data',
    ))
  }

  if (!input.feeScheduleEnabled) {
    reasons.push(reason(
      'TOTAL_COST_UNAVAILABLE',
      'Approved broker fees, taxes and foreign-exchange schedules are not configured.',
      'broker',
    ))
  }

  if (!input.riskCapacityApprovalEnabled) {
    reasons.push(reason(
      'RISK_CAPACITY_REVIEW_REQUIRED',
      'Loss capacity, liquidity needs and position impact require a regulated review.',
      'compliance',
    ))
  }

  if (!input.connectedSandboxAccount) {
    reasons.push(reason('BROKER_ACCOUNT_NOT_CONNECTED', 'No approved sandbox brokerage account is connected.', 'broker'))
  }
  if (!input.instrumentExecutionEnabled) {
    reasons.push(reason('INSTRUMENT_EXECUTION_DISABLED', 'This instrument is not enabled for live execution.', 'tradepulse'))
  }

  const estimatedNotional = input.orderPrice === null
    ? null
    : rounded(input.orderPrice * input.quantity)
  const limitDistancePercent = input.limitPrice !== null && input.referencePrice !== null
    ? rounded(((input.limitPrice - input.referencePrice) / input.referencePrice) * 100, 4)
    : null

  return {
    eligibilityStatus,
    disclosureStatus,
    suitabilityStatus,
    marketSessionStatus: 'not_verified' as const,
    referenceDataStatus,
    costStatus: 'unavailable' as const,
    costBreakdown: {
      currency: input.quoteCurrency,
      referenceNotional: estimatedNotional,
      brokerFee: null,
      platformFee: null,
      taxes: null,
      foreignExchangeCost: null,
      totalCost: null,
      reason: 'Approved provider fee, tax and FX schedules are not configured.',
    },
    riskStatus: 'review_required' as const,
    riskSummary: {
      maximumOrderValue: estimatedNotional,
      limitDistancePercent,
      lossCapacityStatus: 'review_required',
      concentrationStatus: 'unavailable',
      portfolioImpactStatus: 'unavailable',
    },
    reviewStatus: 'blocked' as const,
    executable: false as const,
    blockReasons: reasons,
    estimatedNotional,
  }
}
