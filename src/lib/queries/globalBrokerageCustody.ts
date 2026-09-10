import { supabase } from '../supabase/client'

type NumericValue = number | string | null

const toNumber = (value: NumericValue) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string }
      if (payload.error) throw new Error(payload.error)
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) throw responseError
    }
  }
  throw error instanceof Error
    ? error
    : new Error('The global brokerage and custody request failed.')
}

export type GlobalBrokerageSummary = {
  policyVersion: string
  launchMatrixCount: number
  blockedMatrixCount: number
  partnerRoleCount: number
  unassignedPartnerRoleCount: number
  onboardingRequirementCount: number
  activationStatus: 'blocked'
}

export type GlobalLaunchMatrix = {
  launchMatrixId: number
  matrixCode: string
  residencyCountry: string
  executionJurisdiction: string
  customerType: string
  investorType: string
  accountType: 'cash'
  assetClass: 'equity' | 'etf' | 'depositary_receipt'
  micCode: string
  venueName: string
  settlementCurrency: string
  matrixStatus: 'blocked'
  approvalGapCount: number
  partnerGapCount: number
  onboardingRequirementCount: number
  sourceAsOf: string
  matrixVersion: string
}

export type GlobalPartnerRole = {
  roleKey: 'broker' | 'exchange' | 'clearing' | 'custody' | 'market_data'
  displayName: string
  responsibilitySummary: string
  assignmentStatus: 'unassigned'
  dueDiligenceStatus: 'not_started'
  credentialStatus: 'absent'
  productionEnabled: false
}

export type GlobalOnboardingRequirement = {
  requirementKey: string
  domain: string
  title: string
  summary: string
  displayOrder: number
}

export type GlobalBrokerageListing = {
  listingId: number
  listingKey: string
  symbol: string
  name: string
  assetClass: GlobalLaunchMatrix['assetClass']
  quoteCurrency: string
  micCode: string
  scenarioPrice: number
}

export type GlobalBrokerageCase = {
  id: string
  clientCaseId: string
  launchMatrixId: number
  matrixCode: string
  residencyCountry: string
  assetClass: GlobalLaunchMatrix['assetClass']
  micCode: string
  baseCurrency: string
  caseStatus: 'review_only'
  activationStatus: 'blocked'
  expiresAt: string
  requirementCount: number
  rehearsedRequirementCount: number
  blockingRequirementCount: number
  createdAt: string
}

export type GlobalEvidenceRehearsal = {
  id: string
  onboardingCaseId: string
  requirementKey: string
  evidenceStatus: 'rehearsal_recorded'
  expiresAt: string
  createdAt: string
}

export type GlobalBrokeragePreview = {
  id: string
  onboardingCaseId: string
  listingKey: string
  symbol: string
  name: string
  micCode: string
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  scenarioPrice: number
  grossNotional: number
  quoteCurrency: string
  fxRateToBase: number
  baseCurrency: string
  commissionAmount: number
  venueFeeAmount: number
  estimatedTaxAmount: number | null
  taxStatus: 'modeled_scenario' | 'unavailable'
  estimatedTotalBase: number | null
  buyingPowerStatus: 'unavailable'
  settlementCurrency: string
  routeStatus: 'unavailable'
  routeOptionCount: 0
  routeEvidence: Array<{ role: string; status: string }>
  previewStatus: 'blocked'
  executable: false
  blockReasons: Array<{ code: string; owner: string; message: string }>
  expiresAt: string
  createdAt: string
}

export type GlobalReconciliation = {
  id: string
  onboardingCaseId: string
  reconciliationStatus: 'not_ready'
  domainCount: 5
  blockingDomainCount: 5
  partnerStatementCount: 0
  signedEventCount: 0
  productionEffect: false
  items: Array<{ domain: string; sourceStatus: 'unavailable'; mismatchCount: 1; blocking: true; detail: string }>
  createdAt: string
}

export type GlobalBrokerageReference = {
  summary: GlobalBrokerageSummary
  matrices: GlobalLaunchMatrix[]
  partnerRoles: GlobalPartnerRole[]
  requirements: GlobalOnboardingRequirement[]
  listings: GlobalBrokerageListing[]
}

