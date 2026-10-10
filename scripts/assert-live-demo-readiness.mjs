import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  app,
  panel,
  demoMode,
  demoExperience,
  navigation,
  pageHeader,
  shellStyles,
  demoStyles,
  demoModeStyles,
  manifestText,
  packageText,
  ci,
  build,
  deploy,
  verify,
  productionTest,
  roadmap,
] = await Promise.all([
  read('src/App.tsx'),
  read('src/components/LiveDemoPanel.tsx'),
  read('src/lib/demoMode.ts'),
  read('src/lib/demoExperience.ts'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('src/live-demo.css'),
  read('src/demo-mode.css'),
  read('public/beta-release.json'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('docs/PRODUCT_ROADMAP.md'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const styles = `${shellStyles}\n${demoStyles}\n${demoModeStyles}`

assert(manifest.phase === '9B' && manifest.status === 'audience_feedback_readiness_candidate',
  'Current manifest does not preserve Phase 9A demo readiness inside the Phase 9B candidate')
assert(packageJson.scripts?.['check:live-demo-readiness'], 'Package omits the Phase 9A check')
assert(manifest.requiredChecks.includes('check:live-demo-readiness'), 'Manifest omits the Phase 9A check')

for (const contract of [
  'curatedDemoDataEnabled',
  'demoDataClearlyLabelled',
  'demoDataSessionScoped',
  'regulatedControlsSeparatedFromPrimaryJourney',
]) {
  assert(manifest.liveDemoReadiness?.[contract] === true, `Demo readiness contract is not enabled: ${contract}`)
}
for (const lock of [
  'licensedRealtimeFeedEnabled', 'publicSignupEnabled', 'checkoutEnabled',
  'orderRoutingEnabled', 'paymentExecutionEnabled', 'moneyMovementEnabled',
  'customerFundingEnabled', 'custodyEnabled', 'settlementEnabled',
]) {
  assert(manifest.liveDemoReadiness?.[lock] === false, `Demo readiness lock changed: ${lock}`)
}

for (const contract of [
  'Curated demo data—not a live feed',
  'No orders, payments or real funds',
  'Licensed real-time feeds remain gated',
  'Show the product value in ten minutes.',
  '#audience-pilot-plan',
]) {
  assert(panel.includes(contract), `Live demo panel omits: ${contract}`)
}
for (const contract of [
  "DEMO_MODE_KEY = 'tradepulse-demo-mode-v1'",
  'sessionStorage.setItem',
]) {
  assert(demoMode.includes(contract), `Demo session contract omits: ${contract}`)
}
for (const contract of [
  "source: 'TradePulse curated demo'",
  "licenseStatus: 'demo_only'",
  "'Demo data—not investment advice'",
]) {
  assert(demoExperience.includes(contract), `Demo data contract omits: ${contract}`)
}
for (const contract of [
  "activeHref === '#live-demo'",
  "import('./components/DemoModeBanner')",
  'setDemoModeEnabled(true)',
  'demoMarketAssets',
  'demoTradeDashboard',
  'demoForecasts',
  'demoEquityResearch',
]) {
  assert(app.includes(contract), `App omits demo contract: ${contract}`)
}
assert(navigation.includes("label: 'Demo'") && navigation.includes("label: 'Readiness controls'"),
  'Navigation does not separate the audience demo from readiness controls')
assert(navigation.includes(": '#live-demo'"), 'Live demo is not the default product route')
assert(pageHeader.includes("'#live-demo'"), 'Live demo page header is missing')
for (const selector of ['.live-demo-hero', '.live-demo-grid', '.demo-mode-banner']) {
  assert(styles.includes(selector), `Live demo styling omits ${selector}`)
}

for (const workflow of [ci, build, deploy, verify]) {
  assert(workflow.includes('npm run check:live-demo-readiness'), 'A web release gate omits the Phase 9A check')
}
for (const token of ['BUILD_PHASE_9B', 'DEPLOY_PHASE_9B', 'VERIFY_WEB_PHASE_9B']) {
  assert([build, deploy, verify].some((workflow) => workflow.includes(token)), `Web release token is missing: ${token}`)
}
for (const contract of ['#live-demo', 'Curated demo data—not a live feed', 'Demo data is active']) {
  assert(productionTest.includes(contract), `Production demo smoke omits: ${contract}`)
}
assert(roadmap.includes('Phase 9A — live-demo readiness'), 'Roadmap omits Phase 9A')

console.log('Live-demo readiness contract passed: labelled sample data, audience-first navigation and regulated locks guarded.')
