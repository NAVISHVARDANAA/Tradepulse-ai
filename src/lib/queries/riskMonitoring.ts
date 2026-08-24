import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context

  if (context instanceof Response) {
    let payload: { error?: string; requestId?: string } | null = null
    try {
      payload = (await context.clone().json()) as { error?: string; requestId?: string }
    } catch {
      // Fall back to the Functions client error for non-JSON responses.
    }

    if (payload?.error) {
      const reference = payload.requestId?.slice(0, 8)
      throw new Error(`${payload.error}${reference ? ` Reference: ${reference}` : ''}`)
    }
  }

  throw error instanceof Error
    ? error
    : new Error('The risk-monitoring request could not be completed.')
}

export type RiskBreach = {
  code: string
  severity: 'warning' | 'critical'
  actual: number
  limit: number
}

export type RiskHistoryPoint = {
  observedAt: string
  totalValue: number
  grossExposure: number
  drawdownPercent: number
  var95OneDay: number
  scenarioCount: number
}

export type PortfolioRiskDashboard = {
  latest: (RiskHistoryPoint & {
    cashValue: number
    netExposure: number
    dailyPnl: number | null
    concentrationPercent: number
    cashPercent: number
    positionCount: number
    stalePriceCount: number
    breaches: RiskBreach[]
    modelVersion: string
  }) | null
  history: RiskHistoryPoint[]
  control: {
    tradingEnabled: boolean
    killSwitchActive: boolean
    triggerSource: string | null
    reason: string | null
    requiresReview: boolean
    activatedAt: string | null
  } | null
  limits: {
    maxPositionNotional: number
    dailyLossLimit: number
    maxConcentrationPercent: number
    maxDrawdownPercent: number
    varLimit: number
    minimumCashPercent: number
    autoKillSwitch: boolean
    ruleVersion: string
  } | null
  reconciliation: {
    id: string
    status: string
    cashDifference: number
    positionsChecked: number
    issuesFound: number
    completedAt: string | null
  } | null
  reconciliationIssues: Array<{
    id: number
    issueType: string
    severity: string
    resourceId: string | null
    expectedValue: number | null
    actualValue: number | null
  }>
}

