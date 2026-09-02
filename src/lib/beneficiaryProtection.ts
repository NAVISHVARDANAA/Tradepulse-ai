import type { BeneficiaryProtectionRule } from '../types/domain'

export type BeneficiaryProtectionDecision =
  | 'clear_rehearsal'
  | 'manual_review'
  | 'cooling_off'
  | 'blocked'

export type BeneficiaryProtectionResult = {
  decision: BeneficiaryProtectionDecision
  coolingOffHours: number
  matchedRules: BeneficiaryProtectionRule[]
  summary: string
}

const decisionRank: Record<BeneficiaryProtectionDecision, number> = {
  clear_rehearsal: 0,
  manual_review: 1,
  cooling_off: 2,
  blocked: 3,
}

const decisionSummary: Record<BeneficiaryProtectionDecision, string> = {
  clear_rehearsal: 'No selected synthetic signal triggered a protection rule. This rehearsal still cannot create or pay a beneficiary.',
  manual_review: 'The synthetic signals require human review. No override is available in this workspace.',
  cooling_off: 'The synthetic signals require a mandatory protection pause before any future review could continue.',
  blocked: 'The synthetic signals require the beneficiary flow to stop. No continuation path is available here.',
}

export function evaluateBeneficiaryProtection(
  signals: string[],
  rules: BeneficiaryProtectionRule[],
): BeneficiaryProtectionResult {
  const selected = new Set(signals)
  const matchedRules = rules
    .filter((rule) => selected.has(rule.signalKey))
    .sort((a, b) => a.priority - b.priority)

  const decision = matchedRules.reduce<BeneficiaryProtectionDecision>(
    (current, rule) => decisionRank[rule.outcome] > decisionRank[current]
      ? rule.outcome
      : current,
    'clear_rehearsal',
  )
  const maximumCoolingOffHours = matchedRules.reduce(
    (hours, rule) => Math.max(hours, rule.coolingOffHours),
    0,
  )

  return {
    decision,
    coolingOffHours: decision === 'cooling_off' ? maximumCoolingOffHours : 0,
    matchedRules,
    summary: decisionSummary[decision],
  }
}
