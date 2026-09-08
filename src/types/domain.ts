export type MarketAssetSnapshot = {
  id: number
  symbol: string
  name: string
  asset_type: string
  currency: string | null
  price: number | null
  change_percent: number | null
  source: string | null
  observed_at: string | null
}

export type TradeKpi = {
  label: string
  value: string
  change: string
  note: string
  tone: 'positive' | 'negative' | 'neutral'
}

export type TradeTrendPoint = {
  period: string
  exports: number
  imports: number
  balance: number
}

export type CountryTradeSnapshot = {
  isoCode: string
  country: string
  exports: number
  imports: number
  balance: number
  growthPercent: number | null
  periodDate: string
}

export type TradeDashboard = {
  kpis: TradeKpi[]
  trend: TradeTrendPoint[]
  countries: CountryTradeSnapshot[]
}

export type MarketForecast = {
  id: number
  symbol: string
  assetName: string
  horizonHours: number
  predictedPrice: number
  lowerBound: number | null
  upperBound: number | null
  confidence: number | null
  direction: 'up' | 'down' | 'flat'
  modelName: string
  modelVersion: string
  baselineMae: number | null
  modelMae: number | null
  directionalAccuracy: number | null
  governanceStatus: 'insufficient_evidence' | 'qualified' | 'watch' | 'suspended'
  reliabilityEvaluationCount: number
  productionModelMae: number | null
  productionBaselineMae: number | null
  productionMaeImprovementPercent: number | null
  productionMape: number | null
  productionDirectionalAccuracy: number | null
  productionIntervalCoverage: number | null
  reliabilityReasons: string[]
  generatedAt: string
  targetAt: string
}

export type PaymentCorridorRoute = {
  id: number
  routeCode: string
  corridorId: number
  corridorCode: string
  sourceCurrency: string
  destinationCurrency: string
  fxSymbol: string
  rateOperation: 'direct' | 'inverse'
  providerLabel: string
  providerRateMode: 'sandbox_model'
  deliveryTier: 'economy' | 'priority'
  providerSpreadBps: number
  variableFeeBps: number
  fixedFee: number
  minimumFee: number
  taxStatus: 'unavailable' | 'estimated' | 'not_applicable'
  estimatedTaxBps: number | null
  taxExplanation: string
  etaMinMinutes: number
  etaMaxMinutes: number
  availability: 'reference_only' | 'unavailable'
  availabilityReason: string
  maxReferenceAgeMinutes: number
  providerConnectivityEnabled: false
  beneficiaryCollectionEnabled: false
  quoteAcceptanceEnabled: false
  automaticRouteSelectionEnabled: false
  transferCreationEnabled: false
  paymentExecutionEnabled: false
  moneyMovementEnabled: false
  custodyEnabled: false
  settlementEnabled: false
}

export type BeneficiaryProtectionRule = {
  id: number
  ruleCode: string
  category: 'validation' | 'duplicate' | 'cooling_off' | 'scam'
  signalKey: string
  title: string
  description: string
  severity: 'medium' | 'high' | 'critical'
  outcome: 'manual_review' | 'cooling_off' | 'blocked'
  coolingOffHours: number
  customerMessage: string
  requiredAction: string
  priority: number
  dataMode: 'synthetic_rehearsal'
  realBeneficiaryCollectionEnabled: false
  beneficiaryIdentifierStorageEnabled: false
  validationProviderConnectivityEnabled: false
  beneficiaryCreationEnabled: false
  duplicateOverrideEnabled: false
  coolingOffBypassEnabled: false
  quoteAcceptanceEnabled: false
  transferCreationEnabled: false
  paymentExecutionEnabled: false
  moneyMovementEnabled: false
}

