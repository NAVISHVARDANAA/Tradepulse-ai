import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function objects(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object')
    : []
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in to use the research copilot.')
  return data.user.id
}

async function functionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string }
      if (payload.error) throw new Error(payload.error)
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) {
        throw responseError
      }
    }
  }

  throw error instanceof Error
    ? error
    : new Error('The research copilot request could not be completed.')
}

export type ResearchBriefHighlight = {
  assetId: number
  symbol: string
  companyName: string
  currency: string
  price: number | null
  changePercent: number | null
  researchScore: number | null
  classification: string | null
  confidence: number | null
  forecastDirection: string | null
  evidence: string[]
  observedAt: string | null
}

export type ResearchBriefRisk = {
  assetId: number
  symbol: string
  classification: string | null
  flags: string[]
  observedAt: string | null
}

export type ResearchBrief = {
  id: string
  briefDate: string
  cadence: string
  title: string
  executiveSummary: string
  highlights: ResearchBriefHighlight[]
  risks: ResearchBriefRisk[]
  coverage: Record<string, unknown>
  methodologyVersion: string
  generatedAt: string
  sourceMaxTimestamp: string | null
}

export type ResearchAlert = {
  id: number
  assetId: number
  condition: string
  targetValue: number | null
  enabled: boolean
  lastTriggeredAt: string | null
}

export type ResearchAlertEvent = {
  id: number
  alertId: number
  assetId: number
  triggeredAt: string
  eventType: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  observedValue: number | null
  thresholdValue: number | null
  evidence: Record<string, unknown>
  readAt: string | null
}

export type ResearchCopilotWorkspace = {
  watchlist: { id: number; name: string }
  items: Array<{ id: number; assetId: number; addedAt: string }>
  brief: ResearchBrief | null
  alerts: ResearchAlert[]
  events: ResearchAlertEvent[]
}

function mapBrief(row: Record<string, unknown>): ResearchBrief {
  const highlights = objects(row.highlights).map((item) => ({
    assetId: Number(item.asset_id),
    symbol: String(item.symbol ?? ''),
    companyName: String(item.company_name ?? ''),
    currency: String(item.currency ?? 'USD'),
    price: toNumber(item.price as NumericValue),
    changePercent: toNumber(item.change_percent as NumericValue),
    researchScore: toNumber(item.research_score as NumericValue),
    classification: typeof item.classification === 'string' ? item.classification : null,
    confidence: toNumber(item.confidence as NumericValue),
    forecastDirection: typeof item.forecast_direction === 'string' ? item.forecast_direction : null,
    evidence: Array.isArray(item.evidence)
      ? item.evidence.filter((entry): entry is string => typeof entry === 'string')
      : [],
    observedAt: typeof item.observed_at === 'string' ? item.observed_at : null,
  }))
  const risks = objects(row.risk_digest).map((item) => ({
    assetId: Number(item.asset_id),
    symbol: String(item.symbol ?? ''),
    classification: typeof item.classification === 'string' ? item.classification : null,
    flags: Array.isArray(item.flags)
      ? item.flags.filter((entry): entry is string => typeof entry === 'string')
      : [],
    observedAt: typeof item.observed_at === 'string' ? item.observed_at : null,
  }))

  return {
    id: String(row.id),
    briefDate: String(row.brief_date),
    cadence: String(row.cadence),
    title: String(row.title),
    executiveSummary: String(row.executive_summary),
    highlights,
    risks,
    coverage: row.coverage_summary && typeof row.coverage_summary === 'object'
      ? row.coverage_summary as Record<string, unknown>
      : {},
    methodologyVersion: String(row.methodology_version),
    generatedAt: String(row.generated_at),
    sourceMaxTimestamp: typeof row.source_max_timestamp === 'string'
      ? row.source_max_timestamp
      : null,
  }
}

export async function getResearchCopilotWorkspace(): Promise<ResearchCopilotWorkspace> {
  const userId = await currentUserId()
  let { data: watchlist, error: watchlistError } = await supabase
    .from('watchlists')
    .select('id, name')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (watchlistError) throw watchlistError
  if (!watchlist) {
    const created = await supabase
      .from('watchlists')
      .insert({ user_id: userId, name: 'My Watchlist', is_default: true })
      .select('id, name')
      .single()
    if (created.error) throw created.error
    watchlist = created.data
  }

  const [itemsResult, briefResult, alertResult, eventResult] = await Promise.all([
    supabase
      .from('watchlist_items')
      .select('id, asset_id, created_at')
      .eq('watchlist_id', watchlist.id)
      .order('created_at'),
    supabase
      .from('research_briefs')
      .select('id, brief_date, cadence, title, executive_summary, highlights, risk_digest, coverage_summary, methodology_version, generated_at, source_max_timestamp')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('market_alerts')
      .select('id, asset_id, condition, target_value, enabled, last_triggered_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('research_alert_events')
      .select('id, alert_id, asset_id, triggered_at, event_type, severity, title, message, observed_value, threshold_value, evidence, read_at')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(20),
  ])

  const firstError = [
    itemsResult.error,
    briefResult.error,
    alertResult.error,
    eventResult.error,
  ].find(Boolean)
  if (firstError) throw firstError

  return {
    watchlist,
    items: (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      assetId: item.asset_id,
      addedAt: item.created_at,
    })),
    brief: briefResult.data
      ? mapBrief(briefResult.data as Record<string, unknown>)
      : null,
    alerts: (alertResult.data ?? []).map((alert) => ({
      id: alert.id,
      assetId: alert.asset_id,
      condition: alert.condition,
      targetValue: toNumber(alert.target_value),
      enabled: alert.enabled,
      lastTriggeredAt: alert.last_triggered_at,
    })),
    events: (eventResult.data ?? []).map((event) => ({
      id: event.id,
      alertId: event.alert_id,
      assetId: event.asset_id,
      triggeredAt: event.triggered_at,
      eventType: event.event_type,
      severity: event.severity as ResearchAlertEvent['severity'],
      title: event.title,
      message: event.message,
      observedValue: toNumber(event.observed_value),
      thresholdValue: toNumber(event.threshold_value),
      evidence: event.evidence && typeof event.evidence === 'object'
        ? event.evidence as Record<string, unknown>
        : {},
      readAt: event.read_at,
    })),
  }
}

export async function addResearchWatchlistItem(watchlistId: number, assetId: number) {
  const { error } = await supabase
    .from('watchlist_items')
    .insert({ watchlist_id: watchlistId, asset_id: assetId })
  if (error) throw error
}

export async function removeResearchWatchlistItem(itemId: number) {
  const { error } = await supabase.from('watchlist_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function createResearchAlert(input: {
  assetId: number
  condition: 'research_score_above' | 'research_score_below'
  targetValue: number
}) {
  const userId = await currentUserId()
  const { error } = await supabase.from('market_alerts').insert({
    user_id: userId,
    asset_id: input.assetId,
    condition: input.condition,
    target_value: input.targetValue,
    delivery_channels: ['in_app'],
    cooldown_minutes: 1440,
  })
  if (error) throw error
}

export async function deleteResearchAlert(alertId: number) {
  const { error } = await supabase.from('market_alerts').delete().eq('id', alertId)
  if (error) throw error
}

export async function markResearchAlertRead(eventId: number) {
  const { error } = await supabase
    .from('research_alert_events')
    .update({ read_at: new Date().toISOString() })
    .eq('id', eventId)
  if (error) throw error
}

export async function generateResearchBrief() {
  const { data, error } = await supabase.functions.invoke(
    'generate-daily-research-brief',
    { body: {} },
  )
  if (error) return functionError(error)
  return data
}
