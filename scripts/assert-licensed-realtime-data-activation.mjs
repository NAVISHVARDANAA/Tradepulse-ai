import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [adapter, adapterTest, edge, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, config, security, ci, deployData,
  verifyData, buildWeb, deployWeb, verifyWeb, deployed, roadmap, guide] = await Promise.all([
  'supabase/functions/_shared/twelveDataRealtime.ts',
  'supabase/functions/_shared/twelveDataRealtime.test.ts',
  'supabase/functions/stream-twelve-data-market-data/index.ts',
  'src/lib/queries/licensedRealtimeDataActivation.ts',
  'src/components/LicensedRealtimeDataActivationPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', 'supabase/config.toml',
  'scripts/assert-security-regression.mjs', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-web-deployment.mjs',
  'docs/PRODUCT_ROADMAP.md', 'docs/LICENSED_REALTIME_DATA_ACTIVATION.md',
].map(read))

for (const contract of ['TWELVE_DATA_MAX_SYMBOLS = 30', 'TWELVE_DATA_MAX_STALENESS_MS',
  'parseTwelveDataSymbolMap', 'parseTwelveDataPriceMessage', 'allowedSymbols.has',
  'price <= 0', 'TWELVE_DATA_MAX_FUTURE_SKEW_MS']) {
  assert(adapter.includes(contract), `Twelve Data adapter omits ${contract}`)
}
for (const contract of ['normalizes, deduplicates and bounds provider symbols',
  'rejects invalid or duplicate mapping keys', 'accepts only current positive prices',
  'drops malformed, unknown, stale, future and non-positive events']) {
  assert(adapterTest.includes(contract), `Adapter tests omit ${contract}`)
}
for (const contract of ['hasValidInternalSecret(request', "body.confirmation !== 'STREAM_PHASE_8Z'",
  'TWELVE_DATA_EXTERNAL_DISPLAY_LICENSED', 'TWELVE_DATA_REALTIME_LICENSED',
  'TWELVE_DATA_REDISTRIBUTION_APPROVED', 'TWELVE_DATA_STREAM_ENABLED',
  'TWELVE_DATA_API_KEY', 'TWELVE_DATA_MARKET_ASSET_MAP',
  "source: 'twelve-data-realtime-price-v1'", "from('market_observations')",
  "action: 'heartbeat'", 'Math.min(100', 'browserCredentialExposure: false']) {
  assert(edge.includes(contract), `Streaming function omits ${contract}`)
}
assert(!app.includes('TWELVE_DATA_API_KEY') && !panel.includes('TWELVE_DATA_API_KEY'),
  'Provider credential name leaked into browser source')
assert(!app.includes('wss://ws.twelvedata.com') && !panel.includes('wss://ws.twelvedata.com'),
  'Browser source connects directly to the provider')
for (const contract of ["candidateProvider: 'Twelve Data'", "transport: 'server-side WebSocket'",
  'productionFeedActivated: false', 'browserCredentialsExposed: false',
  'realTimeDisplayEnabled: false']) {
  assert(query.includes(contract), `Activation query omits ${contract}`)
}
for (const copy of ['Real-time data activation cockpit',
  'The real-time adapter is implemented; customer display is not active',
  'Six activation controls', 'No direct browser feed',
  'It does not sign a data contract, provision credentials, run the canary, deploy a feed or enable a real-time label']) {
  assert(panel.includes(copy), `Activation cockpit omits ${copy}`)
}
assert(app.includes("activeHref === '#realtime-data-activation'"), 'App omits real-time activation route')
assert(app.includes("import('./components/LicensedRealtimeDataActivationPanel')"), 'Activation route is not lazy')
assert(navigation.includes("href: '#realtime-data-activation'"), 'Navigation omits real-time activation route')
assert(header.includes("'#realtime-data-activation'"), 'Header omits real-time activation route')
assert(browser.includes("page.goto('/#realtime-data-activation')"), 'E2E omits real-time activation route')
assert(production.includes("'#realtime-data-activation'"), 'Production test omits real-time activation route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.licensedRealtimeDataActivation
assert(manifest.phase === '9A' && manifest.status === 'live_demo_readiness_candidate',
  'Manifest is not Phase 8Z')
assert(packageJson.scripts?.['check:licensed-realtime-data-activation'], 'Package omits Phase 8Z check')
assert(manifest.requiredChecks.includes('check:licensed-realtime-data-activation'), 'Manifest omits Phase 8Z check')
for (const key of ['workspaceEnabled', 'serverSideWebSocketAdapterImplemented',
  'databaseRealtimeDeliveryImplemented', 'strictPayloadValidationImplemented']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['browserProviderCredentialExposure', 'providerCommerciallySelected',
  'providerContractSigned', 'externalDisplayRightsApproved', 'redistributionRightsApproved',
  'productionCredentialsProvisioned', 'productionCanaryPassed',
  'continuousStreamOrchestrationEnabled', 'productionFeedActivated',
  'liveDataDisplayEnabled', 'externalAudienceActivationEnabled', 'publicSignupEnabled',
  'orderRoutingEnabled', 'paymentCollectionEnabled', 'moneyMovementEnabled',
  'custodyEnabled', 'settlementEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.implementationCandidate === 'twelve-data'
  && release?.boundedCanaryWindowSeconds === 100 && release?.canarySymbolCeiling === 30,
  'Phase 8Z candidate or bounds changed')
assert(config.includes('[functions.stream-twelve-data-market-data]')
  && config.includes('verify_jwt = false'), 'Internal streaming function config is missing')
assert(security.includes("'stream-twelve-data-market-data'"), 'Security regression omits streaming function')
assert(ci.includes('deno check supabase/functions/stream-twelve-data-market-data/index.ts')
  && ci.includes('supabase/functions/_shared/twelveDataRealtime.test.ts'), 'CI omits streaming contracts')
assert(deployData.includes('stream-twelve-data-market-data'), 'Protected data workflow omits streaming function')
for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8Z'],
  [verifyData, 'VERIFY_DATA_PHASE_8Z'], [buildWeb, 'BUILD_PHASE_9A'],
  [deployWeb, 'DEPLOY_PHASE_9A'], [verifyWeb, 'VERIFY_WEB_PHASE_9A']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:licensed-realtime-data-activation'), 'Web gate omits Phase 8Z check')
}
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'")
  && verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"),
  'Phase 8Z must preserve migration 066')
assert(deployed.includes('manifest.licensedRealtimeDataActivation'), 'Web verifier omits Phase 8Z')
assert(roadmap.includes('Phase 8Z — licensed real-time data activation (implemented candidate)'),
  'Roadmap omits Phase 8Z')
for (const contract of ['STREAM_PHASE_8Z', 'external-display and redistribution rights',
  'zero-customer canary', 'no database migration', '24/7 stream supervisor']) {
  assert(guide.includes(contract), `Phase 8Z guide omits ${contract}`)
}

console.log('Licensed real-time activation passed: server-only Twelve Data adapter, bounded validation, database delivery and explicit commercial/canary gates with no production feed effect.')