export type PaymentComplianceRequirement = {
  id: number
  workflowCode: string
  corridorId: number
  corridorCode: string
  sourceCurrency: string
  destinationCurrency: string
  customerType: 'individual' | 'business' | 'both'
  stageKey: 'kyc' | 'kyb' | 'aml' | 'sanctions' | 'transaction_monitoring' | 'travel_rule' | 'audit'
  title: string
  description: string
  evidenceRequired: string
  customerAction: string
  reviewOwner: 'identity_operations' | 'financial_crime_operations' | 'sanctions_operations' | 'transaction_monitoring_operations' | 'travel_rule_operations' | 'compliance_assurance'
  outcome: 'review_required' | 'blocked'
  priority: number
  dataMode: 'synthetic_case_rehearsal'
  realIdentityCollectionEnabled: false
  documentUploadEnabled: false
  piiStorageEnabled: false
  complianceProviderConnectivityEnabled: false
  liveSanctionsScreeningEnabled: false
  transactionMonitoringConnectivityEnabled: false
  travelRuleTransmissionEnabled: false
  complianceCaseWritesEnabled: false
  automatedClearanceEnabled: false
  manualOverrideEnabled: false
  quoteAcceptanceEnabled: false
  transferCreationEnabled: false
  paymentExecutionEnabled: false
  moneyMovementEnabled: false
}

export type PaymentSandboxTransferStage = {
  id: number
  stageCode: string
  corridorId: number
  corridorCode: string
  sourceCurrency: string
  destinationCurrency: string
  stageKey: 'idempotency' | 'sandbox_submission' | 'webhook_verification' | 'double_entry_ledger' | 'retry_policy' | 'reconciliation' | 'rescue_mode' | 'dispute' | 'refund'
  title: string
  description: string
  evidenceRequired: string
  safeResponse: string
  responsibleOwner: 'payment_operations' | 'platform_reliability' | 'financial_control' | 'customer_protection'
  priority: number
}

export type PaymentSandboxLedgerTemplate = {
  id: number
  postingCode: string
  corridorId: number
  corridorCode: string
  sourceCurrency: string
  destinationCurrency: string
  journalKey: 'source_funding' | 'destination_obligation'
  currencyRole: 'source' | 'destination'
  accountCode: 'sandbox_cash_control' | 'sandbox_transfer_liability' | 'sandbox_fx_bridge_control' | 'sandbox_payout_payable'
  entrySide: 'debit' | 'credit'
  amountBasis: 'source_amount' | 'destination_before_tax'
  priority: number
}

export type PaymentMoneyMovementRequirement = {
  id: number
  requirementCode: string
  corridorId: number
  corridorCode: string
  sourceCurrency: string
  destinationCurrency: string
  requirementKey: 'legal_authorization' | 'regulated_partner_agreement' | 'partner_production_certification' | 'safeguarding_account_structure' | 'customer_funds_reconciliation' | 'kyc_kyb_program' | 'aml_sanctions_monitoring' | 'source_of_funds_controls' | 'security_privacy_review' | 'treasury_liquidity_fx_controls' | 'operational_resilience' | 'customer_protection_redress'
  domain: 'legal' | 'partner' | 'safeguarding' | 'compliance' | 'security' | 'treasury' | 'operations' | 'customer_protection'
  title: string
  summary: string
  evidenceExpected: string
  responsibleOwner: 'legal_compliance' | 'partner_management' | 'financial_control' | 'financial_crime_operations' | 'security_privacy' | 'treasury' | 'payment_operations' | 'customer_protection'
  activationBlocking: true
  displayOrder: number
  evidenceStatus: 'missing' | 'approved' | 'rejected' | 'expired'
  reviewedAt: string | null
  validUntil: string | null
  approvalCurrent: boolean
  activationStatus: 'blocked'
  manualActivationReviewRequired: true
  productionPartnerConnectivityEnabled: false
  safeguardingAccountActivationEnabled: false
  customerFundingEnabled: false
  transferCreationEnabled: false
  financialLedgerPostingEnabled: false
  paymentExecutionEnabled: false
  moneyMovementEnabled: false
  custodyEnabled: false
  settlementEnabled: false
  automaticActivationEnabled: false
}

