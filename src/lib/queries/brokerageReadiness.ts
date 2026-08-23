import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue) {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context

  if (context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as { error?: string }
      if (payload.error) throw new Error(payload.error)
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) throw responseError
    }
  }

  throw error instanceof Error
    ? error
    : new Error('The brokerage readiness request could not be completed.')
}

export type BrokerageReadiness = {
  declaredResidencyCountry: string | null
  verifiedResidencyCountry: string | null
  baseCurrency: string
  investorType: string
  riskTolerance: string | null
  kycStatus: string
  suitabilityStatus: string
  sanctionsStatus: string
  onboardingState: string
  jurisdictionStatus: string | null
  retailInvestingEnabled: boolean
  executionEnabled: boolean
  previewEnabled: boolean
  requiredApprovals: string[]
  recordedApprovals: string[]
  policyVersion: string
  requiredDisclosures: number
  acceptedDisclosures: number
  connectedSandboxAccounts: number
}

export type BrokerProvider = {
  id: number
  code: string
  displayName: string
  adapterContractVersion: string
  regulatoryStatus: string
  integrationStatus: string
  supportedAssetClasses: string[]
  accountConnectionEnabled: boolean
  liveOrderRoutingEnabled: boolean
}

export type BrokerageDisclosure = {
  id: string
  code: string
  version: string
  title: string
  summary: string
  required: boolean
  effectiveAt: string
  acceptedAt: string | null
}

export type BrokerageInstrument = {
  id: number
  symbol: string
  name: string
  assetClass: string
  quoteCurrency: string
}

export type BrokerageBlockReason = {
  code: string
  message: string
  owner: 'user' | 'tradepulse' | 'broker' | 'compliance' | 'market_data'
}

export type BrokeragePreview = {
  id: string
  clientRequestId: string
  instrumentId: number
  symbol: string | null
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  limitPrice: number | null
  referencePrice: number | null
  estimatedNotional: number | null
  quoteCurrency: string
  previewStatus: 'blocked'
  executable: false
  blockReasons: BrokerageBlockReason[]
  policyVersion: string
  referenceObservedAt: string | null
  expiresAt: string
  createdAt: string
}

export type BrokerCertificationSummary = {
  providerId: number
  providerCode: string
  displayName: string
  adapterContractVersion: string
  regulatoryStatus: string
  integrationStatus: string
  liveOrderRoutingEnabled: boolean
  requiredTests: number
  latestRunId: string | null
  latestStatus: 'passed' | 'failed' | null
  suiteVersion: string | null
  sourceCommitSha: string | null
  passedTests: number
  failedTests: number
  completedAt: string | null
  liveOrderRoutingTested: boolean
}

export type BrokerCertificationTest = {
  providerId: number
  providerCode: string
  code: string
  category: string
  title: string
  description: string
  required: boolean
  sequence: number
  status: 'passed' | 'failed' | 'not_run'
  latencyMs: number | null
  attemptCount: number | null
  errorCode: string | null
  completedAt: string | null
}

export type BrokerAdapterHealth = {
  providerId: number
  providerCode: string
  displayName: string
  adapterContractVersion: string
  environment: 'sandbox'
  apiOrigin: string
  probeKind: 'asset_read'
  latestStatus: 'passed' | 'failed' | 'not_run'
  httpStatus: number | null
  latencyMs: number | null
  attemptCount: number | null
  errorCode: string | null
  checkedAt: string | null
  accountsReadEnabled: false
  ordersReadEnabled: false
  ordersWriteEnabled: false
  liveOrderRoutingEnabled: boolean
}

export type BrokerageWorkspace = {
  readiness: BrokerageReadiness | null
  providers: BrokerProvider[]
  certifications: BrokerCertificationSummary[]
  certificationTests: BrokerCertificationTest[]
  adapterHealth: BrokerAdapterHealth[]
  disclosures: BrokerageDisclosure[]
  instruments: BrokerageInstrument[]
  previews: BrokeragePreview[]
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function blockReasons(value: unknown): BrokerageBlockReason[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    if (typeof row.code !== 'string' || typeof row.message !== 'string') return []
    const owner = typeof row.owner === 'string' ? row.owner : 'tradepulse'
    if (!['user', 'tradepulse', 'broker', 'compliance', 'market_data'].includes(owner)) return []
    return [{
      code: row.code,
      message: row.message,
      owner: owner as BrokerageBlockReason['owner'],
    }]
  })
}

