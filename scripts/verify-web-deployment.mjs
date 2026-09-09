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
  'moneyMovement',
  'customerFunding',
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
if (
  manifest.complianceOrchestration?.syntheticCaseRehearsalOnly !== true ||
  manifest.complianceOrchestration?.corridorCount !== 4 ||
  manifest.complianceOrchestration?.requirementCount !== 28 ||
  manifest.complianceOrchestration?.individualStageCount !== 6 ||
  manifest.complianceOrchestration?.businessStageCount !== 6 ||
  manifest.complianceOrchestration?.kycVisible !== true ||
  manifest.complianceOrchestration?.kybVisible !== true ||
  manifest.complianceOrchestration?.amlVisible !== true ||
  manifest.complianceOrchestration?.sanctionsVisible !== true ||
  manifest.complianceOrchestration?.transactionMonitoringVisible !== true ||
  manifest.complianceOrchestration?.travelRuleVisible !== true ||
  manifest.complianceOrchestration?.auditWorkflowVisible !== true ||
  manifest.complianceOrchestration?.realIdentityCollectionEnabled !== false ||
  manifest.complianceOrchestration?.documentUploadEnabled !== false ||
  manifest.complianceOrchestration?.piiStorageEnabled !== false ||
  manifest.complianceOrchestration?.complianceProviderConnectivityEnabled !== false ||
  manifest.complianceOrchestration?.liveSanctionsScreeningEnabled !== false ||
  manifest.complianceOrchestration?.transactionMonitoringConnectivityEnabled !== false ||
  manifest.complianceOrchestration?.travelRuleTransmissionEnabled !== false ||
  manifest.complianceOrchestration?.complianceCaseWritesEnabled !== false ||
  manifest.complianceOrchestration?.automatedClearanceEnabled !== false ||
  manifest.complianceOrchestration?.manualOverrideEnabled !== false ||
  manifest.complianceOrchestration?.quoteAcceptanceEnabled !== false ||
  manifest.complianceOrchestration?.transferCreationEnabled !== false ||
  manifest.complianceOrchestration?.paymentExecutionEnabled !== false ||
  manifest.complianceOrchestration?.moneyMovementEnabled !== false
) {
  throw new Error('Deployed compliance-orchestration boundary is incomplete or operational.')
}
if (
  manifest.sandboxTransferLifecycle?.syntheticTransferRehearsalOnly !== true ||
  manifest.sandboxTransferLifecycle?.licensedPartnerSandboxReference !== true ||
  manifest.sandboxTransferLifecycle?.corridorCount !== 4 ||
  manifest.sandboxTransferLifecycle?.stageTemplateCount !== 36 ||
  manifest.sandboxTransferLifecycle?.ledgerTemplateCount !== 16 ||
  manifest.sandboxTransferLifecycle?.journalCountPerCorridor !== 2 ||
  manifest.sandboxTransferLifecycle?.idempotencyVisible !== true ||
  manifest.sandboxTransferLifecycle?.signedWebhookVisible !== true ||
  manifest.sandboxTransferLifecycle?.doubleEntryPreviewVisible !== true ||
  manifest.sandboxTransferLifecycle?.boundedRetryVisible !== true ||
  manifest.sandboxTransferLifecycle?.reconciliationVisible !== true ||
  manifest.sandboxTransferLifecycle?.rescueModeVisible !== true ||
  manifest.sandboxTransferLifecycle?.disputeWorkflowVisible !== true ||
  manifest.sandboxTransferLifecycle?.refundWorkflowVisible !== true ||
  manifest.sandboxTransferLifecycle?.currencySeparatedJournals !== true ||
  manifest.sandboxTransferLifecycle?.realCustomerDataEnabled !== false ||
  manifest.sandboxTransferLifecycle?.realBeneficiaryDataEnabled !== false ||
  manifest.sandboxTransferLifecycle?.providerSandboxConnectivityEnabled !== false ||
  manifest.sandboxTransferLifecycle?.browserTransferCreationEnabled !== false ||
  manifest.sandboxTransferLifecycle?.serviceTransferCreationEnabled !== false ||
  manifest.sandboxTransferLifecycle?.webhookIngestionEnabled !== false ||
  manifest.sandboxTransferLifecycle?.financialLedgerPostingEnabled !== false ||
  manifest.sandboxTransferLifecycle?.retryExecutionEnabled !== false ||
  manifest.sandboxTransferLifecycle?.reconciliationWriteEnabled !== false ||
  manifest.sandboxTransferLifecycle?.rescueOperatorActionEnabled !== false ||
  manifest.sandboxTransferLifecycle?.disputeCaseWritesEnabled !== false ||
  manifest.sandboxTransferLifecycle?.refundExecutionEnabled !== false ||
  manifest.sandboxTransferLifecycle?.productionProviderConnectivityEnabled !== false ||
  manifest.sandboxTransferLifecycle?.quoteAcceptanceEnabled !== false ||
  manifest.sandboxTransferLifecycle?.paymentExecutionEnabled !== false ||
  manifest.sandboxTransferLifecycle?.moneyMovementEnabled !== false ||
  manifest.sandboxTransferLifecycle?.customerFundingEnabled !== false ||
  manifest.sandboxTransferLifecycle?.custodyEnabled !== false ||
  manifest.sandboxTransferLifecycle?.settlementEnabled !== false
) {
  throw new Error('Deployed sandbox-transfer lifecycle boundary is incomplete or operational.')
}
if (
  manifest.controlledMoneyMovement?.workspaceEnabled !== true ||
  manifest.controlledMoneyMovement?.corridorCount !== 4 ||
  manifest.controlledMoneyMovement?.requirementCount !== 48 ||
  manifest.controlledMoneyMovement?.requirementsPerCorridor !== 12 ||
  manifest.controlledMoneyMovement?.approvalDomainCount !== 8 ||
  manifest.controlledMoneyMovement?.publicSanitizedRequirementLedger !== true ||
  manifest.controlledMoneyMovement?.appendOnlyApprovalEvidence !== true ||
  manifest.controlledMoneyMovement?.rawApprovalDocumentsStored !== false ||
  manifest.controlledMoneyMovement?.reviewerIdentitiesExposed !== false ||
  manifest.controlledMoneyMovement?.manualActivationReviewRequired !== true ||
  manifest.controlledMoneyMovement?.activationStatus !== 'blocked' ||
  manifest.controlledMoneyMovement?.realCustomerDataEnabled !== false ||
  manifest.controlledMoneyMovement?.realBeneficiaryDataEnabled !== false ||
  manifest.controlledMoneyMovement?.productionPartnerConnectivityEnabled !== false ||
  manifest.controlledMoneyMovement?.safeguardingAccountActivationEnabled !== false ||
  manifest.controlledMoneyMovement?.customerFundingEnabled !== false ||
  manifest.controlledMoneyMovement?.quoteAcceptanceEnabled !== false ||
  manifest.controlledMoneyMovement?.transferCreationEnabled !== false ||
  manifest.controlledMoneyMovement?.webhookIngestionEnabled !== false ||
  manifest.controlledMoneyMovement?.financialLedgerPostingEnabled !== false ||
  manifest.controlledMoneyMovement?.reconciliationWriteEnabled !== false ||
  manifest.controlledMoneyMovement?.rescueOperatorActionEnabled !== false ||
  manifest.controlledMoneyMovement?.disputeCaseWritesEnabled !== false ||
  manifest.controlledMoneyMovement?.refundExecutionEnabled !== false ||
  manifest.controlledMoneyMovement?.paymentExecutionEnabled !== false ||
  manifest.controlledMoneyMovement?.moneyMovementEnabled !== false ||
  manifest.controlledMoneyMovement?.custodyEnabled !== false ||
  manifest.controlledMoneyMovement?.settlementEnabled !== false ||
  manifest.controlledMoneyMovement?.automaticActivationEnabled !== false
) {
  throw new Error('Deployed controlled money-movement readiness boundary is incomplete or operational.')
}
if (
  manifest.internationalMultiAssetPaperTrading?.workspaceEnabled !== true ||
  manifest.internationalMultiAssetPaperTrading?.isolatedSimulationLedger !== true ||
  manifest.internationalMultiAssetPaperTrading?.venueCount !== 6 ||
  manifest.internationalMultiAssetPaperTrading?.listingCount !== 12 ||
  manifest.internationalMultiAssetPaperTrading?.virtualCurrencyCount !== 5 ||
  manifest.internationalMultiAssetPaperTrading?.balancedJournalRequired !== true ||
  manifest.internationalMultiAssetPaperTrading?.reconciliationEnabled !== true ||
  manifest.internationalMultiAssetPaperTrading?.deterministicScenarioFixtures !== true ||
  manifest.internationalMultiAssetPaperTrading?.liveMarketDataConnectivityEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.orderRoutingEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.brokerConnectivityEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.customerFundingEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.custodyEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.realSettlementEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.marginEnabled !== false ||
  manifest.internationalMultiAssetPaperTrading?.shortSellingEnabled !== false
) {
  throw new Error('Deployed international paper-trading boundary is incomplete or connected to live execution.')
}
if (
  manifest.globalVenueInstrumentIntelligence?.workspaceEnabled !== true ||
  manifest.globalVenueInstrumentIntelligence?.venueCount !== 6 ||
  manifest.globalVenueInstrumentIntelligence?.listingCount !== 12 ||
  manifest.globalVenueInstrumentIntelligence?.residencyScenarioCount !== 4 ||
  manifest.globalVenueInstrumentIntelligence?.venueQualifiedListingIdentity !== true ||
  manifest.globalVenueInstrumentIntelligence?.calendarEvidenceVisible !== true ||
  manifest.globalVenueInstrumentIntelligence?.settlementUnknownNeverAssumed !== true ||
  manifest.globalVenueInstrumentIntelligence?.corporateActionEvidenceVisible !== true ||
  manifest.globalVenueInstrumentIntelligence?.displayRightsFailClosed !== true ||
  manifest.globalVenueInstrumentIntelligence?.referenceMetadataOnly !== true ||
  manifest.globalVenueInstrumentIntelligence?.liveMarketDataConnectivityEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.customerEntitlementAssignmentEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.automaticJurisdictionApprovalEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.orderPreviewEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.orderRoutingEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.brokerConnectivityEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.customerFundingEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.custodyEnabled !== false ||
  manifest.globalVenueInstrumentIntelligence?.settlementEnabled !== false
) {
  throw new Error('Deployed global venue and instrument intelligence boundary is incomplete or operational.')
}

console.log(
  `Verified Phase ${manifest.phase} controlled-beta deployment at ${baseUrl.origin}: exact manifest, HTTPS policy and execution locks passed.`,
)
