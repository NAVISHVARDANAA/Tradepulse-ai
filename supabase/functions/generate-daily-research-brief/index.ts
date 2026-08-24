import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import { corsPreflightResponse, hasValidInternalSecret, jsonResponse } from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type NumericValue = number | string | null

type ResearchRow = {
  market_asset_id: number
  display_symbol: string
  company_name: string
  quote_currency: string
  coverage_status: string | null
  observed_at: string | null
  price: NumericValue
  change_percent: NumericValue
  forecast_direction: string | null
  research_generated_at: string | null
  research_score: NumericValue
  research_classification: string | null
  research_confidence: NumericValue
  reasons: unknown
  risk_flags: unknown
}

type AlertRow = {
  id: number
  asset_id: number
  condition: string
  target_value: NumericValue
  cooldown_minutes: number
  last_triggered_at: string | null
  last_evaluation_key: string | null
}

const COPILOT_VERSION = 'research-copilot-v1.0.0'

type AdminClient = SupabaseClient<any, 'public', any>

function numberOrNull(value: NumericValue | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function localDate(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function isStale(value: string | null) {
  if (!value) return true
  return Date.now() - new Date(value).getTime() > 4 * 24 * 60 * 60 * 1000
}

async function contentHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
}

function alertState(alert: AlertRow, row: ResearchRow) {
  const score = numberOrNull(row.research_score)
  const price = numberOrNull(row.price)
  const change = numberOrNull(row.change_percent)
  const target = numberOrNull(alert.target_value)
  const riskSignature = strings(row.risk_flags).sort().join('|') || 'none'
  const sourceTimestamp = row.research_generated_at ?? row.observed_at ?? 'unknown'

  switch (alert.condition) {
    case 'price_above':
      return { triggered: price !== null && target !== null && price > target, value: price, key: `${sourceTimestamp}:${price}` }
    case 'price_below':
      return { triggered: price !== null && target !== null && price < target, value: price, key: `${sourceTimestamp}:${price}` }
    case 'change_above':
      return { triggered: change !== null && target !== null && change > target, value: change, key: `${sourceTimestamp}:${change}` }
    case 'change_below':
      return { triggered: change !== null && target !== null && change < target, value: change, key: `${sourceTimestamp}:${change}` }
    case 'research_score_above':
      return { triggered: score !== null && target !== null && score > target, value: score, key: `${sourceTimestamp}:${score}` }
    case 'research_score_below':
      return { triggered: score !== null && target !== null && score < target, value: score, key: `${sourceTimestamp}:${score}` }
    case 'classification_changed': {
      const key = row.research_classification ?? 'unclassified'
      return { triggered: alert.last_evaluation_key !== null && alert.last_evaluation_key !== key, value: score, key }
    }
    case 'forecast_direction_changed': {
      const key = row.forecast_direction ?? 'unavailable'
      return { triggered: alert.last_evaluation_key !== null && alert.last_evaluation_key !== key, value: null, key }
    }
    case 'risk_flags_changed':
      return { triggered: alert.last_evaluation_key !== null && alert.last_evaluation_key !== riskSignature, value: null, key: riskSignature }
    default:
      return { triggered: false, value: null, key: sourceTimestamp }
  }
}

function alertCopy(alert: AlertRow, row: ResearchRow, observed: number | null) {
  const target = numberOrNull(alert.target_value)
  const condition = alert.condition.replaceAll('_', ' ')
  const value = observed === null ? 'state changed' : observed.toFixed(2)
  const threshold = target === null ? '' : ` against ${target.toFixed(2)}`

  return {
    title: `${row.display_symbol} · ${condition}`,
    message: `${row.company_name}: ${condition} evaluated at ${value}${threshold}. Review the evidence and current data timestamp before acting.`,
    severity:
      alert.condition === 'research_score_below' ||
        alert.condition === 'risk_flags_changed'
        ? 'warning'
        : 'info',
  }
}

async function evaluateAlerts(
  admin: AdminClient,
  userId: string,
  rows: ResearchRow[],
) {
  const assetIds = rows.map((row) => row.market_asset_id)
  const { data: alerts, error } = await admin
    .from('market_alerts')
    .select('id, asset_id, condition, target_value, cooldown_minutes, last_triggered_at, last_evaluation_key')
    .eq('user_id', userId)
    .eq('enabled', true)
    .in('asset_id', assetIds)

  if (error) throw error

  const byAsset = new Map(rows.map((row) => [row.market_asset_id, row]))
  let triggeredCount = 0

  for (const alert of (alerts ?? []) as AlertRow[]) {
    const row = byAsset.get(alert.asset_id)
    if (!row) continue

    const state = alertState(alert, row)
    const cooldownElapsed = !alert.last_triggered_at ||
      Date.now() - new Date(alert.last_triggered_at).getTime() >=
        alert.cooldown_minutes * 60 * 1000
    const newEvidence = state.key !== alert.last_evaluation_key
    const shouldTrigger = state.triggered && cooldownElapsed && newEvidence
    const evaluatedAt = new Date().toISOString()

    if (shouldTrigger) {
      const copy = alertCopy(alert, row, state.value)
      const deduplicationKey = `${alert.id}:${state.key}`
      const { error: eventError } = await admin
        .from('research_alert_events')
        .upsert({
          alert_id: alert.id,
          user_id: userId,
          asset_id: alert.asset_id,
          triggered_at: evaluatedAt,
          event_type: alert.condition,
          severity: copy.severity,
          title: copy.title,
          message: copy.message,
          observed_value: state.value,
          threshold_value: numberOrNull(alert.target_value),
          evidence: {
            symbol: row.display_symbol,
            classification: row.research_classification,
            confidence: numberOrNull(row.research_confidence),
            forecast_direction: row.forecast_direction,
            reasons: strings(row.reasons),
            risk_flags: strings(row.risk_flags),
            observed_at: row.observed_at,
            research_generated_at: row.research_generated_at,
          },
          delivery_status: 'in_app',
          deduplication_key: deduplicationKey,
        }, { onConflict: 'deduplication_key', ignoreDuplicates: true })

      if (eventError) throw eventError
      triggeredCount += 1
    }

    const { error: updateError } = await admin
      .from('market_alerts')
      .update({
        last_evaluated_at: evaluatedAt,
        last_evaluation_key: state.key,
        ...(shouldTrigger ? { last_triggered_at: evaluatedAt } : {}),
      })
      .eq('id', alert.id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  return triggeredCount
}

async function generateForUser(
  admin: AdminClient,
  userId: string,
  cadenceOverride: 'on_demand' | null,
) {
  const { data: preference, error: preferenceError } = await admin
    .from('research_brief_preferences')
    .select('enabled, cadence, timezone, billing_currency, include_positive, include_cautious, include_risk_digest')
    .eq('user_id', userId)
    .maybeSingle()

  if (preferenceError) throw preferenceError
  if (!preference && !cadenceOverride) return { status: 'not_configured' }
  if (preference && !preference.enabled && !cadenceOverride) return { status: 'disabled' }

  const { data: watchlist, error: watchlistError } = await admin
    .from('watchlists')
    .select('id, name')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (watchlistError) throw watchlistError
  if (!watchlist) return { status: 'empty_watchlist' }

  const { data: items, error: itemError } = await admin
    .from('watchlist_items')
    .select('asset_id')
    .eq('watchlist_id', watchlist.id)

  if (itemError) throw itemError
  const assetIds = (items ?? []).map((item) => item.asset_id)
  if (assetIds.length === 0) return { status: 'empty_watchlist' }

  const { data, error: researchError } = await admin
    .from('equity_research_dashboard')
    .select(`
      market_asset_id,
      display_symbol,
      company_name,
      quote_currency,
      coverage_status,
      observed_at,
      price,
      change_percent,
      forecast_direction,
      research_generated_at,
      research_score,
      research_classification,
      research_confidence,
      reasons,
      risk_flags
    `)
    .in('market_asset_id', assetIds)

  if (researchError) throw researchError
  const rows = (data ?? []) as ResearchRow[]
  if (rows.length === 0) return { status: 'coverage_unavailable' }

  const ranked = [...rows].sort(
    (left, right) =>
      (numberOrNull(right.research_score) ?? -1) -
      (numberOrNull(left.research_score) ?? -1),
  )
  const positive = ranked.filter((row) => row.research_classification === 'research_positive')
  const cautious = ranked.filter((row) => row.research_classification === 'research_cautious')
  const pending = ranked.filter((row) => !row.research_classification || row.research_classification === 'insufficient_data')
  const stale = ranked.filter((row) => isStale(row.observed_at))
  const top = ranked.find((row) => numberOrNull(row.research_score) !== null)
  const riskCount = ranked.reduce((total, row) => total + strings(row.risk_flags).length, 0)
  const timezone = preference?.timezone ?? 'UTC'
  const cadence = cadenceOverride ?? preference?.cadence ?? 'weekdays'
  const briefDate = localDate(timezone)

  const highlights = ranked.slice(0, 5).map((row) => ({
    asset_id: row.market_asset_id,
    symbol: row.display_symbol,
    company_name: row.company_name,
    currency: row.quote_currency,
    price: numberOrNull(row.price),
    change_percent: numberOrNull(row.change_percent),
    research_score: numberOrNull(row.research_score),
    classification: row.research_classification,
    confidence: numberOrNull(row.research_confidence),
    forecast_direction: row.forecast_direction,
    evidence: strings(row.reasons).slice(0, 3),
    observed_at: row.observed_at,
  }))
  const riskDigest = ranked
    .filter((row) => strings(row.risk_flags).length > 0 || isStale(row.observed_at))
    .slice(0, 5)
    .map((row) => ({
      asset_id: row.market_asset_id,
      symbol: row.display_symbol,
      classification: row.research_classification,
      flags: [
        ...strings(row.risk_flags).slice(0, 4),
        ...(isStale(row.observed_at) ? ['Latest verified price is stale.'] : []),
      ],
      observed_at: row.observed_at,
    }))
  const coverageSummary = {
    watchlist_name: watchlist.name,
    requested_assets: assetIds.length,
    covered_assets: ranked.length,
    positive: positive.length,
    cautious: cautious.length,
    pending: pending.length,
    stale: stale.length,
    risk_flags: riskCount,
    billing_currency: preference?.billing_currency ?? 'USD',
  }
  const topSentence = top
    ? `The highest current research score is ${top.display_symbol} at ${Math.round(numberOrNull(top.research_score) ?? 0)} out of 100.`
    : 'No watchlist security has enough verified evidence for a research score.'
  const executiveSummary =
    `${watchlist.name} contains ${ranked.length} covered securities: ${positive.length} positive, ${cautious.length} cautious, and ${pending.length} awaiting sufficient data. ${topSentence} ${riskCount} methodology risk flags and ${stale.length} stale price records require review.`
  const sourceMaxTimestamp = ranked
    .flatMap((row) => [row.research_generated_at, row.observed_at])
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null
  const payload = {
    title: `TradePulse research brief · ${briefDate}`,
    executiveSummary,
    highlights,
    riskDigest,
    coverageSummary,
    methodologyVersion: COPILOT_VERSION,
    sourceMaxTimestamp,
  }
  const hash = await contentHash(payload)

  const { data: brief, error: briefError } = await admin
    .from('research_briefs')
    .upsert({
      user_id: userId,
      brief_date: briefDate,
      cadence,
      title: payload.title,
      executive_summary: executiveSummary,
      highlights,
      risk_digest: riskDigest,
      coverage_summary: coverageSummary,
      methodology_version: COPILOT_VERSION,
      content_hash: hash,
      source_max_timestamp: sourceMaxTimestamp,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,brief_date,cadence' })
    .select('id, generated_at')
    .single()

  if (briefError) throw briefError
  const alertsTriggered = await evaluateAlerts(admin, userId, ranked)

  return {
    status: 'generated',
    briefId: brief.id,
    generatedAt: brief.generated_at,
    coveredAssets: ranked.length,
    alertsTriggered,
  }
}

Deno.serve(observeEdgeHandler('research-brief', async (request) => {
  if (request.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  try {
    const body = await request.json().catch(() => ({})) as { userId?: string }
    const scheduled = await hasValidInternalSecret(request, 'SYNC_SECRET')

    if (!scheduled) {
      const { user } = await requireUser(request)
      const result = await generateForUser(admin, user.id, 'on_demand')

      if (result.status === 'empty_watchlist') {
        return jsonResponse({ error: 'Add at least one covered stock to your watchlist first.' }, 409)
      }
      if (result.status === 'coverage_unavailable') {
        return jsonResponse({ error: 'Watchlist research coverage is not available yet.' }, 409)
      }

      return jsonResponse(result)
    }

    let preferenceQuery = admin
      .from('research_brief_preferences')
      .select('user_id')
      .eq('enabled', true)
      .limit(100)

    if (body.userId) {
      preferenceQuery = preferenceQuery.eq('user_id', body.userId)
    }

    const { data: preferences, error } = await preferenceQuery
    if (error) throw error

    const results = []
    for (const preference of preferences ?? []) {
      results.push({
        userId: preference.user_id,
        ...(await generateForUser(admin, preference.user_id, null)),
      })
    }

    return jsonResponse({ status: 'completed', users: results.length, results })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown_error'
    if (['authentication_required', 'rate_limited', 'server_configuration'].includes(code)) {
      return userGuardErrorResponse(error)
    }
    console.error('Research brief generation failed:', code)
    return jsonResponse({ error: 'Research brief generation failed' }, 500)
  }
}))
