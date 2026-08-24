export type AssuranceLevel = 'aal1' | 'aal2' | null

export function normalizeAssuranceLevel(
  value: string | null | undefined,
): AssuranceLevel {
  return value === 'aal1' || value === 'aal2' ? value : null
}

export function requiresMfaStepUp(
  currentLevel: AssuranceLevel,
  nextLevel: AssuranceLevel,
) {
  return currentLevel === 'aal1' && nextLevel === 'aal2'
}

export function verifiedFactorTypes(
  factors: Array<{ factor_type?: string; status?: string }>,
) {
  return [...new Set(
    factors
      .filter((factor) => factor.status === 'verified')
      .map((factor) => factor.factor_type)
      .filter((factorType): factorType is 'totp' | 'phone' =>
        factorType === 'totp' || factorType === 'phone'
      ),
  )].sort()
}