export type GlobalMarketAccessRecord = {
  venueId: number
  micCode: string
  venueName: string
  venueCountryCode: string
  timezone: string
  primaryCurrency: string
  venueAvailability: 'reference_only' | 'unavailable'
  calendarStatus: 'verified_reference' | 'review_required' | 'unavailable'
  holidayCalendarStatus: 'verified_reference' | 'review_required' | 'unavailable'
  settlementConvention: 'T+1' | 'T+2' | 'same_day' | 'source_review_required'
  listingId: number
  listingKey: string
  canonicalInstrumentKey: string
  displaySymbol: string
  instrumentName: string
  instrumentType: 'equity' | 'etf' | 'depositary_receipt'
  quoteCurrency: string
  listingStatus: 'reference_only' | 'suspended' | 'delisted' | 'unavailable'
  identifierStatus: 'verified_reference' | 'review_required' | 'unavailable'
  providerMappingStatus: 'verified_reference' | 'review_required' | 'unavailable'
  corporateActionStatus: 'current_reference' | 'review_required' | 'stale' | 'unavailable'
  residencyCountry: 'US' | 'GB' | 'IN' | 'CA'
  accessStatus: 'research_only' | 'review_required' | 'unavailable'
  reasonCode: string
  disclosureStatus: 'not_assessed' | 'review_required' | 'complete_reference'
  legalReviewStatus: 'review_required' | 'reference_complete'
  referenceDisplayStatus: 'reference_only' | 'delayed' | 'realtime' | 'unavailable'
  priceDisplayStatus: 'reference_only' | 'delayed' | 'realtime' | 'unavailable'
  corporateActionDisplayStatus: 'reference_only' | 'delayed' | 'realtime' | 'unavailable'
  referenceLicenseStatus: 'licensed' | 'public_domain' | 'review_required' | 'restricted'
  referenceAsOf: string
  liveMarketDataConnectivityEnabled: false
  customerEntitlementAssignmentEnabled: false
  automaticJurisdictionApprovalEnabled: false
  orderPreviewEnabled: false
  orderRoutingEnabled: false
  brokerConnectivityEnabled: false
  customerFundingEnabled: false
  custodyEnabled: false
  settlementEnabled: false
}

export type EquityCoverageStatus =
  | 'reference'
  | 'delayed'
  | 'realtime'
  | 'unavailable'

export type EquityResearchClassification =
  | 'research_positive'
  | 'research_neutral'
  | 'research_cautious'
  | 'insufficient_data'

export type EquityResearchSnapshot = {
  securityId: number
  marketAssetId: number
  symbol: string
  companyName: string
  assetClass: 'equity' | 'etf'
  exchangeCode: string
  exchangeName: string | null
  countryCode: string | null
  currency: string
  sector: string | null
  industry: string | null
  providerName: string
  coverageStatus: EquityCoverageStatus | null
  delayMinutes: number | null
  licenseStatus: string | null
  lastSynchronizedAt: string | null
  observedAt: string | null
  price: number | null
  changePercent: number | null
  priceSource: string | null
  forecast: MarketForecast | null
  researchScore: number | null
  researchClassification: EquityResearchClassification | null
  researchConfidence: number | null
  componentScores: {
    forecast: number | null
    momentum: number | null
    quality: number | null
    valuation: number | null
    risk: number | null
    dataQuality: number | null
  }
  methodologyVersion: string | null
  reasons: string[]
  riskFlags: string[]
  fundamentalPeriodEnd: string | null
  revenue: number | null
  netIncome: number | null
  dilutedEps: number | null
  peRatio: number | null
  priceToBook: number | null
  dividendYield: number | null
}

export type EquityPricePoint = {
  observedAt: string
  price: number
}
