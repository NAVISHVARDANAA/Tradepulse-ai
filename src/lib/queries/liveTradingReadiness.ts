import { supabase } from '../supabase/client'

export type LiveTradingReadinessRequirement = {
  requirementKey: string
  domain: 'jurisdiction' | 'broker' | 'compliance' | 'money' | 'market_data' | 'risk' | 'operations' | 'customer'
  title: string
  summary: string
  evidenceStatus: 'missing' | 'approved' | 'rejected' | 'expired'
  approvalCurrent: boolean
  reviewedAt: string | null
  validUntil: string | null
  displayOrder: number
}

export type LiveTradingReadinessSummary = {
  policyVersion: string
  requirementCount: number
  currentApprovalCount: number
  blockingGapCount: number
  readinessStatus: 'blocked'
  manualActivationReviewRequired: true
  liveOrderRoutingEnabled: false
  browserOrderSubmissionEnabled: false
  automaticActivationEnabled: false
  customerFundingEnabled: false
  custodyEnabled: false
  settlementEnabled: false
  killSwitchActivationEnabled: false
}

export type LiveTradingReadinessWorkspace = {
  summary: LiveTradingReadinessSummary
  requirements: LiveTradingReadinessRequirement[]
}

const fallbackSummary: LiveTradingReadinessSummary = {
  policyVersion: 'live-trading-readiness-v1',
  requirementCount: 18,
  currentApprovalCount: 0,
  blockingGapCount: 18,
  readinessStatus: 'blocked',
  manualActivationReviewRequired: true,
  liveOrderRoutingEnabled: false,
  browserOrderSubmissionEnabled: false,
  automaticActivationEnabled: false,
  customerFundingEnabled: false,
  custodyEnabled: false,
  settlementEnabled: false,
  killSwitchActivationEnabled: false,
}

export async function getLiveTradingReadinessWorkspace(): Promise<LiveTradingReadinessWorkspace> {
  const [summaryResult, requirementResult] = await Promise.all([
    supabase
      .from('live_trading_readiness_summary')
      .select('*')
      .maybeSingle(),
    supabase
      .from('live_trading_readiness_requirements')
      .select('*')
      .order('display_order', { ascending: true }),
  ])

  if (summaryResult.error) throw summaryResult.error
  if (requirementResult.error) throw requirementResult.error

  const summaryRow = summaryResult.data as Record<string, any> | null
  const summary = summaryRow ? {
    policyVersion: summaryRow.policy_version,
    requirementCount: Number(summaryRow.requirement_count),
    currentApprovalCount: Number(summaryRow.current_approval_count),
    blockingGapCount: Number(summaryRow.blocking_gap_count),
    readinessStatus: 'blocked' as const,
    manualActivationReviewRequired: true as const,
    liveOrderRoutingEnabled: false as const,
    browserOrderSubmissionEnabled: false as const,
    automaticActivationEnabled: false as const,
    customerFundingEnabled: false as const,
    custodyEnabled: false as const,
    settlementEnabled: false as const,
    killSwitchActivationEnabled: false as const,
  } : fallbackSummary

  const requirements = ((requirementResult.data ?? []) as Record<string, any>[]).map((row) => ({
    requirementKey: row.requirement_key,
    domain: row.domain,
    title: row.title,
    summary: row.summary,
    evidenceStatus: row.evidence_status,
    approvalCurrent: Boolean(row.approval_current),
    reviewedAt: row.reviewed_at,
    validUntil: row.valid_until,
    displayOrder: Number(row.display_order),
  })) as LiveTradingReadinessRequirement[]

  return { summary, requirements }
}

