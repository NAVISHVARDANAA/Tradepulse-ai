import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  access,
  accountSecurity,
  paperInvesting,
  browserTest,
  productionTest,
  manifestText,
  buildWorkflow,
  deployWorkflow,
  verifyWorkflow,
  roadmap,
  candidateDoc,
] = await Promise.all([
  read('src/lib/auth/controlledBetaAccess.ts'),
  read('src/components/AccountSecurityPanel.tsx'),
  read('src/components/PaperInvestingPanel.tsx'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('public/beta-release.json'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/BETA_RELEASE_CANDIDATE.md'),
])

for (const contract of [
  'shouldCreateUser: false',
  'email.trim().toLowerCase()',
  "authRedirectUrl(returnTarget)",
  'Access is invite-only.',
]) {
  assert(access.includes(contract), `Controlled-beta access boundary missing: ${contract}`)
}

for (const [name, component] of [
  ['Account Security', accountSecurity],
  ['Paper Investing', paperInvesting],
]) {
  assert(component.includes('requestControlledBetaSignIn'), `${name} bypasses the invite-only helper`)
  assert(component.includes('CONTROLLED_BETA_SIGN_IN_MESSAGE'), `${name} exposes inconsistent sign-in feedback`)
  assert(!component.includes('signInWithOtp'), `${name} can create a Supabase user directly`)
}

for (const [name, test] of [
  ['controlled-beta browser', browserTest],
  ['production browser', productionTest],
]) {
  assert(test.includes('Approved beta testers receive'), `${name} test omits invite-only customer copy`)
  assert(test.includes('Controlled-beta access is limited'), `${name} test omits account access copy`)
}

const manifest = JSON.parse(manifestText)
assert(manifest.access?.model === 'preprovisioned_invite_only', 'Beta manifest access model changed')
assert(manifest.access?.implicitSignupEnabled === false, 'Implicit controlled-beta signup is enabled')
assert(manifest.distribution?.externalInvitationsApproved === false, 'External invitations were approved in code')

for (const [name, workflow, confirmation] of [
  ['build', buildWorkflow, 'BUILD_PHASE_7C'],
  ['deploy', deployWorkflow, 'DEPLOY_PHASE_7C'],
  ['verify', verifyWorkflow, 'VERIFY_WEB_PHASE_7C'],
]) {
  assert(workflow.includes(confirmation), `Current ${name} confirmation is missing`)
  assert(workflow.includes('check:beta-access'), `Current ${name} omits the beta access contract`)
}

assert(roadmap.includes('Phase 5D — invite-only controlled-beta access'), 'Roadmap omits Phase 5D')
assert(candidateDoc.includes('pre-provisioned approved testers'), 'Candidate guide omits tester provisioning')

console.log('Controlled-beta access passed: implicit signup disabled and approved-user feedback is non-enumerating.')
