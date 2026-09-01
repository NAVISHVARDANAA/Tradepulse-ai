import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  trustPanel,
  trustLibrary,
  app,
  navigation,
  pageHeader,
  browserTest,
  productionTest,
  packageJsonText,
  manifestText,
  ci,
  build,
  deploy,
  verify,
  roadmap,
  guide,
] = await Promise.all([
  read('src/components/TrustCenterPanel.tsx'),
  read('src/lib/trustLayer.ts'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('package.json'),
  read('public/beta-release.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/CUSTOMER_TRUST_LAYER.md'),
])

for (const contract of [
  'Evidence you can verify',
  'Reliability Shield',
  'Smart alert inbox',
  'Financial flight recorder',
  'Copy safe support context',
  'Guided',
  'Professional',
]) {
  assert(trustPanel.includes(contract), `Trust Center is missing: ${contract}`)
}

for (const contract of [
  'tradepulse-trust-activity-v1',
  'tradepulse-trust-mode-v1',
  'Forecast receipt',
  'Brokerage preview receipt',
  'Cross-border quote receipt',
  'Live orders hard locked',
  'No money movement',
  'Sensitive data: omitted',
]) {
  assert(trustLibrary.includes(contract), `Trust library is missing: ${contract}`)
}

assert(app.includes("activeHref === '#trust-center'"), 'Application omits the Trust Center route')
assert(app.includes('recordLocalWorkspaceVisit'), 'Application omits local activity recording')
assert(navigation.includes("href: '#trust-center'"), 'Navigation omits the Trust Center')
assert(pageHeader.includes("'#trust-center'"), 'Page header omits Trust Center copy')

for (const contract of [
  "page.goto('/#trust-center')",
  'Trust Center verifies evidence, local activity and safety boundaries',
  'tradepulse-trust-mode-v1',
  'Sensitive data: omitted',
]) {
  assert(browserTest.includes(contract), `Controlled-beta browser test omits: ${contract}`)
}
assert(productionTest.includes("['#trust-center', 'Trust and activity center']"), 'Production smoke test omits Trust Center')

const packageJson = JSON.parse(packageJsonText)
const manifest = JSON.parse(manifestText)
assert(packageJson.scripts?.['check:trust-layer'], 'Trust-layer package check is missing')
assert(manifest.phase === '6C', 'Release manifest is not on the current Phase 6C candidate')
assert(manifest.trustLayer?.trustReceipts === true, 'Release manifest omits trust receipts')
assert(manifest.trustLayer?.localActivityEvidence === true, 'Release manifest omits local activity evidence')
assert(manifest.trustLayer?.reliabilityShield === true, 'Release manifest omits the Reliability Shield')
assert(manifest.trustLayer?.contextSafeSupport === true, 'Release manifest omits safe support context')
assert(manifest.trustLayer?.persistentFinancialDataInBrowser === false, 'Browser financial-data boundary is not explicit')
assert(manifest.requiredChecks.includes('check:trust-layer'), 'Release manifest omits trust-layer verification')

for (const [name, workflow, confirmation] of [
  ['build', build, 'BUILD_PHASE_6C'],
  ['deploy', deploy, 'DEPLOY_PHASE_6C'],
  ['verify', verify, 'VERIFY_WEB_PHASE_6C'],
  ['CI', ci, 'check:trust-layer'],
]) {
  assert(workflow.includes(confirmation), `Current ${name} trust-layer contract is missing`)
  assert(workflow.includes('check:trust-layer'), `Current ${name} omits the trust-layer check`)
}

for (const lock of [
  'liveBrokerageExecution',
  'paymentExecution',
  'chargeCollection',
  'custody',
  'personalizedAdvice',
]) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

assert(roadmap.includes('Phase 5G — customer trust layer'), 'Roadmap omits Phase 5G')
assert(guide.includes('No execution or money movement'), 'Trust-layer guide omits the hard boundary')
assert(guide.includes('local browser storage'), 'Trust-layer guide omits the storage boundary')

console.log('Customer trust layer passed: evidence receipts, safety states and local-only activity remain governed.')
