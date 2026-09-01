import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [requirements, app, browserTest, packageJsonText, manifestText, vite, build, deploy, verify, ci, roadmap, guide] =
  await Promise.all([
    read('src/lib/productDataRequirements.ts'),
    read('src/App.tsx'),
    read('tests/e2e/controlled-beta.spec.ts'),
    read('package.json'),
    read('public/beta-release.json'),
    read('vite.config.ts'),
    read('.github/workflows/build-web-release.yml'),
    read('.github/workflows/deploy-web-production.yml'),
    read('.github/workflows/verify-web-production.yml'),
    read('.github/workflows/ci.yml'),
    read('docs/PRODUCT_ROADMAP.md'),
    read('docs/ROUTE_AWARE_DATA_LOADING.md'),
  ])

const routeContracts = {
  '#analytics-studio': ['markets', 'trade', 'forecasts', 'equity'],
  '#markets': ['markets', 'trade'],
  '#trade-data': ['trade'],
  '#forecasts': ['forecasts'],
  '#stock-research': ['equity'],
  '#research-copilot': ['equity'],
  '#paper-investing': ['markets'],
  '#payments': ['markets'],
}

for (const [route, domains] of Object.entries(routeContracts)) {
  assert(requirements.includes(`'${route}'`), `Route data contract omits ${route}`)
  for (const domain of domains) {
    assert(requirements.includes(`'${domain}'`), `Route data contract omits ${domain}`)
  }
}

for (const contract of [
  'productDataRequirements(activeHref)',
  'dataRequirements.forEach',
  'tradepulse-product-data-',
  'forecast_reliability_snapshots',
  'equity_research_scores',
  "import('./lib/queries/referenceData')",
  "'./lib/queries/equityResearch'",
]) {
  assert(app.includes(contract), `Route-aware application contract missing: ${contract}`)
}
assert(!app.includes('tradepulse-dashboard-realtime'), 'Legacy dashboard-wide realtime channel remains')
assert(!app.includes('void Promise.all([\n      loadMarkets()'), 'Shared data still loads globally at startup')

for (const contract of [
  'shared product data loads only for the active workspace',
  "page.goto('/#beta-operations')",
  "page.goto('/#beta-hardening')",
  "page.goto('/#forecasts')",
  '/display_qualified_market_forecasts',
  '/trade_observations',
]) {
  assert(browserTest.includes(contract), `Browser route-isolation contract missing: ${contract}`)
}

const packageJson = JSON.parse(packageJsonText)
const manifest = JSON.parse(manifestText)
assert(packageJson.scripts?.['check:data-loading'], 'Route-aware data check script is missing')
assert(manifest.performance?.routeAwareDataLoading === true, 'Manifest omits route-aware loading')
assert(manifest.performance?.routeScopedRealtime === true, 'Manifest omits route-scoped realtime')
assert(manifest.requiredChecks.includes('check:data-loading'), 'Manifest omits the data-loading check')
assert(vite.includes("target: 'es2022'"), 'Production build is not pinned to the evergreen target')
assert(vite.includes('modulePreload: { polyfill: false }'), 'Native module preloading is not pinned')

for (const [name, workflow, confirmation] of [
  ['build', build, 'BUILD_PHASE_6C'],
  ['deploy', deploy, 'DEPLOY_PHASE_6C'],
  ['verify', verify, 'VERIFY_WEB_PHASE_6C'],
  ['CI', ci, 'check:data-loading'],
]) {
  assert(workflow.includes(confirmation), `Phase 5I ${name} contract is missing`)
  assert(workflow.includes('check:data-loading'), `Phase 5I ${name} omits the data-loading check`)
}

assert(roadmap.includes('Phase 5F — route-aware data loading'), 'Roadmap omits Phase 5F')
assert(guide.includes('No shared-data request'), 'Route-aware operating guide omits the isolation boundary')
assert(guide.includes('No execution boundary changes'), 'Route-aware guide omits execution locks')

console.log('Route-aware data loading passed: active workspaces own their queries and realtime subscriptions.')
