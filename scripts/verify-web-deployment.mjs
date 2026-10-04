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
  manifest.optionsEducationPaperTrading?.workspaceEnabled !== true ||
  manifest.optionsEducationPaperTrading?.educationOnly !== true ||
  manifest.optionsEducationPaperTrading?.isolatedSimulationLedger !== true ||
  manifest.optionsEducationPaperTrading?.chainContractCount !== 8 ||
  manifest.optionsEducationPaperTrading?.underlyingCount !== 2 ||
  manifest.optionsEducationPaperTrading?.supportedStrategyCount !== 4 ||
  manifest.optionsEducationPaperTrading?.definedRiskDebitSpreadsEnabled !== true ||
  manifest.optionsEducationPaperTrading?.payoffDiagramVisible !== true ||
  manifest.optionsEducationPaperTrading?.breakEvenAndMaximumRiskVisible !== true ||
  manifest.optionsEducationPaperTrading?.balancedJournalRequired !== true ||
  manifest.optionsEducationPaperTrading?.reconciliationEnabled !== true ||
  manifest.optionsEducationPaperTrading?.deterministicScenarioFixtures !== true ||
  manifest.optionsEducationPaperTrading?.forecastPermissionOverrideEnabled !== false ||
  manifest.optionsEducationPaperTrading?.liveMarketDataConnectivityEnabled !== false ||
  manifest.optionsEducationPaperTrading?.liveOptionsRoutingEnabled !== false ||
  manifest.optionsEducationPaperTrading?.brokerConnectivityEnabled !== false ||
  manifest.optionsEducationPaperTrading?.customerFundingEnabled !== false ||
  manifest.optionsEducationPaperTrading?.realPositionsEnabled !== false ||
  manifest.optionsEducationPaperTrading?.custodyEnabled !== false ||
  manifest.optionsEducationPaperTrading?.realSettlementEnabled !== false ||
  manifest.optionsEducationPaperTrading?.marginEnabled !== false ||
  manifest.optionsEducationPaperTrading?.uncoveredShortOptionsEnabled !== false ||
  manifest.optionsEducationPaperTrading?.automaticOptionsPermissionEnabled !== false
) {
  throw new Error('Deployed options education boundary is incomplete or connected to live execution.')
}
if (
  manifest.globalBrokerageCustody?.workspaceEnabled !== true ||
  manifest.globalBrokerageCustody?.failClosedOrchestration !== true ||
  manifest.globalBrokerageCustody?.launchMatrixCount !== 4 ||
  manifest.globalBrokerageCustody?.partnerRoleCount !== 5 ||
  manifest.globalBrokerageCustody?.onboardingRequirementCount !== 10 ||
  manifest.globalBrokerageCustody?.approvalDomainCount !== 8 ||
  manifest.globalBrokerageCustody?.partnersPerPreview !== 5 ||
  manifest.globalBrokerageCustody?.reconciliationDomainCount !== 5 ||
  manifest.globalBrokerageCustody?.identityBoundEvidenceRehearsal !== true ||
  manifest.globalBrokerageCustody?.expiringEvidenceRehearsal !== true ||
  manifest.globalBrokerageCustody?.rawEvidenceStorageEnabled !== false ||
  manifest.globalBrokerageCustody?.approvalEffectEnabled !== false ||
  manifest.globalBrokerageCustody?.deterministicCostPreviewEnabled !== true ||
  manifest.globalBrokerageCustody?.buyingPowerAvailable !== false ||
  manifest.globalBrokerageCustody?.routeOptionCount !== 0 ||
  manifest.globalBrokerageCustody?.crossBorderPaymentsSeparated !== true ||
  manifest.globalBrokerageCustody?.liveBrokerConnectivityEnabled !== false ||
  manifest.globalBrokerageCustody?.exchangeAccessAssigned !== false ||
  manifest.globalBrokerageCustody?.exchangeConnectivityEnabled !== false ||
  manifest.globalBrokerageCustody?.clearingConnectivityEnabled !== false ||
  manifest.globalBrokerageCustody?.custodyAccountsEnabled !== false ||
  manifest.globalBrokerageCustody?.customerAssetSafeguardingEnabled !== false ||
  manifest.globalBrokerageCustody?.realCashLedgerEnabled !== false ||
  manifest.globalBrokerageCustody?.realPositionLedgerEnabled !== false ||
  manifest.globalBrokerageCustody?.settlementInstructionsEnabled !== false ||
  manifest.globalBrokerageCustody?.marketDataCredentialsEnabled !== false ||
  manifest.globalBrokerageCustody?.crossBorderFundingLinkEnabled !== false ||
  manifest.globalBrokerageCustody?.liveOrderRoutingEnabled !== false ||
  manifest.globalBrokerageCustody?.automaticActivationEnabled !== false
) {
  throw new Error('Deployed global brokerage and custody boundary is incomplete or operational.')
}
if (
  manifest.agenticInvesting?.workspaceEnabled !== true ||
  manifest.agenticInvesting?.topLevelAccountAccess !== true ||
  manifest.agenticInvesting?.privateConversationHistory !== true ||
  manifest.agenticInvesting?.serverStoredReportDefinitions !== true ||
  manifest.agenticInvesting?.groundedResponsesRequired !== true ||
  manifest.agenticInvesting?.citationsRequired !== true ||
  manifest.agenticInvesting?.continuousCandidateTrainingEnabled !== true ||
  manifest.agenticInvesting?.licensedNewsFeaturesSupported !== true ||
  manifest.agenticInvesting?.walkForwardValidationRequired !== true ||
  manifest.agenticInvesting?.leakageGapRequired !== true ||
  manifest.agenticInvesting?.costAwareBacktestRequired !== true ||
  manifest.agenticInvesting?.humanModelPromotionRequired !== true ||
  manifest.agenticInvesting?.promptTrainingDefaultOptIn !== false ||
  manifest.agenticInvesting?.rawNewsStorageEnabled !== false ||
  manifest.agenticInvesting?.externalLlmConnected !== false ||
  manifest.agenticInvesting?.productionNewsProviderConnected !== false ||
  manifest.agenticInvesting?.directSelfPromotionEnabled !== false ||
  manifest.agenticInvesting?.autonomousTradeExecutionEnabled !== false ||
  manifest.agenticInvesting?.customerFundingEnabled !== false
) {
  throw new Error('Deployed agentic-investing boundary is incomplete or unsafe.')
}
if (
  manifest.globalEventIntelligence?.workspaceEnabled !== true ||
  manifest.globalEventIntelligence?.sourceAuthenticityRequired !== true ||
  manifest.globalEventIntelligence?.multiSourceCorroborationRequired !== true ||
  manifest.globalEventIntelligence?.causalImpactGraphEnabled !== true ||
  manifest.globalEventIntelligence?.scenarioForecastingEnabled !== true ||
  manifest.globalEventIntelligence?.personalizedAlertsEnabled !== true ||
  manifest.globalEventIntelligence?.countryCoverageTarget !== 195 ||
  manifest.globalEventIntelligence?.cataloguedCountryCount !== 12 ||
  manifest.globalEventIntelligence?.syntheticEventCount !== 5 ||
  manifest.globalEventIntelligence?.causalImpactEdgeCount !== 9 ||
  manifest.globalEventIntelligence?.terminalScenarioCount !== 6 ||
  manifest.globalEventIntelligence?.privateInAppAlerts !== true ||
  manifest.globalEventIntelligence?.humanReviewRequired !== true ||
  manifest.globalEventIntelligence?.syntheticModelTrainingEnabled !== false ||
  manifest.globalEventIntelligence?.rawWebScrapingEnabled !== false ||
  manifest.globalEventIntelligence?.credentialedSourceBypassEnabled !== false ||
  manifest.globalEventIntelligence?.unlicensedContentStorageEnabled !== false ||
  manifest.globalEventIntelligence?.automaticVerificationWithoutEvidenceEnabled !== false ||
  manifest.globalEventIntelligence?.rumorPromotionEnabled !== false ||
  manifest.globalEventIntelligence?.autonomousPublicationEnabled !== false ||
  manifest.globalEventIntelligence?.productionProviderConnectivityEnabled !== false ||
  manifest.globalEventIntelligence?.autonomousTradeExecutionEnabled !== false ||
  manifest.globalEventIntelligence?.customerFundingEnabled !== false ||
  manifest.globalEventIntelligence?.custodyEnabled !== false ||
  manifest.globalEventIntelligence?.settlementEnabled !== false
) {
  throw new Error('Deployed global event intelligence boundary is incomplete or unsafe.')
}
if (
  manifest.controlledLiveRollout?.workspaceEnabled !== true ||
  manifest.controlledLiveRollout?.rolloutStatus !== 'approval_required' ||
  manifest.controlledLiveRollout?.candidateCohortCount !== 3 ||
  manifest.controlledLiveRollout?.liveCohortCount !== 0 ||
  manifest.controlledLiveRollout?.cashEquitiesOnly !== true ||
  manifest.controlledLiveRollout?.scopeDecisionsPerCohort !== 10 ||
  manifest.controlledLiveRollout?.requirementCount !== 18 ||
  manifest.controlledLiveRollout?.drillTemplateCount !== 4 ||
  manifest.controlledLiveRollout?.observedOperationalDrillCount !== 0 ||
  manifest.controlledLiveRollout?.exactCohortDecisionsRequired !== true ||
  manifest.controlledLiveRollout?.approvalInheritanceEnabled !== false ||
  manifest.controlledLiveRollout?.conservativeLimitRehearsalEnabled !== true ||
  manifest.controlledLiveRollout?.limitsProductionEffect !== false ||
  manifest.controlledLiveRollout?.maximumFundingCredit !== 0 ||
  manifest.controlledLiveRollout?.appendOnlyDecisionEvidence !== true ||
  manifest.controlledLiveRollout?.appendOnlyDrillEvidence !== true ||
  manifest.controlledLiveRollout?.manualSignedActivationRequired !== true ||
  manifest.controlledLiveRollout?.browserActivationEnabled !== false ||
  manifest.controlledLiveRollout?.brokerConnectivityEnabled !== false ||
  manifest.controlledLiveRollout?.exchangeConnectivityEnabled !== false ||
  manifest.controlledLiveRollout?.liveMarketDataEnabled !== false ||
  manifest.controlledLiveRollout?.liveOrderRoutingEnabled !== false ||
  manifest.controlledLiveRollout?.customerFundingEnabled !== false ||
  manifest.controlledLiveRollout?.custodyEnabled !== false ||
  manifest.controlledLiveRollout?.settlementEnabled !== false ||
  manifest.controlledLiveRollout?.marginEnabled !== false ||
  manifest.controlledLiveRollout?.optionsEnabled !== false ||
  manifest.controlledLiveRollout?.automaticActivationEnabled !== false
) throw new Error('Deployed controlled live-rollout boundary is incomplete or operational.')
if (
  manifest.globalEvidenceOperations?.workspaceEnabled !== true ||
  manifest.globalEvidenceOperations?.countryCoverageTarget !== 195 ||
  manifest.globalEvidenceOperations?.sourceLaneCount !== 5 ||
  manifest.globalEvidenceOperations?.connectedSourceCount !== 0 ||
  manifest.globalEvidenceOperations?.corroborationPolicyCount !== 6 ||
  manifest.globalEvidenceOperations?.rehearsalCaseCount !== 5 ||
  manifest.globalEvidenceOperations?.reviewStagesPerCase !== 8 ||
  manifest.globalEvidenceOperations?.immutableProvenanceRequired !== true ||
  manifest.globalEvidenceOperations?.sourceRightsReviewRequired !== true ||
  manifest.globalEvidenceOperations?.independentCorroborationRequired !== true ||
  manifest.globalEvidenceOperations?.conflictReviewRequired !== true ||
  manifest.globalEvidenceOperations?.humanPublicationReviewRequired !== true ||
  manifest.globalEvidenceOperations?.appendOnlyDecisionEvidence !== true ||
  manifest.globalEvidenceOperations?.rawWebScrapingEnabled !== false ||
  manifest.globalEvidenceOperations?.privateSourceAccessEnabled !== false ||
  manifest.globalEvidenceOperations?.credentialBypassEnabled !== false ||
  manifest.globalEvidenceOperations?.unlicensedContentStorageEnabled !== false ||
  manifest.globalEvidenceOperations?.automaticVerificationEnabled !== false ||
  manifest.globalEvidenceOperations?.rumorPromotionEnabled !== false ||
  manifest.globalEvidenceOperations?.autonomousPublicationEnabled !== false ||
  manifest.globalEvidenceOperations?.productionIngestionEnabled !== false ||
  manifest.globalEvidenceOperations?.modelTrainingEnabled !== false ||
  manifest.globalEvidenceOperations?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global evidence operations boundary is incomplete or unsafe.')
if (
  manifest.globalCountryCoverage?.workspaceEnabled !== true ||
  manifest.globalCountryCoverage?.sovereignCountryCount !== 195 ||
  manifest.globalCountryCoverage?.intelligenceDomainCount !== 8 ||
  manifest.globalCountryCoverage?.coverageCellCount !== 1560 ||
  manifest.globalCountryCoverage?.evidenceGapCount !== 1560 ||
  manifest.globalCountryCoverage?.evidencedCountryCount !== 0 ||
  manifest.globalCountryCoverage?.reviewGateCount !== 7 ||
  manifest.globalCountryCoverage?.sovereignReferenceCatalogEnabled !== true ||
  manifest.globalCountryCoverage?.explicitEvidenceGapsRequired !== true ||
  manifest.globalCountryCoverage?.sourceRightsReviewRequired !== true ||
  manifest.globalCountryCoverage?.independentCorroborationRequired !== true ||
  manifest.globalCountryCoverage?.temporalFreshnessRequired !== true ||
  manifest.globalCountryCoverage?.humanReleaseReviewRequired !== true ||
  manifest.globalCountryCoverage?.appendOnlyCoverageReference !== true ||
  manifest.globalCountryCoverage?.liveProviderConnectivityEnabled !== false ||
  manifest.globalCountryCoverage?.generatedFactFillEnabled !== false ||
  manifest.globalCountryCoverage?.automaticCountryScoringEnabled !== false ||
  manifest.globalCountryCoverage?.productionIngestionEnabled !== false ||
  manifest.globalCountryCoverage?.modelTrainingEnabled !== false ||
  manifest.globalCountryCoverage?.autonomousPublicationEnabled !== false ||
  manifest.globalCountryCoverage?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global country coverage boundary is incomplete or unsafe.')
if (
  manifest.globalDependencyTransmission?.workspaceEnabled !== true ||
  manifest.globalDependencyTransmission?.sovereignCountryCount !== 195 ||
  manifest.globalDependencyTransmission?.dependencyDomainCount !== 8 ||
  manifest.globalDependencyTransmission?.readinessCellCount !== 1560 ||
  manifest.globalDependencyTransmission?.relationshipGapCount !== 1560 ||
  manifest.globalDependencyTransmission?.verifiedRelationshipCount !== 0 ||
  manifest.globalDependencyTransmission?.mechanismTemplateCount !== 6 ||
  manifest.globalDependencyTransmission?.reviewGateCount !== 8 ||
  manifest.globalDependencyTransmission?.explicitRelationshipGapsRequired !== true ||
  manifest.globalDependencyTransmission?.directedRelationshipEvidenceRequired !== true ||
  manifest.globalDependencyTransmission?.temporalAlignmentRequired !== true ||
  manifest.globalDependencyTransmission?.exposureMagnitudeRequired !== true ||
  manifest.globalDependencyTransmission?.substitutePathReviewRequired !== true ||
  manifest.globalDependencyTransmission?.humanReleaseReviewRequired !== true ||
  manifest.globalDependencyTransmission?.appendOnlyDependencyReference !== true ||
  manifest.globalDependencyTransmission?.liveProviderConnectivityEnabled !== false ||
  manifest.globalDependencyTransmission?.automaticRelationshipInferenceEnabled !== false ||
  manifest.globalDependencyTransmission?.generatedDependencyFillEnabled !== false ||
  manifest.globalDependencyTransmission?.automaticImpactScoringEnabled !== false ||
  manifest.globalDependencyTransmission?.productionScenarioPromotionEnabled !== false ||
  manifest.globalDependencyTransmission?.modelTrainingEnabled !== false ||
  manifest.globalDependencyTransmission?.autonomousPublicationEnabled !== false ||
  manifest.globalDependencyTransmission?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global dependency transmission boundary is incomplete or unsafe.')
if (
  manifest.globalObservationProvenance?.workspaceEnabled !== true ||
  manifest.globalObservationProvenance?.sourceFamilyCount !== 8 ||
  manifest.globalObservationProvenance?.disconnectedSourceCount !== 8 ||
  manifest.globalObservationProvenance?.normalizationContractCount !== 9 ||
  manifest.globalObservationProvenance?.quarantineLaneCount !== 8 ||
  manifest.globalObservationProvenance?.candidateObservationCount !== 0 ||
  manifest.globalObservationProvenance?.releasedObservationCount !== 0 ||
  manifest.globalObservationProvenance?.releaseGateCount !== 8 ||
  manifest.globalObservationProvenance?.immutableProvenanceRequired !== true ||
  manifest.globalObservationProvenance?.sourceRightsRequired !== true ||
  manifest.globalObservationProvenance?.schemaValidationRequired !== true ||
  manifest.globalObservationProvenance?.unitNormalizationRequired !== true ||
  manifest.globalObservationProvenance?.temporalLineageRequired !== true ||
  manifest.globalObservationProvenance?.independentCorroborationRequired !== true ||
  manifest.globalObservationProvenance?.conflictQuarantineRequired !== true ||
  manifest.globalObservationProvenance?.humanReleaseReviewRequired !== true ||
  manifest.globalObservationProvenance?.appendOnlyReferenceContracts !== true ||
  manifest.globalObservationProvenance?.liveProviderConnectivityEnabled !== false ||
  manifest.globalObservationProvenance?.productionIngestionEnabled !== false ||
  manifest.globalObservationProvenance?.automaticNormalizationApprovalEnabled !== false ||
  manifest.globalObservationProvenance?.automaticConflictResolutionEnabled !== false ||
  manifest.globalObservationProvenance?.automaticReleaseEnabled !== false ||
  manifest.globalObservationProvenance?.modelTrainingEnabled !== false ||
  manifest.globalObservationProvenance?.autonomousPublicationEnabled !== false ||
  manifest.globalObservationProvenance?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global observation provenance boundary is incomplete or unsafe.')
if (
  manifest.globalProviderCertification?.workspaceEnabled !== true ||
  manifest.globalProviderCertification?.sourceFamilyCount !== 8 ||
  manifest.globalProviderCertification?.unselectedProviderCount !== 8 ||
  manifest.globalProviderCertification?.certifiedProviderCount !== 0 ||
  manifest.globalProviderCertification?.certificationGateCount !== 10 ||
  manifest.globalProviderCertification?.isolationProfileCount !== 8 ||
  manifest.globalProviderCertification?.unprovisionedIsolationCount !== 8 ||
  manifest.globalProviderCertification?.failureDrillCount !== 6 ||
  manifest.globalProviderCertification?.observedDrillCount !== 0 ||
  manifest.globalProviderCertification?.namedLegalOwnerRequired !== true ||
  manifest.globalProviderCertification?.sourceRightsReviewRequired !== true ||
  manifest.globalProviderCertification?.privacySecurityReviewRequired !== true ||
  manifest.globalProviderCertification?.versionedSchemaContractRequired !== true ||
  manifest.globalProviderCertification?.boundedIsolationRequired !== true ||
  manifest.globalProviderCertification?.accountableHumanActivationRequired !== true ||
  manifest.globalProviderCertification?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderCertification?.providerSelectionEnabled !== false ||
  manifest.globalProviderCertification?.endpointTestingEnabled !== false ||
  manifest.globalProviderCertification?.credentialStorageEnabled !== false ||
  manifest.globalProviderCertification?.candidateIntakeEnabled !== false ||
  manifest.globalProviderCertification?.productionIngestionEnabled !== false ||
  manifest.globalProviderCertification?.automaticCertificationEnabled !== false ||
  manifest.globalProviderCertification?.observationReleaseEnabled !== false ||
  manifest.globalProviderCertification?.modelTrainingEnabled !== false ||
  manifest.globalProviderCertification?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderCertification?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider certification boundary is incomplete or unsafe.')
if (
  manifest.globalProviderContractTests?.workspaceEnabled !== true ||
  manifest.globalProviderContractTests?.sourceFamilyCount !== 8 ||
  manifest.globalProviderContractTests?.contractSuiteCount !== 8 ||
  manifest.globalProviderContractTests?.specificationOnlySuiteCount !== 8 ||
  manifest.globalProviderContractTests?.assertionCount !== 10 ||
  manifest.globalProviderContractTests?.syntheticFixtureCount !== 24 ||
  manifest.globalProviderContractTests?.executedTestCount !== 0 ||
  manifest.globalProviderContractTests?.passedTestCount !== 0 ||
  manifest.globalProviderContractTests?.fixtureExecutionCount !== 0 ||
  manifest.globalProviderContractTests?.deterministicFixtureRequired !== true ||
  manifest.globalProviderContractTests?.explicitMissingnessRequired !== true ||
  manifest.globalProviderContractTests?.schemaVersionRequired !== true ||
  manifest.globalProviderContractTests?.failClosedDispositionRequired !== true ||
  manifest.globalProviderContractTests?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderContractTests?.providerSelectionEnabled !== false ||
  manifest.globalProviderContractTests?.endpointExecutionEnabled !== false ||
  manifest.globalProviderContractTests?.credentialAccessEnabled !== false ||
  manifest.globalProviderContractTests?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderContractTests?.syntheticFixtureExecutionEnabled !== false ||
  manifest.globalProviderContractTests?.candidateWriteEnabled !== false ||
  manifest.globalProviderContractTests?.automaticConformanceApprovalEnabled !== false ||
  manifest.globalProviderContractTests?.observationReleaseEnabled !== false ||
  manifest.globalProviderContractTests?.modelTrainingEnabled !== false ||
  manifest.globalProviderContractTests?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderContractTests?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider contract-test boundary is incomplete or unsafe.')
if (
  manifest.globalProviderCandidateReviews?.workspaceEnabled !== true ||
  manifest.globalProviderCandidateReviews?.sourceFamilyCount !== 8 ||
  manifest.globalProviderCandidateReviews?.reviewPacketCount !== 8 ||
  manifest.globalProviderCandidateReviews?.unopenedReviewPacketCount !== 8 ||
  manifest.globalProviderCandidateReviews?.selectedCandidateCount !== 0 ||
  manifest.globalProviderCandidateReviews?.evidenceRequirementCount !== 12 ||
  manifest.globalProviderCandidateReviews?.reviewMatrixCount !== 96 ||
  manifest.globalProviderCandidateReviews?.missingEvidenceCount !== 96 ||
  manifest.globalProviderCandidateReviews?.approvedEvidenceCount !== 0 ||
  manifest.globalProviderCandidateReviews?.manualReviewRequired !== true ||
  manifest.globalProviderCandidateReviews?.signedEvidenceReferenceRequired !== true ||
  manifest.globalProviderCandidateReviews?.versionedFieldMappingRequired !== true ||
  manifest.globalProviderCandidateReviews?.observedFailureDrillRequired !== true ||
  manifest.globalProviderCandidateReviews?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderCandidateReviews?.providerCandidateSelectionEnabled !== false ||
  manifest.globalProviderCandidateReviews?.reviewPacketOpenEnabled !== false ||
  manifest.globalProviderCandidateReviews?.evidenceSubmissionEnabled !== false ||
  manifest.globalProviderCandidateReviews?.evidenceDocumentStorageEnabled !== false ||
  manifest.globalProviderCandidateReviews?.endpointConnectivityEnabled !== false ||
  manifest.globalProviderCandidateReviews?.credentialStorageEnabled !== false ||
  manifest.globalProviderCandidateReviews?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderCandidateReviews?.fixtureExecutionEnabled !== false ||
  manifest.globalProviderCandidateReviews?.conformanceApprovalEnabled !== false ||
  manifest.globalProviderCandidateReviews?.candidateWriteEnabled !== false ||
  manifest.globalProviderCandidateReviews?.observationReleaseEnabled !== false ||
  manifest.globalProviderCandidateReviews?.modelTrainingEnabled !== false ||
  manifest.globalProviderCandidateReviews?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderCandidateReviews?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider candidate-review boundary is incomplete or unsafe.')
if (
  manifest.globalProviderReviewGovernance?.workspaceEnabled !== true ||
  manifest.globalProviderReviewGovernance?.sourceFamilyCount !== 8 ||
  manifest.globalProviderReviewGovernance?.roleTemplateCount !== 8 ||
  manifest.globalProviderReviewGovernance?.unassignedRoleCount !== 8 ||
  manifest.globalProviderReviewGovernance?.lifecycleStageCount !== 7 ||
  manifest.globalProviderReviewGovernance?.responsibilityCount !== 64 ||
  manifest.globalProviderReviewGovernance?.unassignedResponsibilityCount !== 64 ||
  manifest.globalProviderReviewGovernance?.authorizedResponsibilityCount !== 0 ||
  manifest.globalProviderReviewGovernance?.independentReviewRequired !== true ||
  manifest.globalProviderReviewGovernance?.separationOfDutiesRequired !== true ||
  manifest.globalProviderReviewGovernance?.leastPrivilegeCustodyRequired !== true ||
  manifest.globalProviderReviewGovernance?.dualControlActivationRequired !== true ||
  manifest.globalProviderReviewGovernance?.expiryAndRevocationRequired !== true ||
  manifest.globalProviderReviewGovernance?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderReviewGovernance?.roleAssignmentEnabled !== false ||
  manifest.globalProviderReviewGovernance?.reviewerIdentityStorageEnabled !== false ||
  manifest.globalProviderReviewGovernance?.evidenceReceiptEnabled !== false ||
  manifest.globalProviderReviewGovernance?.evidenceDocumentStorageEnabled !== false ||
  manifest.globalProviderReviewGovernance?.custodyLocationProvisioningEnabled !== false ||
  manifest.globalProviderReviewGovernance?.providerCandidateSelectionEnabled !== false ||
  manifest.globalProviderReviewGovernance?.reviewPacketOpenEnabled !== false ||
  manifest.globalProviderReviewGovernance?.evidenceSubmissionEnabled !== false ||
  manifest.globalProviderReviewGovernance?.endpointConnectivityEnabled !== false ||
  manifest.globalProviderReviewGovernance?.credentialStorageEnabled !== false ||
  manifest.globalProviderReviewGovernance?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderReviewGovernance?.fixtureExecutionEnabled !== false ||
  manifest.globalProviderReviewGovernance?.conformanceApprovalEnabled !== false ||
  manifest.globalProviderReviewGovernance?.candidateWriteEnabled !== false ||
  manifest.globalProviderReviewGovernance?.observationReleaseEnabled !== false ||
  manifest.globalProviderReviewGovernance?.modelTrainingEnabled !== false ||
  manifest.globalProviderReviewGovernance?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderReviewGovernance?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider review-governance boundary is incomplete or unsafe.')
if (
  manifest.globalProviderReviewDecisions?.workspaceEnabled !== true ||
  manifest.globalProviderReviewDecisions?.sourceFamilyCount !== 8 ||
  manifest.globalProviderReviewDecisions?.decisionGateCount !== 8 ||
  manifest.globalProviderReviewDecisions?.decisionStateCount !== 7 ||
  manifest.globalProviderReviewDecisions?.readinessCellCount !== 64 ||
  manifest.globalProviderReviewDecisions?.unmetReadinessCellCount !== 64 ||
  manifest.globalProviderReviewDecisions?.authorizedReadinessCellCount !== 0 ||
  manifest.globalProviderReviewDecisions?.independentDecisionRequired !== true ||
  manifest.globalProviderReviewDecisions?.dualControlQuorumRequired !== true ||
  manifest.globalProviderReviewDecisions?.immutableAuditRequired !== true ||
  manifest.globalProviderReviewDecisions?.explicitReasonCodeRequired !== true ||
  manifest.globalProviderReviewDecisions?.expiryAndRevocationRequired !== true ||
  manifest.globalProviderReviewDecisions?.conflictOfInterestReviewRequired !== true ||
  manifest.globalProviderReviewDecisions?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderReviewDecisions?.decisionRecordingEnabled !== false ||
  manifest.globalProviderReviewDecisions?.reviewerSignatureStorageEnabled !== false ||
  manifest.globalProviderReviewDecisions?.evidenceLinkageEnabled !== false ||
  manifest.globalProviderReviewDecisions?.automatedQuorumEvaluationEnabled !== false ||
  manifest.globalProviderReviewDecisions?.providerCandidateSelectionEnabled !== false ||
  manifest.globalProviderReviewDecisions?.reviewPacketOpenEnabled !== false ||
  manifest.globalProviderReviewDecisions?.endpointConnectivityEnabled !== false ||
  manifest.globalProviderReviewDecisions?.credentialStorageEnabled !== false ||
  manifest.globalProviderReviewDecisions?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderReviewDecisions?.fixtureExecutionEnabled !== false ||
  manifest.globalProviderReviewDecisions?.conformanceApprovalEnabled !== false ||
  manifest.globalProviderReviewDecisions?.candidateWriteEnabled !== false ||
  manifest.globalProviderReviewDecisions?.observationReleaseEnabled !== false ||
  manifest.globalProviderReviewDecisions?.modelTrainingEnabled !== false ||
  manifest.globalProviderReviewDecisions?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderReviewDecisions?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider review decision-control boundary is incomplete or unsafe.')
if (
  manifest.globalProviderDecisionRecovery?.workspaceEnabled !== true ||
  manifest.globalProviderDecisionRecovery?.sourceFamilyCount !== 8 ||
  manifest.globalProviderDecisionRecovery?.recoveryTriggerCount !== 8 ||
  manifest.globalProviderDecisionRecovery?.recoveryStateCount !== 7 ||
  manifest.globalProviderDecisionRecovery?.recoveryCellCount !== 64 ||
  manifest.globalProviderDecisionRecovery?.blockedRecoveryCellCount !== 64 ||
  manifest.globalProviderDecisionRecovery?.authorizedRecoveryCellCount !== 0 ||
  manifest.globalProviderDecisionRecovery?.immediateFailClosedFreezeRequired !== true ||
  manifest.globalProviderDecisionRecovery?.independentRecoveryReviewRequired !== true ||
  manifest.globalProviderDecisionRecovery?.rollbackRehearsalRequired !== true ||
  manifest.globalProviderDecisionRecovery?.immutableRecoveryAuditRequired !== true ||
  manifest.globalProviderDecisionRecovery?.explicitRecoveryReasonRequired !== true ||
  manifest.globalProviderDecisionRecovery?.expiryAndRevocationEnforced !== true ||
  manifest.globalProviderDecisionRecovery?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderDecisionRecovery?.exceptionRecordingEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.decisionChallengeRecordingEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.investigatorIdentityStorageEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.recoveryEvidenceLinkageEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.automatedFreezeEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.rollbackExecutionEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.decisionRevocationEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.providerCandidateSelectionEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.reviewPacketOpenEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.endpointConnectivityEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.credentialStorageEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.fixtureExecutionEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.conformanceApprovalEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.candidateWriteEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.observationReleaseEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.modelTrainingEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderDecisionRecovery?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider decision recovery-control boundary is incomplete or unsafe.')
if (
  manifest.globalProviderActivationReadiness?.workspaceEnabled !== true ||
  manifest.globalProviderActivationReadiness?.sourceFamilyCount !== 8 ||
  manifest.globalProviderActivationReadiness?.activationGateCount !== 8 ||
  manifest.globalProviderActivationReadiness?.activationStateCount !== 7 ||
  manifest.globalProviderActivationReadiness?.readinessCellCount !== 64 ||
  manifest.globalProviderActivationReadiness?.blockedReadinessCellCount !== 64 ||
  manifest.globalProviderActivationReadiness?.authorizedReadinessCellCount !== 0 ||
  manifest.globalProviderActivationReadiness?.independentActivationAuthorizationRequired !== true ||
  manifest.globalProviderActivationReadiness?.dualControlActivationRequired !== true ||
  manifest.globalProviderActivationReadiness?.boundedMaintenanceWindowRequired !== true ||
  manifest.globalProviderActivationReadiness?.preActivationSnapshotRequired !== true ||
  manifest.globalProviderActivationReadiness?.testedAbortAndRestorationRequired !== true ||
  manifest.globalProviderActivationReadiness?.postActivationVerificationRequired !== true ||
  manifest.globalProviderActivationReadiness?.immutableChangeAuditRequired !== true ||
  manifest.globalProviderActivationReadiness?.expiryAndRevocationEnforced !== true ||
  manifest.globalProviderActivationReadiness?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderActivationReadiness?.activationRequestRecordingEnabled !== false ||
  manifest.globalProviderActivationReadiness?.activationAuthorizationRecordingEnabled !== false ||
  manifest.globalProviderActivationReadiness?.maintenanceWindowSchedulingEnabled !== false ||
  manifest.globalProviderActivationReadiness?.providerCandidateSelectionEnabled !== false ||
  manifest.globalProviderActivationReadiness?.endpointConnectivityEnabled !== false ||
  manifest.globalProviderActivationReadiness?.credentialStorageEnabled !== false ||
  manifest.globalProviderActivationReadiness?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderActivationReadiness?.fixtureExecutionEnabled !== false ||
  manifest.globalProviderActivationReadiness?.conformanceApprovalEnabled !== false ||
  manifest.globalProviderActivationReadiness?.providerActivationEnabled !== false ||
  manifest.globalProviderActivationReadiness?.candidateWriteEnabled !== false ||
  manifest.globalProviderActivationReadiness?.observationReleaseEnabled !== false ||
  manifest.globalProviderActivationReadiness?.modelTrainingEnabled !== false ||
  manifest.globalProviderActivationReadiness?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderActivationReadiness?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider activation-readiness boundary is incomplete or unsafe.')
if (
  manifest.globalProviderActivationRehearsal?.workspaceEnabled !== true ||
  manifest.globalProviderActivationRehearsal?.sourceFamilyCount !== 8 ||
  manifest.globalProviderActivationRehearsal?.rehearsalGateCount !== 8 ||
  manifest.globalProviderActivationRehearsal?.rehearsalStateCount !== 7 ||
  manifest.globalProviderActivationRehearsal?.rehearsalCellCount !== 64 ||
  manifest.globalProviderActivationRehearsal?.blockedRehearsalCellCount !== 64 ||
  manifest.globalProviderActivationRehearsal?.authorizedRehearsalCellCount !== 0 ||
  manifest.globalProviderActivationRehearsal?.isolatedNonproductionEnvironmentRequired !== true ||
  manifest.globalProviderActivationRehearsal?.syntheticOnlyInputsRequired !== true ||
  manifest.globalProviderActivationRehearsal?.outboundEgressAllowlistRequired !== true ||
  manifest.globalProviderActivationRehearsal?.ephemeralSecretCustodyRequired !== true ||
  manifest.globalProviderActivationRehearsal?.preRehearsalSnapshotRequired !== true ||
  manifest.globalProviderActivationRehearsal?.testedAbortAndRestorationRequired !== true ||
  manifest.globalProviderActivationRehearsal?.postRehearsalVerificationRequired !== true ||
  manifest.globalProviderActivationRehearsal?.independentCloseoutRequired !== true ||
  manifest.globalProviderActivationRehearsal?.immutableRehearsalAuditRequired !== true ||
  manifest.globalProviderActivationRehearsal?.expiryAndRevocationEnforced !== true ||
  manifest.globalProviderActivationRehearsal?.appendOnlyReferenceContracts !== true ||
  manifest.globalProviderActivationRehearsal?.rehearsalRequestRecordingEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.rehearsalWindowSchedulingEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.isolatedEgressTestEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.syntheticCredentialBindingEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.syntheticPayloadExecutionEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.abortDrillExecutionEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.restorationDrillExecutionEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.reconciliationExecutionEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.providerCandidateSelectionEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.endpointConnectivityEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.credentialStorageEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.externalPayloadIntakeEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.fixtureExecutionEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.conformanceApprovalEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.providerActivationEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.candidateWriteEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.observationReleaseEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.modelTrainingEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.autonomousPublicationEnabled !== false ||
  manifest.globalProviderActivationRehearsal?.autonomousTradeExecutionEnabled !== false
) throw new Error('Deployed global provider activation-rehearsal boundary is incomplete or unsafe.')
if (
  manifest.externalAudienceLaunchReadiness?.workspaceEnabled !== true ||
  manifest.externalAudienceLaunchReadiness?.audienceSurfaceCount !== 8 ||
  manifest.externalAudienceLaunchReadiness?.launchGateCount !== 8 ||
  manifest.externalAudienceLaunchReadiness?.launchStateCount !== 7 ||
  manifest.externalAudienceLaunchReadiness?.readinessCellCount !== 64 ||
  manifest.externalAudienceLaunchReadiness?.blockedReadinessCellCount !== 64 ||
  manifest.externalAudienceLaunchReadiness?.authorizedReadinessCellCount !== 0 ||
  manifest.externalAudienceLaunchReadiness?.protectedProductionDomainRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.exactAuthOriginAndRedirectsRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.customAuthDeliveryAndAbuseControlsRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.publishedLegalPrivacyRiskSupportRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.productionMonitoringOnCallIncidentRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.approvedExternalCohortAndFeedbackRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.accessibilityPerformanceCapacityEvidenceRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.dataRightsFreshnessAndLabelsRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.releaseRollbackExpiryRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.independentHumanLaunchAuthorizationRequired !== true ||
  manifest.externalAudienceLaunchReadiness?.appendOnlyReferenceContracts !== true ||
  manifest.externalAudienceLaunchReadiness?.publicSignupEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.unrestrictedDiscoveryEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.automatedTesterProvisioningEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.externalAudienceActivationEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.liveProviderConnectivityEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.productionCredentialStorageEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.productionPayloadIntakeEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.unrestrictedCustomerDataCollectionEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.autonomousPublicationEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.modelTrainingEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.liveOrderRoutingEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.paymentExecutionEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.moneyMovementEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.custodyEnabled !== false ||
  manifest.externalAudienceLaunchReadiness?.settlementEnabled !== false
) throw new Error('Deployed external audience launch-readiness boundary is incomplete or unsafe.')
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
