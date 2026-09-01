import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  migration, orderingHotfix, adapter, adapterTest, edge, query, panel, app, navigation, header,
  styles, databaseTest, productionSmoke, browserTest, productionBrowserTest,
  manifestText, packageText, config, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, roadmap, guide,
] = await Promise.all([
  read('supabase/migrations/037_sandbox_order_lifecycle.sql'),
  read('supabase/migrations/038_deterministic_sandbox_lifecycle_order.sql'),
  read('supabase/functions/_shared/alpacaSandboxOrders.ts'),
  read('supabase/functions/_shared/alpacaSandboxOrders.test.ts'),
  read('supabase/functions/manage-alpaca-sandbox-order/index.ts'),
  read('src/lib/queries/sandboxOrderLifecycle.ts'),
  read('src/components/SandboxOrderLifecyclePanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('supabase/tests/database/sandbox_order_lifecycle.test.sql'),
  read('supabase/tests/production/sandbox_order_lifecycle_smoke.sql'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('public/beta-release.json'),
  read('package.json'),
  read('supabase/config.toml'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/SANDBOX_ORDER_LIFECYCLE.md'),
])

for (const contract of [
  'lifecycle_sequence bigint generated always as identity',
  'receipt.lifecycle_sequence desc',
]) assert(orderingHotfix.includes(contract), `Deterministic lifecycle ordering omits: ${contract}`)

for (const contract of [
  'broker_sandbox_order_controls',
  'broker_sandbox_order_receipts',
  'broker_sandbox_reconciliation_runs',
  'persist_broker_sandbox_order_receipt',
  'prevent_sandbox_order_evidence_mutation',
  "check (not browser_submission_enabled)",
  "check (not live_order_routing_enabled)",
  "side = 'buy'",
  "order_type = 'limit'",
  "auth.role() <> 'service_role'",
  'An active approved-tester pilot membership is required',
]) assert(migration.includes(contract), `Migration omits sandbox lifecycle boundary: ${contract}`)

for (const contract of [
  'https://broker-api.sandbox.alpaca.markets',
  'assertAlpacaSandboxOrderUrl',
  'order_class: \'bracket\'',
  'take_profit',
  'stop_loss',
  'AMBIGUOUS_PROVIDER_RESULT',
  'recoveredAfterAmbiguous',
  'providerOrderFingerprint',
  'liveOrderRoutingEnabled: false',
  'browserOriginated: false',
]) assert(adapter.includes(contract), `Sandbox adapter omits: ${contract}`)
for (const contract of ['instead of repeating post', 'cancel', 'replace', 'sandbox routes']) {
  assert(adapterTest.toLowerCase().includes(contract), `Sandbox adapter test omits: ${contract}`)
}

for (const contract of [
  "hasValidInternalSecret(request, 'BROKER_SANDBOX_SYNC_SECRET')",
  'controlled_beta_pilot_memberships',
  'global-live-orders',
  'persist_broker_sandbox_order_receipt',
  'requestDigest',
  'Replacement must preserve the protected order identity and legs',
  "providerStatus: 'ambiguous'",
  'browserOriginated: false',
  'liveOrderRoutingEnabled: false',
]) assert(edge.includes(contract), `Internal lifecycle handler omits: ${contract}`)
assert(!edge.includes('corsPreflightResponse'), 'Internal lifecycle handler unexpectedly enables browser CORS')

for (const contract of ['broker_sandbox_order_lifecycle', 'broker_sandbox_order_receipts', 'broker_sandbox_reconciliation_runs']) {
  assert(query.includes(contract), `Web query omits: ${contract}`)
}
for (const contract of [
  'Internal service only',
  'Protected bracket orders',
  'Private identifiers',
  'Live execution locked',
  'Submit, cancel and replace controls are deliberately absent',
]) assert(panel.includes(contract), `Sandbox lifecycle workspace omits: ${contract}`)
assert(navigation.includes("href: '#sandbox-orders'"), 'Navigation omits sandbox lifecycle')
assert(header.includes("'#sandbox-orders'"), 'Page header omits sandbox lifecycle')
assert(app.includes("activeHref === '#sandbox-orders'"), 'Application omits sandbox lifecycle route')
assert(styles.includes('.sandbox-order-panel'), 'Sandbox lifecycle styles are missing')
assert(databaseTest.includes('select plan(52)'), 'Database contract count changed')
assert(productionSmoke.includes('Sandbox order controls violate the Phase 6B boundary'), 'Production sandbox guard is missing')
assert(browserTest.includes("page.goto('/#sandbox-orders')"), 'Browser boundary omits sandbox lifecycle')
assert(productionBrowserTest.includes("['#sandbox-orders', 'Sandbox order lifecycle']"), 'Production workspace smoke omits sandbox lifecycle')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
assert(manifest.phase === '6B', 'Release manifest is not Phase 6B')
for (const [key, expected] of Object.entries({
  workspaceEnabled: true,
  partnerSandboxOnly: true,
  internalSubmissionEnabled: true,
  browserSubmissionEnabled: false,
  longOnly: true,
  limitOnly: true,
  protectiveOrdersRequired: true,
  cancelReplaceEnabled: true,
  reconciliationEnabled: true,
  appendOnlyReceipts: true,
  rawProviderIdentifiersStored: false,
  liveOrderRoutingEnabled: false,
})) assert(manifest.sandboxOrderLifecycle?.[key] === expected, `Manifest sandbox lifecycle mismatch: ${key}`)
assert(manifest.requiredChecks.includes('check:sandbox-orders'), 'Manifest omits sandbox lifecycle check')
assert(packageJson.scripts?.['check:sandbox-orders'], 'Package sandbox lifecycle check is missing')
assert(config.includes('[functions.manage-alpaca-sandbox-order]'), 'Supabase config omits lifecycle handler')

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_6B'],
  [verifyData, 'VERIFY_DATA_PHASE_6B'],
  [buildWeb, 'BUILD_PHASE_6B'],
  [deployWeb, 'DEPLOY_PHASE_6B'],
  [verifyWeb, 'VERIFY_WEB_PHASE_6B'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:sandbox-orders'), 'A web gate omits sandbox lifecycle check')
}
assert(ci.includes('sandbox_order_lifecycle.test.sql'), 'CI omits sandbox lifecycle database test')
assert(ci.includes('alpacaSandboxOrders.test.ts'), 'CI omits sandbox adapter tests')
assert(deployData.includes('manage-alpaca-sandbox-order'), 'Data deployment omits sandbox lifecycle handler')
assert(verifyData.includes('sandbox_order_lifecycle_smoke.sql'), 'Data verification omits sandbox production smoke')
assert(roadmap.includes('Phase 6B — partner-sandbox order lifecycle (implemented)'), 'Roadmap omits implemented Phase 6B')
assert(guide.includes('Internal service boundary'), 'Operating guide omits the internal service boundary')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Sandbox order lifecycle passed: internal-only protected sandbox orders retain append-only evidence and no live route.')