export async function getPortfolioRiskDashboard(
  portfolioId: string,
): Promise<PortfolioRiskDashboard> {
  const [historyResult, controlResult, limitsResult, reconciliationResult] =
    await Promise.all([
      supabase
        .from('portfolio_risk_snapshots')
        .select(`
          observed_at,
          total_value,
          cash_value,
          gross_exposure,
          net_exposure,
          daily_pnl,
          concentration_percent,
          cash_percent,
          drawdown_percent,
          var_95_one_day,
          scenario_count,
          position_count,
          stale_price_count,
          breaches,
          model_version
        `)
        .eq('portfolio_id', portfolioId)
        .order('observed_at', { ascending: false })
        .limit(30),
      supabase
        .from('portfolio_control_states')
        .select(`
          trading_enabled,
          kill_switch_active,
          trigger_source,
          reason,
          requires_review,
          activated_at
        `)
        .eq('portfolio_id', portfolioId)
        .maybeSingle(),
      supabase
        .from('portfolio_risk_limits')
        .select(`
          max_position_notional,
          daily_loss_limit,
          max_concentration_percent,
          max_drawdown_percent,
          var_limit,
          minimum_cash_percent,
          auto_kill_switch,
          rule_version
        `)
        .eq('portfolio_id', portfolioId)
        .maybeSingle(),
      supabase
        .from('paper_reconciliation_runs')
        .select(`
          id,
          status,
          cash_difference,
          positions_checked,
          issues_found,
          completed_at
        `)
        .eq('portfolio_id', portfolioId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const firstError = [
    historyResult.error,
    controlResult.error,
    limitsResult.error,
    reconciliationResult.error,
  ].find(Boolean)

  if (firstError) {
    throw firstError
  }

  const latestRow = historyResult.data?.[0] ?? null
  const reconciliation = reconciliationResult.data
  const issuesResult = reconciliation
    ? await supabase
        .from('paper_reconciliation_issues')
        .select(`
          id,
          issue_type,
          severity,
          resource_id,
          expected_value,
          actual_value
        `)
        .eq('reconciliation_run_id', reconciliation.id)
        .eq('status', 'open')
        .order('severity')
    : { data: [], error: null }

  if (issuesResult.error) {
    throw issuesResult.error
  }

  const history = (historyResult.data ?? [])
    .map((row) => ({
      observedAt: row.observed_at,
      totalValue: toNumber(row.total_value),
      grossExposure: toNumber(row.gross_exposure),
      drawdownPercent: toNumber(row.drawdown_percent),
      var95OneDay: toNumber(row.var_95_one_day),
      scenarioCount: row.scenario_count,
    }))
    .reverse()

  return {
    latest: latestRow
      ? {
          observedAt: latestRow.observed_at,
          totalValue: toNumber(latestRow.total_value),
          cashValue: toNumber(latestRow.cash_value),
          grossExposure: toNumber(latestRow.gross_exposure),
          netExposure: toNumber(latestRow.net_exposure),
          dailyPnl:
            latestRow.daily_pnl === null
              ? null
              : toNumber(latestRow.daily_pnl),
          concentrationPercent: toNumber(
            latestRow.concentration_percent,
          ),
          cashPercent: toNumber(latestRow.cash_percent),
          drawdownPercent: toNumber(latestRow.drawdown_percent),
          var95OneDay: toNumber(latestRow.var_95_one_day),
          scenarioCount: latestRow.scenario_count,
          positionCount: latestRow.position_count,
          stalePriceCount: latestRow.stale_price_count,
          breaches: Array.isArray(latestRow.breaches)
            ? (latestRow.breaches as RiskBreach[])
            : [],
          modelVersion: latestRow.model_version,
        }
      : null,
    history,
    control: controlResult.data
      ? {
          tradingEnabled: controlResult.data.trading_enabled,
          killSwitchActive: controlResult.data.kill_switch_active,
          triggerSource: controlResult.data.trigger_source,
          reason: controlResult.data.reason,
          requiresReview: controlResult.data.requires_review,
          activatedAt: controlResult.data.activated_at,
        }
      : null,
    limits: limitsResult.data
      ? {
          maxPositionNotional: toNumber(
            limitsResult.data.max_position_notional,
          ),
          dailyLossLimit: toNumber(limitsResult.data.daily_loss_limit),
          maxConcentrationPercent: toNumber(
            limitsResult.data.max_concentration_percent,
          ),
          maxDrawdownPercent: toNumber(
            limitsResult.data.max_drawdown_percent,
          ),
          varLimit: toNumber(limitsResult.data.var_limit),
          minimumCashPercent: toNumber(
            limitsResult.data.minimum_cash_percent,
          ),
          autoKillSwitch: limitsResult.data.auto_kill_switch,
          ruleVersion: limitsResult.data.rule_version,
        }
      : null,
    reconciliation: reconciliation
      ? {
          id: reconciliation.id,
          status: reconciliation.status,
          cashDifference: toNumber(reconciliation.cash_difference),
          positionsChecked: reconciliation.positions_checked,
          issuesFound: reconciliation.issues_found,
          completedAt: reconciliation.completed_at,
        }
      : null,
    reconciliationIssues: (issuesResult.data ?? []).map((issue) => ({
      id: issue.id,
      issueType: issue.issue_type,
      severity: issue.severity,
      resourceId: issue.resource_id,
      expectedValue:
        issue.expected_value === null
          ? null
          : toNumber(issue.expected_value),
      actualValue:
        issue.actual_value === null ? null : toNumber(issue.actual_value),
    })),
  }
}

export async function refreshPaperRisk(portfolioId: string) {
  const { data, error } = await supabase.functions.invoke(
    'refresh-paper-risk',
    { body: { portfolioId } },
  )

  if (error) {
    return throwFunctionError(error)
  }

  return data
}

export async function setPaperTradingControl(input: {
  portfolioId: string
  tradingEnabled: boolean
  reason?: string
}) {
  const { data, error } = await supabase.functions.invoke(
    'set-paper-trading-control',
    { body: input },
  )

  if (error) {
    return throwFunctionError(error)
  }

  return data
}