export type GlobalBrokeragePrivateWorkspace = {
  cases: GlobalBrokerageCase[]
  evidence: GlobalEvidenceRehearsal[]
  previews: GlobalBrokeragePreview[]
  reconciliations: GlobalReconciliation[]
}

const fallbackSummary: GlobalBrokerageSummary = {
  policyVersion: 'global-brokerage-custody-v1',
  launchMatrixCount: 4,
  blockedMatrixCount: 4,
  partnerRoleCount: 5,
  unassignedPartnerRoleCount: 5,
  onboardingRequirementCount: 10,
  activationStatus: 'blocked',
}

export async function getGlobalBrokerageCustodyReference(): Promise<GlobalBrokerageReference> {
  const [summaryResult, matrixResult, partnerResult, requirementResult, listingResult] = await Promise.all([
    supabase.from('global_brokerage_orchestration_summary').select('*').maybeSingle(),
    supabase.from('global_brokerage_launch_matrix_catalog').select('*').order('matrix_code'),
    supabase.from('global_brokerage_partner_roles').select('*').order('role_key'),
    supabase.from('global_brokerage_onboarding_requirements').select('*').order('display_order'),
    supabase.from('international_paper_market_catalog')
      .select('listing_id, listing_key, display_symbol, instrument_name, instrument_type, quote_currency, mic_code, scenario_price')
      .order('mic_code').order('display_symbol'),
  ])
  const firstError = [summaryResult.error, matrixResult.error, partnerResult.error, requirementResult.error, listingResult.error].find(Boolean)
  if (firstError) throw firstError

  const summaryRow = summaryResult.data
  return {
    summary: summaryRow ? {
      policyVersion: summaryRow.policy_version,
      launchMatrixCount: Number(summaryRow.launch_matrix_count),
      blockedMatrixCount: Number(summaryRow.blocked_matrix_count),
      partnerRoleCount: Number(summaryRow.partner_role_count),
      unassignedPartnerRoleCount: Number(summaryRow.unassigned_partner_role_count),
      onboardingRequirementCount: Number(summaryRow.onboarding_requirement_count),
      activationStatus: 'blocked',
    } : fallbackSummary,
    matrices: (matrixResult.data ?? []).map((row) => ({
      launchMatrixId: Number(row.launch_matrix_id),
      matrixCode: row.matrix_code,
      residencyCountry: row.residency_country,
      executionJurisdiction: row.execution_jurisdiction,
      customerType: row.customer_type,
      investorType: row.investor_type,
      accountType: 'cash',
      assetClass: row.asset_class,
      micCode: row.mic_code,
      venueName: row.venue_name,
      settlementCurrency: row.settlement_currency,
      matrixStatus: 'blocked',
      approvalGapCount: Number(row.approval_gap_count),
      partnerGapCount: Number(row.partner_gap_count),
      onboardingRequirementCount: Number(row.onboarding_requirement_count),
      sourceAsOf: row.source_as_of,
      matrixVersion: row.matrix_version,
    })),
    partnerRoles: (partnerResult.data ?? []).map((row) => ({
      roleKey: row.role_key,
      displayName: row.display_name,
      responsibilitySummary: row.responsibility_summary,
      assignmentStatus: 'unassigned',
      dueDiligenceStatus: 'not_started',
      credentialStatus: 'absent',
      productionEnabled: false,
    })),
    requirements: (requirementResult.data ?? []).map((row) => ({
      requirementKey: row.requirement_key,
      domain: row.domain,
      title: row.title,
      summary: row.summary,
      displayOrder: Number(row.display_order),
    })),
    listings: (listingResult.data ?? []).map((row) => ({
      listingId: Number(row.listing_id),
      listingKey: row.listing_key,
      symbol: row.display_symbol,
      name: row.instrument_name,
      assetClass: row.instrument_type,
      quoteCurrency: row.quote_currency,
      micCode: row.mic_code,
      scenarioPrice: toNumber(row.scenario_price),
    })),
  }
}

