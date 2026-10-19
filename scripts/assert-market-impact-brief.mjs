import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [component, library, styles, app, navigation, pageHeader, requirements, manifestText, packageText, roadmap, guide, controlledBrowser, productionBrowser, liveDemo, build, deploy, verify, ci, deployedVerifier] = await Promise.all([
  read('src/components/MarketImpactBriefPanel.tsx'),
  read('src/lib/marketImpactBrief.ts'),
  read('src/market-impact-brief.css'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/lib/productDataRequirements.ts'),
  read('public/beta-release.json'),
  read('package.json'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/MARKET_IMPACT_BRIEF.md'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('src/components/LiveDemoPanel.tsx'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('.github/workflows/ci.yml'),
  read('scripts/verify-web-deployment.mjs'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const controls = manifest.marketImpactBrief

assert(manifest.phase === '9F' && manifest.status === 'market_impact_brief_candidate', 'Manifest is not the Phase 9F market-impact brief candidate')
assert(packageJson.scripts?.['check:market-impact-brief'], 'Package omits the Phase 9F check')
assert(manifest.requiredChecks.includes('check:market-impact-brief'), 'Manifest omits the Phase 9F check')

for (const contract of [
  'Turn a market-moving event into a five-minute impact brief.',
  'The real-time problem',
  'Observation ≠ causation',
  'Evidence I have personally checked',
  'What would confirm it?',
  'What would change my mind?',
  'No account, message, alert, order or financial action is created.',
]) {
  assert(component.includes(contract), `Market-impact component omits: ${contract}`)
}

for (const contract of [
  "'shipping-disruption'",
  "'rate-surprise'",
  "'commodity-supply-shock'",
  "'export-restriction'",
  'marketObservationFreshness',
  'missingObservationCount',
  'This is a scenario hypothesis, not proof of causation',
]) {
  assert(library.includes(contract), `Market-impact library omits: ${contract}`)
}

assert(styles.includes('@media (max-width: 680px)'), 'Market-impact workspace omits its mobile layout')
assert(app.includes("import('./components/MarketImpactBriefPanel')"), 'Market-impact workspace is not deferred')
assert(app.includes("activeHref === '#market-impact-brief'"), 'Application omits the Phase 9F route')
assert(app.includes('marketAssets={marketAssets}'), 'Phase 9F does not receive governed market observations')
assert(navigation.includes("href: '#market-impact-brief'"), 'Navigation omits the Phase 9F route')
assert(pageHeader.includes("'#market-impact-brief'"), 'Page header omits the Phase 9F route')
assert(requirements.includes("'#market-impact-brief': ['markets']"), 'Phase 9F route is not scoped to market data')
assert(liveDemo.includes("href: '#market-impact-brief'"), 'Guided demo omits the event-to-market workflow')

for (const [field, expected] of Object.entries({
  workspaceEnabled: true,
  eventScenarioCount: 4,
  decisionLensCount: 3,
  evidenceCheckCount: 4,
  marketObservationReuseEnabled: true,
  missingObservationFabricationEnabled: false,
  causalClaimEnabled: false,
  automaticNewsIntakeEnabled: false,
  licensedRealtimeFeedEnabled: false,
  externalMessagingEnabled: false,
  alertCreationEnabled: false,
  personalizedAdviceEnabled: false,
  orderRoutingEnabled: false,
  paymentExecutionEnabled: false,
  moneyMovementEnabled: false,
})) {
  assert(controls?.[field] === expected, `Market-impact manifest contract is wrong: ${field}`)
}

for (const [name, workflow, token] of [
  ['build', build, 'BUILD_PHASE_9F'],
  ['deploy', deploy, 'DEPLOY_PHASE_9F'],
  ['verify', verify, 'VERIFY_WEB_PHASE_9F'],
]) {
  assert(workflow.includes(token), `Phase 9F ${name} token is missing`)
  assert(workflow.includes('npm run check:market-impact-brief'), `Phase 9F ${name} gate is missing`)
}
assert(ci.includes('npm run check:market-impact-brief'), 'CI omits the Phase 9F gate')
assert(deployedVerifier.includes('Deployed market impact-brief boundary is incomplete or unsafe.'), 'Deployed verifier omits the Phase 9F boundary')
assert(roadmap.includes('Phase 9F — event-to-market impact brief'), 'Roadmap omits Phase 9F')
assert(guide.includes('Research fragmentation under time pressure'), 'Phase 9F guide omits the real problem statement')
assert(controlledBrowser.includes('Phase 9F market impact brief'), 'Controlled browser coverage omits Phase 9F')
assert(productionBrowser.includes('Phase 9F impact brief remains non-executing'), 'Production browser coverage omits Phase 9F')

console.log('Phase 9F market impact brief passed: real-world event framing, source-labelled observations, counter-signals and execution locks guarded.')
