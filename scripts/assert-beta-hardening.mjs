import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  panel,
  navigation,
  pageHeader,
  app,
  styles,
  browserTest,
  productionTest,
  packageJsonText,
  manifestText,
  build,
  deploy,
  verify,
  ci,
  roadmap,
  guide,
] = await Promise.all([
  read('src/components/BetaHardeningPanel.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/App.tsx'),
  read('src/index.css'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('package.json'),
  read('public/beta-release.json'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('.github/workflows/ci.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/BETA_HARDENING.md'),
])

for (const contract of [
  'Customer-safe release closure',
  'Data freshness recovery',
  'Session and identity recovery',
  'Decision evidence recovery',
  'Customer incident escalation',
  "performance.getEntriesByType('navigation')",
  'prefers-reduced-motion: reduce',
  'No external analytics',
  'No execution or money movement',
]) {
  assert(panel.includes(contract), `Beta hardening workspace is missing: ${contract}`)
}
assert(!panel.includes('localStorage'), 'Beta hardening must not persist customer evidence in browser storage')
assert(!panel.includes('fetch('), 'Beta hardening must not transmit local browser evidence')
assert(navigation.includes("href: '#beta-hardening'"), 'Navigation omits beta hardening')
assert(pageHeader.includes("'#beta-hardening'"), 'Page header omits beta hardening copy')
assert(app.includes("activeHref === '#beta-hardening'"), 'Application omits the beta hardening route')
assert(styles.includes('.hardening-panel'), 'Beta hardening styles are missing')

for (const contract of [
  "page.goto('/#beta-hardening')",
  'Confirm .* drill reviewed',
  '1 of 4 recovery drills reviewed',
  'No execution or money movement',
]) {
  assert(browserTest.includes(contract), `Browser hardening contract is missing: ${contract}`)
}
assert(
  productionTest.includes("['#beta-hardening', 'Beta hardening center']"),
  'Production smoke omits the beta hardening workspace',
)

const packageJson = JSON.parse(packageJsonText)
const manifest = JSON.parse(manifestText)
assert(packageJson.scripts?.['check:beta-hardening'], 'Beta hardening package check is missing')
assert(manifest.phase === '7C', 'Release manifest is not on the current Phase 7C candidate')
assert(manifest.betaHardening?.workspaceEnabled === true, 'Manifest omits beta hardening')
assert(manifest.betaHardening?.browserPerformanceEvidence === true, 'Manifest omits browser evidence')
assert(manifest.betaHardening?.externalAnalyticsEnabled === false, 'External analytics became enabled')
assert(manifest.betaHardening?.releaseClosureAdministrative === true, 'Release closure is not administrative')
assert(manifest.betaHardening?.executionBoundaryChanges === false, 'Execution boundary changed')
assert(manifest.betaHardening?.recoveryDrills?.length === 4, 'Recovery drill inventory changed')
assert(manifest.requiredChecks.includes('check:beta-hardening'), 'Manifest omits beta hardening verification')

for (const [name, workflow, confirmation] of [
  ['build', build, 'BUILD_PHASE_7C'],
  ['deploy', deploy, 'DEPLOY_PHASE_7C'],
  ['verify', verify, 'VERIFY_WEB_PHASE_7C'],
]) {
  assert(workflow.includes(confirmation), `Phase 5I ${name} confirmation is missing`)
  assert(workflow.includes('check:beta-hardening'), `Phase 5I ${name} omits hardening verification`)
}
assert(ci.includes('check:beta-hardening'), 'CI omits beta hardening verification')

for (const lock of [
  'liveBrokerageExecution',
  'paymentExecution',
  'chargeCollection',
  'custody',
  'personalizedAdvice',
]) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

assert(roadmap.includes('Phase 5I — beta hardening (implemented)'), 'Roadmap omits implemented Phase 5I')
assert(guide.toLowerCase().includes('no database migration'), 'Hardening guide omits the data boundary')
assert(guide.includes('No execution or money movement'), 'Hardening guide omits execution locks')

console.log('Beta hardening passed: recovery, accessibility, performance and release closure remain customer-safe.')
