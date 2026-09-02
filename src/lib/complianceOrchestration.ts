import type { PaymentComplianceRequirement } from '../types/domain'

export type PaymentCustomerType = 'individual' | 'business'
export type ComplianceOrchestrationDecision = 'unavailable' | 'review_required' | 'blocked'

export type ComplianceOrchestrationResult = {
  decision: ComplianceOrchestrationDecision
  requirements: PaymentComplianceRequirement[]
  mappedStageCount: number
  requiredStageCount: number
  summary: string
}

const sharedStages: PaymentComplianceRequirement['stageKey'][] = [
  'aml',
  'sanctions',
  'transaction_monitoring',
  'travel_rule',
  'audit',
]

export function buildComplianceOrchestration(
  requirements: PaymentComplianceRequirement[],
  customerType: PaymentCustomerType,
): ComplianceOrchestrationResult {
  const expectedStages: PaymentComplianceRequirement['stageKey'][] = [
    customerType === 'individual' ? 'kyc' : 'kyb',
    ...sharedStages,
  ]
  const expected = new Set(expectedStages)
  const applicable = requirements
    .filter((requirement) => (
      (requirement.customerType === customerType || requirement.customerType === 'both')
      && expected.has(requirement.stageKey)
    ))
    .sort((left, right) => left.priority - right.priority)
  const mappedStages = new Set(applicable.map((requirement) => requirement.stageKey))
  const complete = expectedStages.every((stage) => mappedStages.has(stage))

  if (!complete) {
    return {
      decision: 'unavailable',
      requirements: applicable,
      mappedStageCount: mappedStages.size,
      requiredStageCount: expectedStages.length,
      summary: 'The synthetic corridor map is incomplete. No compliance outcome or payment path is available.',
    }
  }

  const decision: ComplianceOrchestrationDecision = applicable.some((requirement) => requirement.outcome === 'blocked')
    ? 'blocked'
    : 'review_required'

  return {
    decision,
    requirements: applicable,
    mappedStageCount: mappedStages.size,
    requiredStageCount: expectedStages.length,
    summary: decision === 'blocked'
      ? 'Compliance activation is blocked. Live screening, case review and travel-rule transmission are unavailable.'
      : 'Every mapped stage still requires licensed human review. This rehearsal cannot clear a customer or payment.',
  }
}
