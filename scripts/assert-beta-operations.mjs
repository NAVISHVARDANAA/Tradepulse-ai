import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  component,
  navigation,
  app,
  browserTest,
  productionTest,
  manifestText,
  buildWorkflow,
  deployWorkflow,
  verifyWorkflow,
  roadmap,
  candidateDoc,
] = await Promise.all([
  read('src/components/BetaOperationsPanel.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/App.tsx'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('public/beta-release.json'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/BETA_RELEASE_CANDIDATE.md'),
])

for (const contract of [
  'Promise.allSettled',
  'getExperiencePreferences',
  'getAccountSecurityStatus',
  'getNotificationPreferences',
  'getSupportRequests',
  'never approves or creates users',
  'No execution or money movement',
]) {
  assert(component.includes(contract), `Beta operations workspace missing: ${contract}`)
}

assert(navigation.includes("href: '#beta-operations'"), 'Beta operations navigation is missing')
assert(app.includes('id="beta-operations"'), 'Beta operations route is missing')
for (const [name, test] of [['browser', browserTest], ['production', productionTest]]) {
  assert(test.includes('/#beta-operations'), `${name} browser contract omits beta operations`)
  assert(test.includes('never approves or creates users'), `${name} browser contract omits access boundary`)
}

const manifest = JSON.parse(manifestText)
assert(manifest.operations?.workspaceEnabled === true, 'Beta operations workspace is not declared')
assert(manifest.operations?.browserTesterApprovalEnabled === false, 'Browser tester approval became enabled')
assert(manifest.operations?.privateSignals?.length === 4, 'Private operations signal inventory changed')

for (const [name, workflow, confirmation] of [
  ['build', buildWorkflow, 'BUILD_PHASE_7C'],
  ['deploy', deployWorkflow, 'DEPLOY_PHASE_7C'],
  ['verify', verifyWorkflow, 'VERIFY_WEB_PHASE_7C'],
]) {
  assert(workflow.includes(confirmation), `Phase 5F ${name} confirmation is missing`)
  assert(workflow.includes('check:beta-operations'), `Phase 5I ${name} omits the operations contract`)
}

assert(roadmap.includes('Phase 5E — controlled-beta onboarding and operations'), 'Roadmap omits Phase 5E')
assert(candidateDoc.includes('Beta launch center'), 'Candidate guide omits the beta operations workspace')

console.log('Beta operations passed: private launch checks are centralized and every execution boundary remains locked.')
