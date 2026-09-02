import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  migration, payments, query, panel, app, navigation, header, styles,
  databaseTest, productionSmoke, browserTest, productionBrowserTest,
  manifestText, packageText, ci, deployData, verifyData, buildWeb, deployWeb,
  verifyWeb, roadmap, guide,
] = await Promise.all([
  read('supabase/migrations/040_corridor_intelligence.sql'),
  read('src/lib/payments.ts'),
  read('src/lib/queries/referenceData.ts'),
  read('src/components/PaymentQuotePanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('supabase/tests/database/corridor_intelligence.test.sql'),
  read('supabase/tests/production/corridor_intelligence_smoke.sql'),
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
  read('docs/CORRIDOR_INTELLIGENCE.md'),
])

for (const contract of [
  'payment_corridor_intelligence_controls',
  'payment_corridor_routes',
  'payment_corridor_intelligence',
  "data_mode = 'sandbox_model'",
  'check (not provider_connectivity_enabled)',
  'check (not beneficiary_collection_enabled)',
  'check (not quote_acceptance_enabled)',
  'check (not automatic_route_selection_enabled)',
  'check (not transfer_creation_enabled)',
  'check (not payment_execution_enabled)',
  'check (not money_movement_enabled)',
  'payment_intents_phase_7a_disabled',
  'payment_quotes_phase_7a_non_executable',
  "'unavailable'",
  'estimated_tax_bps is null',
]) assert(migration.includes(contract), `Corridor migration omits: ${contract}`)

for (const contract of [
  'createCorridorIntelligenceQuote',
  'providerRate',
  'taxAmount: number | null',
  'destinationAmountIncludesTax',
  'referenceFresh',
]) assert(payments.includes(contract), `Corridor calculation omits: ${contract}`)

assert(query.includes("from('payment_corridor_intelligence')"), 'Corridor query does not use the sanitized view')
assert(query.includes('estimated_tax_bps === null ? null'), 'Corridor query can collapse unknown tax')
for (const contract of [
  'Transparent corridor intelligence',
  'Tax unavailable—not shown as zero',
  'Estimated delivered before unknown tax',
  'Sandbox provider-model rate',
  'No route is selectable',
]) assert(panel.includes(contract), `Corridor workspace omits: ${contract}`)

assert(app.includes('getPaymentCorridorIntelligence'), 'Application omits corridor intelligence loading')
assert(navigation.includes("label: 'Payment compliance'"), 'Current payments navigation is missing')
assert(header.includes("title: 'Payment compliance orchestration'"), 'Current payments page header is missing')
assert(styles.includes('.corridor-route-grid'), 'Corridor intelligence styles are missing')
assert(databaseTest.includes('select plan(53)'), 'Corridor database contract count changed')
assert(productionSmoke.includes('A payment execution or money-movement path unexpectedly exists'), 'Production payment lock guard is missing')
assert(browserTest.includes("page.getByText('Tax unavailable—not shown as zero')"), 'Browser comparison omits explicit tax uncertainty')
assert(productionBrowserTest.includes("['#payments', 'Payment compliance orchestration']"), 'Production workspace smoke omits the payments workspace')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
assert(manifest.phase === '7C', 'Release manifest is not Phase 7C')
assert(manifest.status === 'compliance_orchestration_candidate', 'Release status is not the compliance orchestration candidate')
for (const [key, expected] of Object.entries({
  workspaceEnabled: true,
  routeModelCount: 8,
  referenceRateVisible: true,
  providerModelRateVisible: true,
  spreadVisible: true,
  knownFeesVisible: true,
  taxUnknownNeverZero: true,
  deliveredAmountBeforeUnknownTax: true,
  etaRangeVisible: true,
  routeAvailabilityVisible: true,
  providerConnectivityEnabled: false,
  beneficiaryCollectionEnabled: false,
  automaticRouteSelectionEnabled: false,
  quoteAcceptanceEnabled: false,
  transferCreationEnabled: false,
  paymentExecutionEnabled: false,
  moneyMovementEnabled: false,
  custodyEnabled: false,
  settlementEnabled: false,
})) assert(manifest.corridorIntelligence?.[key] === expected, `Manifest corridor intelligence mismatch: ${key}`)
assert(manifest.requiredChecks.includes('check:corridor-intelligence'), 'Manifest omits corridor intelligence check')
assert(packageJson.scripts?.['check:corridor-intelligence'], 'Package corridor intelligence check is missing')

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_7C'],
  [verifyData, 'VERIFY_DATA_PHASE_7C'],
  [buildWeb, 'BUILD_PHASE_7C'],
  [deployWeb, 'DEPLOY_PHASE_7C'],
  [verifyWeb, 'VERIFY_WEB_PHASE_7C'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:corridor-intelligence'), 'A web gate omits corridor intelligence')
}
assert(ci.includes('corridor_intelligence.test.sql'), 'CI omits corridor intelligence database tests')
assert(deployData.includes('corridor_intelligence_smoke.sql'), 'Data deploy omits corridor intelligence smoke')
assert(verifyData.includes('corridor_intelligence_smoke.sql'), 'Data verification omits corridor intelligence smoke')
assert(roadmap.includes('Phase 7A — corridor intelligence (implemented foundation)'), 'Roadmap omits Phase 7A foundation')
assert(guide.includes('Unknown tax is not zero'), 'Operating guide omits the tax boundary')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Corridor intelligence passed: transparent reference-only comparisons retain every payment and money-movement lock.')
