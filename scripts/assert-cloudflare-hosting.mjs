import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [workflow, verifyWorkflow, manifestText, headers, redirects, documentation] = await Promise.all([
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('public/beta-release.json'),
  read('public/_headers'),
  read('public/_redirects'),
  read('docs/CLOUDFLARE_PAGES_HOSTING.md'),
])
const manifest = JSON.parse(manifestText)

for (const contract of [
  'DEPLOY_PHASE_5D',
  'environment: production',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_PAGES_PROJECT',
  'cloudflare/wrangler-action@v3',
  '--commit-hash=${{ github.sha }}',
  'npm run verify:web-deployment',
  'npm run test:e2e:production',
]) {
  assert(workflow.includes(contract), `Cloudflare deployment contract missing: ${contract}`)
}
for (const contract of ['VERIFY_WEB_PHASE_5D', 'environment: production', 'npm run test:e2e:production']) {
  assert(verifyWorkflow.includes(contract), `Cloudflare verification contract missing: ${contract}`)
}
assert(manifest.phase === '4X', 'Hosting candidate is not on Phase 4X')
assert(manifest.status === 'hosting_deployment_candidate', 'Hosting status changed unexpectedly')
assert(manifest.distribution?.hostingProviderSelected === true, 'Cloudflare Pages is not selected')
assert(manifest.distribution?.publicUrlConfigured === false, 'Public URL cannot be pre-approved by code')
assert(manifest.distribution?.externalInvitationsApproved === false, 'External invitations became enabled')
for (const enabled of Object.values(manifest.hardLocks ?? {})) {
  assert(enabled === false, 'A controlled-beta execution lock changed')
}
assert(headers.includes('Content-Security-Policy:'), 'Cloudflare security headers are missing')
assert(headers.includes('Strict-Transport-Security:'), 'Cloudflare HSTS policy is missing')
assert(redirects.includes('/* /index.html 200'), 'Cloudflare SPA fallback is missing')
assert(documentation.includes('External invitations remain disabled'), 'Hosting boundary is undocumented')

console.log('Cloudflare Pages hosting contract passed: guarded deployment, HTTPS checks, invitations disabled.')
