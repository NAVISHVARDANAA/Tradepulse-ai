import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const read = (path) => readFile(join(repositoryRoot, path), 'utf8')

const headers = await read('public/_headers')
const csp = headers.split('\n').find((line) => line.includes('Content-Security-Policy:')) ?? ''
for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
]) {
  if (!csp.includes(directive)) throw new Error(`CSP directive missing: ${directive}`)
}
if (/script-src[^;\n]*'unsafe-(?:inline|eval)'/.test(csp) || /connect-src[^;\n]*\s\*\s/.test(csp)) {
  throw new Error('CSP permits unsafe script execution or unrestricted connections')
}
for (const header of [
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Resource-Policy: same-origin',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Strict-Transport-Security: max-age=31536000; includeSubDomains',
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY',
]) {
  if (!headers.includes(header)) throw new Error(`Browser security header missing: ${header}`)
}

const runtimeConfig = await read('src/lib/runtimeConfig.ts')
for (const boundary of [
  "import.meta.env.PROD&&parsed.protocol!=='https:'",
  "parsed.hostname.endsWith('.supabase.co')",
  '/service[_-]?role|secret/i',
]) {
  if (!runtimeConfig.includes(boundary)) throw new Error(`Public runtime boundary missing: ${boundary}`)
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!['.ts', '.tsx'].includes(extname(path))) return []
    return [{ path, content: await readFile(path, 'utf8') }]
  }))
  return nested.flat()
}

const applicationFiles = await sourceFiles(join(repositoryRoot, 'src'))
const reviewedBrowserStorage = new Map([
  ['src/components/AcademyPanel.tsx', ['tradepulse-academy-progress-v1']],
  ['src/components/AnalyticsStudioPanel.tsx', ['tradepulse-analytics-views-v1']],
  ['src/components/GuidedOnboarding.tsx', ['tradepulse-product-tour-v3']],
  ['src/lib/trustLayer.ts', ['tradepulse-trust-activity-v1', 'tradepulse-trust-mode-v1']],
])
for (const { path, content } of applicationFiles) {
  const repositoryPath = relative(repositoryRoot, path)
  const unsafe = [
    ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
    ['direct innerHTML assignment', /\.innerHTML\s*=/],
    ['eval', /\beval\s*\(/],
    ['Function constructor', /\bnew\s+Function\s*\(/],
  ].find(([, pattern]) => pattern.test(content))
  if (unsafe) throw new Error(`${unsafe[0]} is forbidden in ${repositoryPath}`)

  const reviewedStorageKeys = reviewedBrowserStorage.get(repositoryPath)
  if (/(?:local|session)Storage/.test(content) && (
    !reviewedStorageKeys || !reviewedStorageKeys.every((key) => content.includes(`'${key}'`))
  )) {
    throw new Error(`Unreviewed browser storage use in ${repositoryPath}`)
  }
}

const customerFunctions = [
  'create-paper-portfolio',
  'create-payment-quote',
  'generate-daily-research-brief',
  'manage-account-security',
  'preview-brokerage-order',
  'refresh-paper-risk',
  'set-paper-trading-control',
  'submit-paper-order',
]
for (const functionName of customerFunctions) {
  const source = await read(`supabase/functions/${functionName}/index.ts`)
  if (!source.includes('requireUser(request') || !source.includes('userGuardErrorResponse(error)')) {
    throw new Error(`Customer authentication guard missing from ${functionName}`)
  }
}

const stepUpFunctions = customerFunctions.filter(
  (name) => name !== 'manage-account-security' && name !== 'generate-daily-research-brief',
)
for (const functionName of stepUpFunctions) {
  const source = await read(`supabase/functions/${functionName}/index.ts`)
  if (!source.includes('requireVerifiedMfaWhenEnrolled: true')) {
    throw new Error(`MFA step-up boundary missing from ${functionName}`)
  }
}

const internalFunctions = [
  'evaluate-broker-operations',
  'evaluate-data-quality',
  'evaluate-forecast-governance',
  'evaluate-platform-reliability',
  'generate-equity-research',
  'generate-market-forecasts',
  'probe-alpaca-broker-sandbox',
  'sync-alpaca-sandbox-account-inventory',
  'sync-equity-market-data',
  'sync-fx-market-data',
  'sync-sec-equity-fundamentals',
]
for (const functionName of internalFunctions) {
  const source = await read(`supabase/functions/${functionName}/index.ts`)
  if (!source.includes('hasValidInternalSecret(')) {
    throw new Error(`Internal secret guard missing from ${functionName}`)
  }
}

console.log(
  `Security regression contract passed: ${customerFunctions.length} customer and ${internalFunctions.length} internal functions guarded.`,
)
