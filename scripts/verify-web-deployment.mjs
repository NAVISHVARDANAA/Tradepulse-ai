import { readFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'

const rawUrl = process.argv[2]
if (!rawUrl) throw new Error('Usage: npm run verify:web-deployment -- https://deployment.example')

const expectedManifest = JSON.parse(
  await readFile(new URL('../public/beta-release.json', import.meta.url), 'utf8'),
)

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
if (!isDeepStrictEqual(manifest, expectedManifest)) {
  throw new Error(
    `Deployed beta manifest does not match the checked-out Phase ${expectedManifest.phase} ${expectedManifest.release} candidate.`,
  )
}
if (manifest.distribution?.externalInvitationsApproved !== false) {
  throw new Error('Deployed candidate unexpectedly approves external invitations.')
}
if (manifest.access?.implicitSignupEnabled !== false) {
  throw new Error('Deployed candidate unexpectedly enables implicit signup.')
}
for (const lock of [
  'liveBrokerageExecution',
  'paymentExecution',
  'chargeCollection',
  'custody',
  'personalizedAdvice',
]) {
  if (manifest.hardLocks?.[lock] !== false) {
    throw new Error(`Deployed execution lock is not false: ${lock}`)
  }
}
if (
  manifest.regulatedPreflight?.orderSubmissionEnabled !== false ||
  manifest.regulatedPreflight?.reviewsAlwaysBlocked !== true ||
  manifest.regulatedPreflight?.reviewsExecutable !== false
) {
  throw new Error('Deployed regulated-preflight execution boundary is not fail-closed.')
}
if (
  manifest.sandboxOrderLifecycle?.partnerSandboxOnly !== true ||
  manifest.sandboxOrderLifecycle?.internalSubmissionEnabled !== true ||
  manifest.sandboxOrderLifecycle?.browserSubmissionEnabled !== false ||
  manifest.sandboxOrderLifecycle?.protectiveOrdersRequired !== true ||
  manifest.sandboxOrderLifecycle?.appendOnlyReceipts !== true ||
  manifest.sandboxOrderLifecycle?.rawProviderIdentifiersStored !== false ||
  manifest.sandboxOrderLifecycle?.liveOrderRoutingEnabled !== false
) {
  throw new Error('Deployed sandbox-order lifecycle boundary is not fail-closed.')
}
if (
  manifest.liveTradingReadiness?.requirementCount !== 18 ||
  manifest.liveTradingReadiness?.appendOnlyApprovalEvidence !== true ||
  manifest.liveTradingReadiness?.rawApprovalDocumentsStored !== false ||
  manifest.liveTradingReadiness?.manualActivationReviewRequired !== true ||
  manifest.liveTradingReadiness?.automaticActivationEnabled !== false ||
  manifest.liveTradingReadiness?.browserOrderSubmissionEnabled !== false ||
  manifest.liveTradingReadiness?.liveOrderRoutingEnabled !== false ||
  manifest.liveTradingReadiness?.customerFundingEnabled !== false ||
  manifest.liveTradingReadiness?.custodyEnabled !== false ||
  manifest.liveTradingReadiness?.settlementEnabled !== false ||
  manifest.liveTradingReadiness?.killSwitchActivationEnabled !== false
) {
  throw new Error('Deployed live-trading readiness boundary is not fail-closed.')
}
if (
  manifest.corridorIntelligence?.routeModelCount !== 8 ||
  manifest.corridorIntelligence?.referenceRateVisible !== true ||
  manifest.corridorIntelligence?.providerModelRateVisible !== true ||
  manifest.corridorIntelligence?.taxUnknownNeverZero !== true ||
  manifest.corridorIntelligence?.deliveredAmountBeforeUnknownTax !== true ||
  manifest.corridorIntelligence?.providerConnectivityEnabled !== false ||
  manifest.corridorIntelligence?.beneficiaryCollectionEnabled !== false ||
  manifest.corridorIntelligence?.automaticRouteSelectionEnabled !== false ||
  manifest.corridorIntelligence?.quoteAcceptanceEnabled !== false ||
  manifest.corridorIntelligence?.transferCreationEnabled !== false ||
  manifest.corridorIntelligence?.paymentExecutionEnabled !== false ||
  manifest.corridorIntelligence?.moneyMovementEnabled !== false ||
  manifest.corridorIntelligence?.custodyEnabled !== false ||
  manifest.corridorIntelligence?.settlementEnabled !== false
) {
  throw new Error('Deployed corridor-intelligence boundary is incomplete or executable.')
}
if (
  manifest.beneficiaryProtection?.syntheticRehearsalOnly !== true ||
  manifest.beneficiaryProtection?.ruleCount !== 7 ||
  manifest.beneficiaryProtection?.validationRulesVisible !== true ||
  manifest.beneficiaryProtection?.duplicateDetectionVisible !== true ||
  manifest.beneficiaryProtection?.coolingOffVisible !== true ||
  manifest.beneficiaryProtection?.scamInterventionsVisible !== true ||
  manifest.beneficiaryProtection?.realBeneficiaryCollectionEnabled !== false ||
  manifest.beneficiaryProtection?.beneficiaryIdentifierStorageEnabled !== false ||
  manifest.beneficiaryProtection?.validationProviderConnectivityEnabled !== false ||
  manifest.beneficiaryProtection?.beneficiaryCreationEnabled !== false ||
  manifest.beneficiaryProtection?.duplicateOverrideEnabled !== false ||
  manifest.beneficiaryProtection?.coolingOffBypassEnabled !== false ||
  manifest.beneficiaryProtection?.quoteAcceptanceEnabled !== false ||
  manifest.beneficiaryProtection?.transferCreationEnabled !== false ||
  manifest.beneficiaryProtection?.paymentExecutionEnabled !== false ||
  manifest.beneficiaryProtection?.moneyMovementEnabled !== false
) {
  throw new Error('Deployed beneficiary-protection boundary is incomplete or executable.')
}

console.log(
  `Verified Phase ${manifest.phase} controlled-beta deployment at ${baseUrl.origin}: exact manifest, HTTPS policy and execution locks passed.`,
)
