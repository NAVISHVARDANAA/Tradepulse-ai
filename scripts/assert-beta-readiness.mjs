import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const sourceManifestText = await read('public/beta-release.json')
const artifactManifestText = await read('dist/beta-release.json')
const manifest = JSON.parse(sourceManifestText)
const artifactManifest = JSON.parse(artifactManifestText)

assert(manifest.schemaVersion === 1, 'Unexpected beta manifest schema')
assert(manifest.release === 'controlled-beta-rc2', 'Unexpected beta release identifier')
assert(manifest.phase === '4X', 'Beta manifest is not on Phase 4X')
assert(
  manifest.status === 'hosting_deployment_candidate',
  'Beta manifest overstates the release status',
)
assert(manifest.audience === 'internal_release_review', 'Beta audience boundary changed')
assert(
  JSON.stringify(artifactManifest) === JSON.stringify(manifest),
  'Built beta manifest differs from its reviewed source',
)

for (const [lock, enabled] of Object.entries(manifest.hardLocks ?? {})) {
  assert(enabled === false, `Controlled-beta hard lock is not false: ${lock}`)
}
assert(Object.keys(manifest.hardLocks ?? {}).length === 5, 'Beta hard-lock inventory changed')
assert(
  manifest.distribution?.hostingProviderSelected === true,
  'Cloudflare Pages hosting selection is missing',
)
for (const gate of ['publicUrlConfigured', 'externalInvitationsApproved']) {
  assert(manifest.distribution?.[gate] === false, `Unapproved beta distribution state: ${gate}`)
}
assert(
  Array.isArray(manifest.manualPrerequisites) && manifest.manualPrerequisites.length === 6,
  'Manual beta prerequisite inventory changed',
)

const packageJson = JSON.parse(await read('package.json'))
const expectedChecks = [
  'typecheck',
  'typecheck:e2e',
  'build',
  'check:analytics',
  'check:production-experience',
  'check:bundle',
  'check:release',
  'check:navigation',
  'check:security',
  'check:beta',
  'check:hosting',
  'test:e2e',
  'test:e2e:production',
]
for (const check of expectedChecks) {
  assert(manifest.requiredChecks.includes(check), `Beta manifest omits ${check}`)
  assert(packageJson.scripts?.[check], `Package script missing for beta check: ${check}`)
}
assert(
  manifest.requiredChecks.includes('production-dependency-audit'),
  'Production dependency audit is absent from the beta manifest',
)

const [buildWorkflow, deployWorkflow, verifyWebWorkflow, ciWorkflow, securityWorkflow, roadmap, candidateDoc, hostingDoc, robots] =
  await Promise.all([
    read('.github/workflows/build-web-release.yml'),
    read('.github/workflows/deploy-web-production.yml'),
    read('.github/workflows/verify-web-production.yml'),
    read('.github/workflows/ci.yml'),
    read('.github/workflows/security.yml'),
    read('docs/PRODUCT_ROADMAP.md'),
    read('docs/BETA_RELEASE_CANDIDATE.md'),
    read('docs/CLOUDFLARE_PAGES_HOSTING.md'),
    read('public/robots.txt'),
  ])

for (const contract of [
  'BUILD_PHASE_5C',
  'npm run check:beta',
  'tradepulse-beta-rc2-${{ github.sha }}',
  'environment: production',
]) {
  assert(buildWorkflow.includes(contract), `Beta build workflow contract missing: ${contract}`)
}
for (const contract of ['DEPLOY_PHASE_5C', 'cloudflare/wrangler-action@v3', 'verify:web-deployment', 'test:e2e:production']) {
  assert(deployWorkflow.includes(contract), `Beta deploy workflow contract missing: ${contract}`)
}
for (const contract of ['VERIFY_WEB_PHASE_5C', 'verify:web-deployment', 'test:e2e:production']) {
  assert(verifyWebWorkflow.includes(contract), `Beta web verification workflow contract missing: ${contract}`)
}
for (const contract of [
  'browser-regression:',
  'npm run test:e2e',
  'npm run check:security',
  'npm run check:hosting',
]) {
  assert(ciWorkflow.includes(contract), `CI beta contract missing: ${contract}`)
}
for (const contract of ['dependency-review-action', 'security-extended', 'javascript-typescript']) {
  assert(securityWorkflow.includes(contract), `Security workflow contract missing: ${contract}`)
}
assert(roadmap.includes('Phase 4W — controlled-beta release candidate'), 'Roadmap omits Phase 4W')
assert(roadmap.includes('Phase 4X — Cloudflare Pages deployment foundation'), 'Roadmap omits Phase 4X')
assert(roadmap.includes('Phase 4Z — deterministic passwordless authentication'), 'Roadmap omits Phase 4Z')
assert(roadmap.includes('Phase 5A — layered product workspaces'), 'Roadmap omits Phase 5A')
assert(roadmap.includes('Phase 5B — governed enterprise analytics'), 'Roadmap omits Phase 5B')
assert(roadmap.includes('Phase 5C — production experience assurance'), 'Roadmap omits Phase 5C')
assert(candidateDoc.includes('Artifact-only status'), 'Candidate documentation omits artifact status')
assert(hostingDoc.includes('External invitations remain disabled'), 'Hosting documentation omits invitation boundary')
assert(robots.includes('Disallow: /'), 'Release candidate became indexable before approval')

const [brokerageMigration, paymentMigration, monetizationMigration] = await Promise.all([
  read('supabase/migrations/014_brokerage_readiness_foundation.sql'),
  read('supabase/migrations/006_phase_two_forecasting_payments.sql'),
  read('supabase/migrations/026_monetization_foundation.sql'),
])
assert(
  brokerageMigration.includes('execution_enabled boolean not null default false check (not execution_enabled)'),
  'Global brokerage execution hard lock changed',
)
assert(
  brokerageMigration.includes('executable boolean not null default false check (not executable)'),
  'Brokerage preview non-executable constraint changed',
)
assert(
  paymentMigration.includes("status text not null default 'disabled'"),
  'Payment intent default is no longer disabled',
)
for (const lock of ['checkout_enabled', 'charge_collection_enabled', 'customer_portal_enabled']) {
  assert(
    monetizationMigration.includes(`${lock} boolean not null default false check (not ${lock})`),
    `Monetization hard lock changed: ${lock}`,
  )
}

console.log(
  'Controlled-beta readiness passed: Cloudflare RC2 candidate, 5 execution locks, 6 manual prerequisites.',
)
