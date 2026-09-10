import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  migration, databaseTest, productionSmoke, component, types, query, app,
  navigation, header, dataRequirements, browserTest, productionBrowserTest,
  guide, roadmap, releaseGuide, hostingGuide, supabaseGuide, publicRead,
  deployedVerification, ci, deployData, verifyData, buildWeb, deployWeb,
  verifyWeb, manifestText, packageText,
] = await Promise.all([
  read('supabase/migrations/045_global_venue_instrument_intelligence.sql'),
  read('supabase/tests/database/global_venue_instrument_intelligence.test.sql'),
  read('supabase/tests/production/global_venue_instrument_intelligence_smoke.sql'),
  read('src/components/GlobalMarketAccessPanel.tsx'),
  read('src/types/domain.ts'),
  read('src/lib/queries/globalMarketAccess.ts'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/lib/productDataRequirements.ts'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('docs/GLOBAL_VENUE_INSTRUMENT_INTELLIGENCE.md'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/BETA_RELEASE_CANDIDATE.md'),
  read('docs/CLOUDFLARE_PAGES_HOSTING.md'),
  read('docs/SUPABASE_DEPLOYMENT.md'),
  read('scripts/verify-public-runtime-read.sh'),
  read('scripts/verify-web-deployment.mjs'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('public/beta-release.json'),
  read('package.json'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)

for (const contract of [
  'global_market_intelligence_controls', 'global_market_venues',
  'global_market_calendars', 'global_instrument_listings',
  'global_market_data_entitlements', 'global_market_access_policies',
  'global_venue_instrument_reference', 'global-venue-instrument-intelligence-v1',
  'security_invoker = true', 'CROSS_BORDER_LEGAL_REVIEW_REQUIRED', 'reference_as_of',
]) assert(migration.includes(contract), `Migration omits ${contract}`)

for (const lock of [
  'live_market_data_connectivity_enabled', 'customer_entitlement_assignment_enabled',
  'automatic_jurisdiction_approval_enabled', 'order_preview_enabled',
  'order_routing_enabled', 'broker_connectivity_enabled', 'customer_funding_enabled',
  'custody_enabled', 'settlement_enabled',
]) assert(migration.includes(`${lock} boolean not null default false check (not ${lock})`), `Migration does not constrain ${lock}`)

for (const forbidden of [
  'create table public.live_global_orders', 'create table public.global_custody_accounts',
  'create table public.global_settlement_ledger',
  'create or replace function public.submit_global_order',
  'create or replace function public.activate_global_market',
]) assert(!migration.includes(forbidden), `Migration introduces ${forbidden}`)

assert(databaseTest.includes('select plan(63)'), 'Database contract plan changed')
assert(databaseTest.includes('reference_as_of is null'), 'Database contract omits review-date coverage')
for (const contract of ['6::bigint', '12::bigint', '18::bigint', '24::bigint', '48::bigint', 'Existing execution or money-movement locks changed']) {
  assert(databaseTest.includes(contract) || productionSmoke.includes(contract), `Database coverage omits ${contract}`)
}
assert(databaseTest.includes('live_trading_activation_controls'), 'Database contract omits the live-trading lock')
for (const contract of ['Global venue and instrument intelligence schema is incomplete', 'Global market intelligence controls are not fail-closed', 'A global order, custody or settlement path unexpectedly exists']) {
  assert(productionSmoke.includes(contract), `Production smoke omits ${contract}`)
}

for (const contract of [
  'Global markets · Phase 8A', 'Venue and instrument intelligence',
  'Global execution remains unavailable', 'Hypothetical residency',
  'Instrument class', 'Executable markets', 'Research reference only',
]) assert(component.includes(contract), `Global market workspace omits ${contract}`)
assert(!component.includes('<button'), 'Global market workspace unexpectedly exposes an action button')
assert(types.includes('GlobalMarketAccessRecord'), 'Typed global market contract is missing')
assert(query.includes("from('global_venue_instrument_reference')"), 'Global market query omits the Phase 8A view')
assert(app.includes('getGlobalMarketAccessReference'), 'Application omits the Phase 8A loader')
assert(app.includes("activeHref === '#global-access'"), 'Application omits the global access workspace')
assert(navigation.includes("label: 'Global access'"), 'Navigation omits global access')
assert(header.includes("title: 'Venue and instrument access map'"), 'Page header omits Phase 8A copy')
assert(dataRequirements.includes("'#global-access': ['globalAccess']"), 'Route-aware loading omits global access')
assert(browserTest.includes('global_venue_instrument_reference'), 'Browser contract omits the Phase 8A reference')
assert(browserTest.includes('Global execution remains unavailable'), 'Browser contract omits the execution lock')
assert(productionBrowserTest.includes("['#global-access', 'Venue and instrument access map']"), 'Production smoke omits global access')

assert(manifest.phase === '8D', 'Release manifest is not Phase 8D')
assert(manifest.status === 'global_brokerage_custody_candidate', 'Release status is not the Phase 8A candidate')
assert(manifest.requiredChecks.includes('check:global-market-intelligence'), 'Manifest omits the Phase 8A check')
assert(packageJson.scripts?.['check:global-market-intelligence'], 'Package scripts omit the Phase 8A check')
const release = manifest.globalVenueInstrumentIntelligence
assert(release?.workspaceEnabled === true, 'Global market workspace is disabled')
assert(release?.venueCount === 6, 'Global market venue count changed')
assert(release?.listingCount === 12, 'Global market listing count changed')
assert(release?.residencyScenarioCount === 4, 'Residency scenario count changed')
assert(release?.displayRightsFailClosed === true, 'Display rights do not fail closed')
for (const lock of [
  'liveMarketDataConnectivityEnabled', 'customerEntitlementAssignmentEnabled',
  'automaticJurisdictionApprovalEnabled', 'orderPreviewEnabled', 'orderRoutingEnabled',
  'brokerConnectivityEnabled', 'customerFundingEnabled', 'custodyEnabled', 'settlementEnabled',
]) assert(release?.[lock] === false, `Phase 8A lock is not false: ${lock}`)

for (const [workflow, confirmation] of [
  [deployData, 'DEPLOY_DATA_PHASE_8D'], [verifyData, 'VERIFY_DATA_PHASE_8D'],
  [buildWeb, 'BUILD_PHASE_8D'], [deployWeb, 'DEPLOY_PHASE_8D'],
  [verifyWeb, 'VERIFY_WEB_PHASE_8D'],
]) assert(workflow.includes(confirmation), `Release workflow omits ${confirmation}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-market-intelligence'), 'A web gate omits Phase 8A')
}
assert(ci.includes('global_venue_instrument_intelligence.test.sql'), 'CI omits Phase 8A database tests')
assert(deployData.includes('global_venue_instrument_intelligence_smoke.sql'), 'Data deploy omits Phase 8A smoke')
assert(verifyData.includes('global_venue_instrument_intelligence_smoke.sql'), 'Data verification omits Phase 8A smoke')
assert(verifyData.includes('migration 048'), 'Data verification omits the current migration parity check')
assert(publicRead.includes('global_venue_instrument_reference'), 'Public runtime check omits Phase 8A')
assert(deployedVerification.includes('manifest.globalVenueInstrumentIntelligence'), 'Deployed verification omits Phase 8A')
assert(roadmap.includes('Phase 8A — global venue and instrument intelligence (implemented foundation)'), 'Roadmap omits the Phase 8A foundation')
assert(guide.includes('No order routing, broker'), 'Phase 8A guide omits the execution boundary')
for (const guideText of [releaseGuide, hostingGuide, supabaseGuide]) assert(guideText.includes('PHASE_8D'), 'A current release guide omits Phase 8D')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'moneyMovement', 'customerFunding', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Global venue and instrument intelligence passed: six venues, twelve listing identities and four residency scenarios remain reference-only and fail-closed.')
