import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  migration, query, panel, app, navigation, header, styles, databaseTest,
  productionSmoke, browserTest, productionBrowserTest, manifestText, packageText,
  ci, deployData, verifyData, buildWeb, deployWeb, verifyWeb, roadmap, guide,
] = await Promise.all([
  read('supabase/migrations/039_live_trading_readiness.sql'),
  read('src/lib/queries/liveTradingReadiness.ts'),
  read('src/components/LiveTradingReadinessPanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('supabase/tests/database/live_trading_readiness.test.sql'),
  read('supabase/tests/production/live_trading_readiness_smoke.sql'),
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
  read('docs/LIVE_TRADING_READINESS.md'),
])

for (const contract of [
  'live_trading_activation_controls',
  'live_trading_activation_requirements',
  'live_trading_approval_evidence',
  'live_trading_readiness_requirements',
  'live_trading_readiness_summary',
  'persist_live_trading_approval_evidence',
  'evidence_sequence bigint generated always as identity',
  'check (activation_status = \'blocked\')',
  'check (not live_order_routing_enabled)',
  'check (not browser_order_submission_enabled)',
  'check (not automatic_activation_enabled)',
  'check (not customer_funding_enabled)',
  'check (not custody_enabled)',
  'check (not settlement_enabled)',
  'check (not kill_switch_activation_enabled)',
  'Live trading approval evidence is append-only',
  "auth.role() <> 'service_role'",
]) assert(migration.includes(contract), `Live readiness migration omits: ${contract}`)

for (const contract of [
  'LiveTradingReadinessWorkspace',
  'live_trading_readiness_summary',
  'live_trading_readiness_requirements',
]) assert(query.includes(contract), `Live readiness query omits: ${contract}`)

for (const contract of [
  'Written evidence before any future activation',
  'No live route',
  'Even complete evidence cannot activate trading',
  'No live order endpoint exists in this phase',
  'Read-only governance workspace',
]) assert(panel.includes(contract), `Live readiness workspace omits: ${contract}`)

assert(navigation.includes("href: '#live-readiness'"), 'Navigation omits live readiness')
assert(header.includes("'#live-readiness'"), 'Page header omits live readiness')
assert(app.includes("activeHref === '#live-readiness'"), 'Application omits live readiness route')
assert(styles.includes('.live-readiness-panel'), 'Live readiness styles are missing')
assert(databaseTest.includes('select plan(54)'), 'Live readiness database contract count changed')
assert(productionSmoke.includes('A production execution or money-movement path unexpectedly exists'), 'Production execution guard is missing')
assert(browserTest.includes("page.goto('/#live-readiness')"), 'Browser boundary omits live readiness')
assert(productionBrowserTest.includes("['#live-readiness', 'Live trading readiness']"), 'Production workspace smoke omits live readiness')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
assert(manifest.phase === '7C', 'Release manifest is not Phase 7C')
assert(manifest.status === 'compliance_orchestration_candidate', 'Release status is not the current compliance orchestration candidate')
for (const [key, expected] of Object.entries({
  workspaceEnabled: true,
  requirementCount: 18,
  publicSanitizedRequirementLedger: true,
  appendOnlyApprovalEvidence: true,
  rawApprovalDocumentsStored: false,
  manualActivationReviewRequired: true,
  automaticActivationEnabled: false,
  browserOrderSubmissionEnabled: false,
  liveOrderRoutingEnabled: false,
  customerFundingEnabled: false,
  custodyEnabled: false,
  settlementEnabled: false,
  killSwitchActivationEnabled: false,
})) assert(manifest.liveTradingReadiness?.[key] === expected, `Manifest live readiness mismatch: ${key}`)
assert(manifest.requiredChecks.includes('check:live-readiness'), 'Manifest omits live readiness check')
assert(packageJson.scripts?.['check:live-readiness'], 'Package live readiness check is missing')

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_7C'],
  [verifyData, 'VERIFY_DATA_PHASE_7C'],
  [buildWeb, 'BUILD_PHASE_7C'],
  [deployWeb, 'DEPLOY_PHASE_7C'],
  [verifyWeb, 'VERIFY_WEB_PHASE_7C'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:live-readiness'), 'A web gate omits live readiness')
}
assert(ci.includes('live_trading_readiness.test.sql'), 'CI omits live readiness database test')
assert(deployData.includes('live_trading_readiness_smoke.sql'), 'Data deploy omits live readiness smoke')
assert(verifyData.includes('live_trading_readiness_smoke.sql'), 'Data verification omits live readiness smoke')
assert(roadmap.includes('Phase 6C — controlled live-trading readiness (implemented foundation)'), 'Roadmap omits Phase 6C readiness foundation')
assert(guide.includes('No activation mechanism'), 'Operating guide omits the activation boundary')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Live trading readiness passed: written evidence is visible while every production activation path remains blocked.')
