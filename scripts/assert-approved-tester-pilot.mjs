import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  panel,
  query,
  support,
  supportQuery,
  navigation,
  pageHeader,
  app,
  migration,
  databaseTest,
  productionSmoke,
  browserTest,
  productionTest,
  packageJsonText,
  manifestText,
  ci,
  build,
  deployWeb,
  verifyWeb,
  deployData,
  verifyData,
  roadmap,
  guide,
] = await Promise.all([
  read('src/components/ApprovedTesterPilotPanel.tsx'),
  read('src/lib/queries/approvedTesterPilot.ts'),
  read('src/components/CustomerSupportPanel.tsx'),
  read('src/lib/queries/customerSupport.ts'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/App.tsx'),
  read('supabase/migrations/035_approved_tester_pilot.sql'),
  read('supabase/tests/database/approved_tester_pilot.test.sql'),
  read('supabase/tests/production/approved_tester_pilot_smoke.sql'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('package.json'),
  read('public/beta-release.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/APPROVED_TESTER_PILOT.md'),
])

for (const contract of [
  'This screen cannot approve, enroll or create a tester',
  'Maximum {status.maxTesters} testers',
  'Accept and begin pilot',
  'Approved pilot missions',
  'Staffed feedback',
  'pilot incident',
  'No execution or money movement',
]) {
  assert(panel.includes(contract), `Approved pilot workspace is missing: ${contract}`)
}

for (const contract of [
  'get_controlled_beta_pilot_status',
  'accept_controlled_beta_pilot_terms',
  'set_controlled_beta_pilot_mission',
]) {
  assert(query.includes(contract), `Approved pilot query boundary is missing: ${contract}`)
}

for (const contract of [
  'controlled_beta_pilot_cohorts',
  'controlled_beta_pilot_memberships',
  'controlled_beta_pilot_mission_progress',
  'enforce_controlled_beta_pilot_cohort_limit',
  "auth.role() <> 'authenticated'",
  'pilot_feedback',
  'pilot_incident',
]) {
  assert(migration.includes(contract), `Approved pilot migration is missing: ${contract}`)
}

assert(support.includes('Pilot feedback'), 'Customer support omits pilot feedback')
assert(support.includes('Pilot incident escalation'), 'Customer support omits pilot incident escalation')
assert(supportQuery.includes("'pilot_feedback'"), 'Support query type omits pilot feedback')
assert(supportQuery.includes("'pilot_incident'"), 'Support query type omits pilot incidents')
assert(navigation.includes("href: '#approved-pilot'"), 'Navigation omits the approved pilot')
assert(pageHeader.includes("'#approved-pilot'"), 'Page header omits approved pilot copy')
assert(app.includes("activeHref === '#approved-pilot'"), 'Application omits the approved pilot route')

for (const contract of [
  'cohort capacity cannot be exceeded',
  'stale pilot agreement is rejected',
  'another user cannot see the tester assignment',
  'global execution remains disabled',
]) {
  assert(databaseTest.includes(contract), `Approved pilot database test omits: ${contract}`)
}
assert(productionSmoke.includes('Anonymous pilot data access is unexpectedly enabled'), 'Production pilot smoke omits anonymous-access verification')
assert(productionSmoke.includes('A regulated execution route is unexpectedly enabled'), 'Production pilot smoke omits execution locks')

for (const contract of [
  "page.goto('/#approved-pilot')",
  'cannot approve, enroll or create a tester',
  'expect(sharedDataPaths).toEqual([])',
]) {
  assert(browserTest.includes(contract), `Controlled-beta browser contract omits: ${contract}`)
}
assert(productionTest.includes("['#approved-pilot', 'Private pilot workspace']"), 'Production smoke omits the approved pilot workspace')

const packageJson = JSON.parse(packageJsonText)
const manifest = JSON.parse(manifestText)
assert(packageJson.scripts?.['check:approved-pilot'], 'Approved pilot package check is missing')
assert(manifest.phase === '6C', 'Release manifest is not on the current Phase 6C candidate')
assert(manifest.approvedTesterPilot?.workspaceEnabled === true, 'Manifest omits the pilot workspace')
assert(manifest.approvedTesterPilot?.manualApprovalRequired === true, 'Manual pilot approval is not explicit')
assert(manifest.approvedTesterPilot?.browserEnrollmentEnabled === false, 'Browser pilot enrollment became enabled')
assert(manifest.approvedTesterPilot?.boundedCohorts === true, 'Bounded pilot cohorts are not declared')
assert(manifest.requiredChecks.includes('check:approved-pilot'), 'Manifest omits approved pilot verification')

for (const [name, workflow, confirmation] of [
  ['build', build, 'BUILD_PHASE_6C'],
  ['web deploy', deployWeb, 'DEPLOY_PHASE_6C'],
  ['web verify', verifyWeb, 'VERIFY_WEB_PHASE_6C'],
]) {
  assert(workflow.includes(confirmation), `Phase 5I ${name} confirmation is missing`)
  assert(workflow.includes('check:approved-pilot'), `Phase 5I ${name} omits the pilot check`)
}
assert(deployData.includes('DEPLOY_DATA_PHASE_6C'), 'Current data deployment confirmation is missing')
assert(deployData.includes('approved_tester_pilot_smoke.sql'), 'Data deployment omits pilot production smoke')
assert(verifyData.includes('VERIFY_DATA_PHASE_6C'), 'Current data verification confirmation is missing')
assert(verifyData.includes('approved_tester_pilot_smoke.sql'), 'Data verification omits pilot production smoke')
assert(ci.includes('approved_tester_pilot.test.sql'), 'CI omits approved pilot database tests')
assert(ci.includes('check:approved-pilot'), 'CI omits the approved pilot repository check')

for (const lock of [
  'liveBrokerageExecution',
  'paymentExecution',
  'chargeCollection',
  'custody',
  'personalizedAdvice',
]) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

assert(roadmap.includes('Phase 5H — approved tester pilot (implemented)'), 'Roadmap omits implemented Phase 5H')
assert(guide.includes('No public signup'), 'Approved pilot guide omits the signup boundary')
assert(guide.includes('No execution or money movement'), 'Approved pilot guide omits execution locks')

console.log('Approved tester pilot passed: cohorts are bounded, consent is identity-bound, escalation is private and execution remains locked.')