function mapPreview(row: Record<string, any>, symbol: string | null = null): BrokeragePreview {
  return {
    id: row.id,
    clientRequestId: row.client_request_id,
    instrumentId: row.instrument_id,
    symbol: row.symbol ?? symbol,
    side: row.side,
    orderType: row.order_type,
    quantity: Number(row.quantity),
    limitPrice: toNumber(row.limit_price),
    referencePrice: toNumber(row.reference_price),
    estimatedNotional: toNumber(row.estimated_notional),
    quoteCurrency: row.quote_currency,
    previewStatus: 'blocked',
    executable: false,
    blockReasons: blockReasons(row.block_reasons),
    policyVersion: row.policy_version,
    referenceObservedAt: row.reference_observed_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

export async function getBrokerageWorkspace(): Promise<BrokerageWorkspace> {
  const [
    readinessResult,
    providerResult,
    certificationResult,
    certificationTestResult,
    adapterHealthResult,
    disclosureResult,
    consentResult,
    instrumentResult,
    previewResult,
  ] = await Promise.all([
    supabase.from('brokerage_readiness_dashboard').select('*').maybeSingle(),
    supabase
      .from('broker_provider_registry')
      .select('id, code, display_name, adapter_contract_version, regulatory_status, integration_status, supported_asset_classes, account_connection_enabled, live_order_routing_enabled')
      .order('display_name'),
    supabase
      .from('broker_certification_readiness')
      .select('*')
      .order('display_name'),
    supabase
      .from('broker_certification_latest_results')
      .select('*')
      .order('provider_code')
      .order('sequence'),
    supabase
      .from('broker_adapter_health')
      .select('*')
      .order('provider_code'),
    supabase
      .from('brokerage_disclosures')
      .select('id, code, version, title, summary, required, effective_at')
      .eq('published', true)
      .order('effective_at'),
    supabase
      .from('brokerage_consents')
      .select('disclosure_id, disclosure_version, accepted_at')
      .is('revoked_at', null),
    supabase
      .from('investment_instruments')
      .select('id, display_symbol, name, asset_class, quote_currency')
      .eq('research_enabled', true)
      .not('market_asset_id', 'is', null)
      .order('display_symbol'),
    supabase
      .from('brokerage_order_previews')
      .select('*, investment_instruments!inner(display_symbol)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const firstError = [
    readinessResult.error,
    providerResult.error,
    certificationResult.error,
    certificationTestResult.error,
    adapterHealthResult.error,
    disclosureResult.error,
    consentResult.error,
    instrumentResult.error,
    previewResult.error,
  ].find(Boolean)
  if (firstError) throw firstError

  const consentMap = new Map(
    (consentResult.data ?? []).map((item) => [
      item.disclosure_id,
      item.disclosure_version ? item.accepted_at : null,
    ]),
  )
  const readiness = readinessResult.data

  return {
    readiness: readiness ? {
      declaredResidencyCountry: readiness.declared_residency_country,
      verifiedResidencyCountry: readiness.verified_residency_country,
      baseCurrency: readiness.base_currency,
      investorType: readiness.investor_type,
      riskTolerance: readiness.risk_tolerance,
      kycStatus: readiness.kyc_status,
      suitabilityStatus: readiness.suitability_status,
      sanctionsStatus: readiness.sanctions_status,
      onboardingState: readiness.onboarding_state,
      jurisdictionStatus: readiness.jurisdiction_status,
      retailInvestingEnabled: readiness.retail_investing_enabled,
      executionEnabled: readiness.execution_enabled,
      previewEnabled: readiness.preview_enabled,
      requiredApprovals: stringArray(readiness.required_approvals),
      recordedApprovals: stringArray(readiness.recorded_approvals),
      policyVersion: readiness.policy_version,
      requiredDisclosures: readiness.required_disclosures,
      acceptedDisclosures: readiness.accepted_disclosures,
      connectedSandboxAccounts: readiness.connected_sandbox_accounts,
    } : null,
    providers: (providerResult.data ?? []).map((provider) => ({
      id: provider.id,
      code: provider.code,
      displayName: provider.display_name,
      adapterContractVersion: provider.adapter_contract_version,
      regulatoryStatus: provider.regulatory_status,
      integrationStatus: provider.integration_status,
      supportedAssetClasses: stringArray(provider.supported_asset_classes),
      accountConnectionEnabled: provider.account_connection_enabled,
      liveOrderRoutingEnabled: provider.live_order_routing_enabled,
    })),
    certifications: (certificationResult.data ?? []).map((certification) => ({
      providerId: certification.provider_id,
      providerCode: certification.provider_code,
      displayName: certification.display_name,
      adapterContractVersion: certification.adapter_contract_version,
      regulatoryStatus: certification.regulatory_status,
      integrationStatus: certification.integration_status,
      liveOrderRoutingEnabled: certification.live_order_routing_enabled,
      requiredTests: certification.required_tests,
      latestRunId: certification.latest_run_id,
      latestStatus: certification.latest_status,
      suiteVersion: certification.suite_version,
      sourceCommitSha: certification.source_commit_sha,
      passedTests: certification.passed_tests ?? 0,
      failedTests: certification.failed_tests ?? 0,
      completedAt: certification.completed_at,
      liveOrderRoutingTested: certification.live_order_routing_tested ?? false,
    })),
    certificationTests: (certificationTestResult.data ?? []).map((test) => ({
      providerId: test.provider_id,
      providerCode: test.provider_code,
      code: test.test_code,
      category: test.category,
      title: test.title,
      description: test.description,
      required: test.required,
      sequence: test.sequence,
      status: test.status,
      latencyMs: test.latency_ms,
      attemptCount: test.attempt_count,
      errorCode: test.error_code,
      completedAt: test.completed_at,
    })),
    adapterHealth: (adapterHealthResult.data ?? []).map((adapter) => ({
      providerId: adapter.provider_id,
      providerCode: adapter.provider_code,
      displayName: adapter.display_name,
      adapterContractVersion: adapter.adapter_contract_version,
      environment: 'sandbox',
      apiOrigin: adapter.api_origin,
      probeKind: 'asset_read',
      latestStatus: adapter.latest_status,
      httpStatus: adapter.http_status,
      latencyMs: adapter.latency_ms,
      attemptCount: adapter.attempt_count,
      errorCode: adapter.error_code,
      checkedAt: adapter.checked_at,
      accountsReadEnabled: false,
      ordersReadEnabled: false,
      ordersWriteEnabled: false,
      liveOrderRoutingEnabled: adapter.live_order_routing_enabled,
    })),
    disclosures: (disclosureResult.data ?? []).map((disclosure) => ({
      id: disclosure.id,
      code: disclosure.code,
      version: disclosure.version,
      title: disclosure.title,
      summary: disclosure.summary,
      required: disclosure.required,
      effectiveAt: disclosure.effective_at,
      acceptedAt: consentMap.get(disclosure.id) ?? null,
    })),
    instruments: (instrumentResult.data ?? []).map((instrument) => ({
      id: instrument.id,
      symbol: instrument.display_symbol,
      name: instrument.name,
      assetClass: instrument.asset_class,
      quoteCurrency: instrument.quote_currency,
    })),
    previews: (previewResult.data ?? []).map((preview) => {
      const instrument = Array.isArray(preview.investment_instruments)
        ? preview.investment_instruments[0]
        : preview.investment_instruments
      return mapPreview(preview, instrument?.display_symbol ?? null)
    }),
  }
}

export async function acceptBrokerageDisclosure(disclosureId: string) {
  const { data, error } = await supabase.rpc('record_brokerage_consent', {
    p_disclosure_id: disclosureId,
  })
  if (error) throw error
  return data
}

export async function createBrokeragePreview(input: {
  instrumentId: number
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  limitPrice: number | null
  clientRequestId: string
}): Promise<BrokeragePreview> {
  const { data, error } = await supabase.functions.invoke('preview-brokerage-order', {
    body: input,
  })
  if (error) return throwFunctionError(error)
  return mapPreview(data.preview)
}
