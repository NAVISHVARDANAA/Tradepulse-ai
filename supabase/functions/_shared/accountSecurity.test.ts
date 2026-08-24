import {
  normalizeAssuranceLevel,
  requiresMfaStepUp,
  verifiedFactorTypes,
} from './accountSecurity.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

Deno.test('only enrolled aal1 sessions require an MFA step-up', () => {
  assert(requiresMfaStepUp('aal1', 'aal2'), 'enrolled aal1 session was not gated')
  assert(!requiresMfaStepUp('aal1', 'aal1'), 'unenrolled session was incorrectly gated')
  assert(!requiresMfaStepUp('aal2', 'aal2'), 'verified session was incorrectly gated')
  assert(!requiresMfaStepUp(null, null), 'unknown session was incorrectly gated')
})

Deno.test('assurance levels fail closed to an unknown state', () => {
  assert(normalizeAssuranceLevel('aal1') === 'aal1', 'aal1 was not preserved')
  assert(normalizeAssuranceLevel('aal2') === 'aal2', 'aal2 was not preserved')
  assert(normalizeAssuranceLevel('future') === null, 'unknown assurance was trusted')
})

Deno.test('verified factor types exclude pending and unknown factors', () => {
  const types = verifiedFactorTypes([
    { factor_type: 'totp', status: 'verified' },
    { factor_type: 'totp', status: 'verified' },
    { factor_type: 'phone', status: 'unverified' },
    { factor_type: 'webauthn', status: 'verified' },
  ])

  assert(types.length === 1 && types[0] === 'totp', 'factor types were not minimized')
})
