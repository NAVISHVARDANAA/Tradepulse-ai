const rawUrl = process.argv[2]
if (!rawUrl) throw new Error('Usage: npm run verify:web-deployment -- https://deployment.example')

const baseUrl = new URL(rawUrl)
if (baseUrl.protocol !== 'https:') throw new Error('The deployed web origin must use HTTPS.')
baseUrl.pathname = '/'
baseUrl.search = ''
baseUrl.hash = ''

const request = async (path) => {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`)
  return response
}

const index = await request('/')
const html = await index.text()
if (!html.includes('<div id="root">')) throw new Error('Deployed page is not the TradePulse web application.')
for (const header of [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'permissions-policy',
]) {
  if (!index.headers.get(header)) throw new Error(`Deployed response is missing ${header}.`)
}

const manifestResponse = await request('/beta-release.json')
const manifest = await manifestResponse.json()
if (manifest.phase !== '5G' || manifest.release !== 'controlled-beta-rc2') {
  throw new Error('Deployed beta manifest is not the Phase 4X candidate.')
}
if (manifest.distribution?.externalInvitationsApproved !== false) {
  throw new Error('Deployed candidate unexpectedly approves external invitations.')
}
for (const [lock, enabled] of Object.entries(manifest.hardLocks ?? {})) {
  if (enabled !== false) throw new Error(`Deployed execution lock is not false: ${lock}`)
}

console.log(`Verified controlled-beta deployment at ${baseUrl.origin}: HTTPS policy and beta locks passed.`)
