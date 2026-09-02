import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  migration,
  edge,
  helper,
  helperTest,
  query,
  panel,
  app,
  navigation,
  header,
  styles,
  databaseTest,
  productionSmoke,
  browserTest,
  productionBrowserTest,
  manifestText,
  packageText,
  ci,
  deployData,
  verifyData,
  buildWeb,
  deployWeb,
  verifyWeb,
  roadmap,
  guide,
] = await Promise.all([
  read('supabase/migrations/036_regulated_preflight.sql'),
  read('supabase/functions/evaluate-regulated-preflight/index.ts'),
  read('supabase/functions/_shared/regulatedPreflight.ts'),
  read('supabase/functions/_shared/regulatedPreflight.test.ts'),
  read('src/lib/queries/regulatedPreflight.ts'),
  read('src/components/RegulatedPreflightPanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('supabase/tests/database/regulated_preflight.test.sql'),
  read('supabase/tests/production/regulated_preflight_smoke.sql'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('public/beta-release.json'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/REGULATED_PREFLIGHT.md'),
])

for (const contract of [
  'brokerage_preflight_controls',
  'brokerage_preflight_reviews',
  'check (not order_submission_enabled)',
  "check (review_status = 'blocked')",
  'check (not executable)',
  "market_session_status = 'not_verified'",
  "cost_status = 'unavailable'",
  "risk_status = 'review_required'",
  'persist_regulated_preflight_review',
  "auth.role() <> 'service_role'",
]) assert(migration.includes(contract), `Migration omits preflight boundary: ${contract}`)

for (const contract of [
  "requireUser(request, { requireVerifiedMfaWhenEnrolled: true })",
  'evaluateRegulatedPreflight',
  'instrument_eligibility',
  'brokerage_consents',
  'market_observations',
  'persist_regulated_preflight_review',
  'executable: false',
  'submitted: false',
]) assert(edge.includes(contract), `Edge evaluator omits: ${contract}`)

for (const contract of [
  'GLOBAL_EXECUTION_DISABLED',
  'MARKET_SESSION_NOT_VERIFIED',
  'TOTAL_COST_UNAVAILABLE',
  'RISK_CAPACITY_REVIEW_REQUIRED',
  "costStatus: 'unavailable'",
  "riskStatus: 'review_required'",
  'executable: false',
]) assert(helper.includes(contract), `Evaluation helper omits: ${contract}`)
assert(helperTest.includes('never makes a regulated preflight executable'), 'Fail-closed helper test is missing')

for (const contract of [
  'RegulatedPreflightWorkspace',
  'evaluate-regulated-preflight',
  'brokerage_preflight_reviews',
]) assert(query.includes(contract), `Web query omits: ${contract}`)

for (const contract of [
  'Jurisdiction eligibility',
  'Current disclosures',
  'Suitability',
  'Market state',
  'Total cost',
  'Risk preview',
  'No order submission',
  'No order was created, submitted or routed',
]) assert(panel.includes(contract), `Preflight workspace omits: ${contract}`)
assert(navigation.includes("href: '#regulated-preflight'"), 'Navigation omits regulated preflight')
assert(header.includes("'#regulated-preflight'"), 'Page header omits regulated preflight')
assert(app.includes("activeHref === '#regulated-preflight'"), 'Application omits regulated preflight route')
assert(styles.includes('.regulated-preflight-panel'), 'Preflight styles are missing')
assert(databaseTest.includes('select plan(40)'), 'Database contract count changed')
assert(productionSmoke.includes('A live brokerage order path unexpectedly exists'), 'Production order-path guard is missing')
assert(browserTest.includes("page.goto('/#regulated-preflight')"), 'Browser boundary omits preflight')
assert(productionBrowserTest.includes("['#regulated-preflight', 'Preflight evidence review']"), 'Production workspace smoke omits preflight')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
assert(manifest.phase === '7A', 'Release manifest is not on the current Phase 7A candidate')
assert(manifest.regulatedPreflight?.workspaceEnabled === true, 'Manifest omits preflight workspace')
assert(manifest.regulatedPreflight?.orderSubmissionEnabled === false, 'Manifest enabled order submission')
assert(manifest.regulatedPreflight?.marketSessionVerificationEnabled === false, 'Manifest inferred market sessions')
assert(manifest.regulatedPreflight?.completeCostAvailable === false, 'Manifest claims complete costs')
assert(manifest.regulatedPreflight?.automatedRiskApprovalEnabled === false, 'Manifest enabled automated risk approval')
assert(manifest.requiredChecks.includes('check:regulated-preflight'), 'Manifest omits preflight check')
assert(packageJson.scripts?.['check:regulated-preflight'], 'Package preflight check is missing')

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_7A'],
  [verifyData, 'VERIFY_DATA_PHASE_7A'],
  [buildWeb, 'BUILD_PHASE_7A'],
  [deployWeb, 'DEPLOY_PHASE_7A'],
  [verifyWeb, 'VERIFY_WEB_PHASE_7A'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)

for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:regulated-preflight'), 'A web gate omits the preflight repository check')
}
assert(ci.includes('regulated_preflight.test.sql'), 'CI omits the preflight database test')
assert(ci.includes('regulatedPreflight.test.ts'), 'CI omits the preflight helper test')
assert(deployData.includes('evaluate-regulated-preflight'), 'Data deployment omits the preflight Edge Function')
assert(verifyData.includes('regulated_preflight_smoke.sql'), 'Data verification omits the preflight production smoke')
assert(roadmap.includes('Phase 6A — regulated preflight (implemented)'), 'Roadmap omits implemented Phase 6A')
assert(guide.includes('Unknown fees, taxes or FX charges stay unavailable'), 'Operating guide omits the unknown-cost boundary')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Regulated preflight passed: six evidence dimensions remain private, blocked and non-executable.')