export async function getGlobalBrokerageCustodyPrivate(): Promise<GlobalBrokeragePrivateWorkspace> {
  const [caseResult, evidenceResult, previewResult, reconciliationResult] = await Promise.all([
    supabase.from('global_brokerage_onboarding_progress').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('global_brokerage_evidence_rehearsals').select('id, onboarding_case_id, requirement_key, evidence_status, expires_at, created_at').order('created_at', { ascending: false }).limit(40),
    supabase.from('global_brokerage_preview_history').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('global_brokerage_reconciliation_history').select('*').order('created_at', { ascending: false }).limit(12),
  ])
  const firstError = [caseResult.error, evidenceResult.error, previewResult.error, reconciliationResult.error].find(Boolean)
  if (firstError) throw firstError

  return {
    cases: (caseResult.data ?? []).map((row) => ({
      id: row.id,
      clientCaseId: row.client_case_id,
      launchMatrixId: Number(row.launch_matrix_id),
      matrixCode: row.matrix_code,
      residencyCountry: row.residency_country,
      assetClass: row.asset_class,
      micCode: row.mic_code,
      baseCurrency: row.base_currency,
      caseStatus: 'review_only',
      activationStatus: 'blocked',
      expiresAt: row.expires_at,
      requirementCount: Number(row.requirement_count),
      rehearsedRequirementCount: Number(row.rehearsed_requirement_count),
      blockingRequirementCount: Number(row.blocking_requirement_count),
      createdAt: row.created_at,
    })),
    evidence: (evidenceResult.data ?? []).map((row) => ({
      id: row.id,
      onboardingCaseId: row.onboarding_case_id,
      requirementKey: row.requirement_key,
      evidenceStatus: 'rehearsal_recorded',
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
    previews: (previewResult.data ?? []).map((row) => ({
      id: row.id,
      onboardingCaseId: row.onboarding_case_id,
      listingKey: row.listing_key,
      symbol: row.display_symbol,
      name: row.instrument_name,
      micCode: row.mic_code,
      side: row.side,
      orderType: row.order_type,
      quantity: toNumber(row.quantity),
      scenarioPrice: toNumber(row.scenario_price),
      grossNotional: toNumber(row.gross_notional),
      quoteCurrency: row.quote_currency,
      fxRateToBase: toNumber(row.fx_rate_to_base),
      baseCurrency: row.base_currency,
      commissionAmount: toNumber(row.commission_amount),
      venueFeeAmount: toNumber(row.venue_fee_amount),
      estimatedTaxAmount: row.estimated_tax_amount === null ? null : toNumber(row.estimated_tax_amount),
      taxStatus: row.tax_status,
      estimatedTotalBase: row.estimated_total_base === null ? null : toNumber(row.estimated_total_base),
      buyingPowerStatus: 'unavailable',
      settlementCurrency: row.settlement_currency,
      routeStatus: 'unavailable',
      routeOptionCount: 0,
      routeEvidence: Array.isArray(row.route_evidence) ? row.route_evidence : [],
      previewStatus: 'blocked',
      executable: false,
      blockReasons: Array.isArray(row.block_reasons) ? row.block_reasons : [],
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
    reconciliations: (reconciliationResult.data ?? []).map((row) => ({
      id: row.id,
      onboardingCaseId: row.onboarding_case_id,
      reconciliationStatus: 'not_ready',
      domainCount: 5,
      blockingDomainCount: 5,
      partnerStatementCount: 0,
      signedEventCount: 0,
      productionEffect: false,
      items: Array.isArray(row.items) ? row.items : [],
      createdAt: row.created_at,
    })),
  }
}

async function manageGlobalBrokerageCustody(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('manage-global-brokerage-custody', { body })
  if (error) return throwFunctionError(error)
  return data?.result
}

export const initializeGlobalBrokerageCase = (input: {
  clientCaseId: string
  launchMatrixId: number
  baseCurrency: string
}) => manageGlobalBrokerageCustody({ action: 'initialize_case', ...input })

export const rehearseGlobalBrokerageEvidence = (input: {
  onboardingCaseId: string
  clientEvidenceId: string
  requirementKey: string
}) => manageGlobalBrokerageCustody({ action: 'rehearse_evidence', ...input })

export const createGlobalBrokeragePreview = (input: {
  onboardingCaseId: string
  clientPreviewId: string
  listingId: number
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  limitPrice: number | null
}) => manageGlobalBrokerageCustody({ action: 'create_preview', ...input })

export const reconcileGlobalBrokerageCase = (input: {
  onboardingCaseId: string
  clientReconciliationId: string
}) => manageGlobalBrokerageCustody({ action: 'reconcile', ...input })
