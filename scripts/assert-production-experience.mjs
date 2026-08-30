import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [test, config, localConfig, verifyWorkflow, deployWorkflow, packageJsonText, roadmap] = await Promise.all([
  read('tests/e2e/production-smoke.spec.ts'),
  read('playwright.production.config.ts'),
  read('playwright.config.ts'),
  read('.github/workflows/verify-web-production.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('package.json'),
  read('docs/PRODUCT_ROADMAP.md'),
])
const packageJson = JSON.parse(packageJsonText)

for (const route of [
  '#dashboard',
  '#analytics-studio',
  '#stock-research',
  '#research-copilot',
  '#forecasts',
  '#markets',
  '#academy',
  '#paper-investing',
  '#risk-command-center',
  '#data-trust',
  '#payments',
  '#system-status',
  '#beta-operations',
]) {
  assert(test.includes(route), `Production experience smoke omits ${route}`)
}
for (const contract of [
  "page.on('console'",
  "page.on('pageerror'",
  "page.on('response'",
  "url.hostname.endsWith('.supabase.co')",
  'response.status() >= 400',
  'tradepulse-analytics-views-v1',
  'Drill through',
  'Sandbox · no money movement',
]) {
  assert(test.includes(contract), `Production experience contract missing: ${contract}`)
}
for (const contract of ['WEB_PRODUCTION_URL', "protocol !== 'https:'", "testMatch: 'production-smoke.spec.ts'"]) {
  assert(config.includes(contract), `Production Playwright configuration missing: ${contract}`)
}
assert(
  localConfig.includes("testIgnore: 'production-smoke.spec.ts'"),
  'Local browser suite must not run the live production smoke contract',
)
for (const contract of ['VERIFY_WEB_PHASE_5E', 'npm run test:e2e:production', 'environment: production']) {
  assert(verifyWorkflow.includes(contract), `Manual production verification workflow missing: ${contract}`)
}
for (const contract of ['DEPLOY_PHASE_5E', 'npm run test:e2e:production', 'steps.cloudflare.outputs.deployment-url']) {
  assert(deployWorkflow.includes(contract), `Post-deployment experience gate missing: ${contract}`)
}
for (const script of ['check:production-experience', 'test:e2e:production']) {
  assert(packageJson.scripts?.[script], `Package script missing: ${script}`)
}
assert(roadmap.includes('Phase 5C — production experience assurance'), 'Roadmap omits Phase 5C')

console.log('Production experience contract passed: 13 routes, runtime failures, Analytics interactions and execution locks guarded.')
