import { createClient } from 'npm:@supabase/supabase-js@2'

import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type AgentMode = 'market_brief' | 'stock_analysis' | 'risk_review' | 'report_builder'

type AgentRequest = {
  prompt?: string
  mode?: AgentMode
  assetIds?: number[]
  conversationId?: string
  clientRunId?: string
}

type Preferences = {
  assistant_style: 'concise' | 'balanced' | 'detailed'
  risk_lens: 'conservative' | 'balanced' | 'growth'
  default_horizon: '1d' | '1w' | '1m' | '3m'
  default_currency: string
  preferred_regions: string[]
  report_sections: string[]
  prompt_training_opt_in: boolean
}

type ResearchRow = {
  market_asset_id: number
  display_symbol: string
  company_name: string
  price: number | string | null
  change_percent: number | string | null
  research_score: number | string | null
  research_classification: string | null
  research_confidence: number | string | null
  forecast_direction: string | null
  reasons: unknown
  risk_flags: unknown
  observed_at: string | null
  research_generated_at: string | null
}

type ForecastRow = {
  asset_id: number
  symbol: string
  predicted_price: number | string
  lower_bound: number | string | null
  upper_bound: number | string | null
  confidence_score: number | string | null
  direction: string
  reliability_status: string
  generated_at: string
  target_at: string
  model_name: string
  model_version: string
}

type NewsRow = {
  id: number
  asset_id: number | null
  symbol: string | null
  region_code: string
  event_type: string
  impact_direction: string
  sentiment_score: number | string
  relevance_score: number | string
  normalized_summary: string
  source_reference: string
  source_name: string
  rights_status: string
  published_at: string
  synthetic: boolean
}

const ORCHESTRATOR_VERSION = 'tradepulse-agentic-research-v1.0.0'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const clientIdPattern = /^[A-Za-z0-9:_-]{8,100}$/
const allowedModes = new Set<AgentMode>(['market_brief', 'stock_analysis', 'risk_review', 'report_builder'])
const executionRequest = /\b(execute|place|submit|route)\b.{0,24}\b(order|trade)\b|\b(move|transfer)\b.{0,24}\b(funds?|money)\b/i

function numeric(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readable(value: string | null) {
  return value ? value.replace(/_/g, ' ') : 'unavailable'
}

function rounded(value: number | null, digits = 1) {
  return value === null ? 'unavailable' : value.toFixed(digits)
}

function personalizeCopy(value: string, preferences: Preferences) {
  const context = ` Requested lens: ${preferences.risk_lens}; horizon: ${preferences.default_horizon}; reporting currency: ${preferences.default_currency}.`
  if (preferences.assistant_style === 'concise') {
    return `${value.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')}${context}`
  }
  if (preferences.assistant_style === 'detailed') {
    return `${value}${context} Method: display-qualified evidence only; uncertainty, source timing and reliability gates remain visible.`
  }
  return `${value}${context}`
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function responseCopy(
  mode: AgentMode,
  preferences: Preferences,
  research: ResearchRow[],
  forecasts: ForecastRow[],
  news: NewsRow[],
) {
  const lead = research[0]
  const forecast = lead ? forecasts.find((item) => item.asset_id === lead.market_asset_id) : forecasts[0]
  const relevantNews = lead
    ? news.filter((item) => item.asset_id === null || item.asset_id === lead.market_asset_id)
    : news
  const syntheticNotice = relevantNews.some((item) => item.synthetic)
    ? ' Current news cards include clearly marked synthetic scenarios and are excluded from model training.'
    : ''
  const evidenceGap = research.length === 0 && forecasts.length === 0
    ? ' No display-qualified stock research or forecasts were available, so I will not infer a direction.'
    : ''

  if (mode === 'stock_analysis' && lead) {
    const base = `${lead.display_symbol} (${lead.company_name}) has a current research classification of ${readable(lead.research_classification)} with a score of ${rounded(numeric(lead.research_score), 0)} out of 100. The latest observed price is ${rounded(numeric(lead.price), 2)}, and its recorded move is ${rounded(numeric(lead.change_percent), 2)}%.`
    const forecastCopy = forecast
      ? ` The governed ${forecast.model_name} v${forecast.model_version} forecast is ${readable(forecast.direction)} with ${rounded((numeric(forecast.confidence_score) ?? 0) * 100, 0)}% model confidence; its reliability state is ${readable(forecast.reliability_status)}.`
      : ' No display-qualified forecast is available for this asset.'
    const riskCopy = strings(lead.risk_flags).length
      ? ` Review these methodology flags: ${strings(lead.risk_flags).slice(0, 3).join('; ')}.`
      : ' No current methodology risk flag was supplied, but uncertainty and market loss remain possible.'
    const strongestNews = [...relevantNews].sort(
      (left, right) => (numeric(right.relevance_score) ?? 0) - (numeric(left.relevance_score) ?? 0),
    )[0]
    const newsCopy = strongestNews
      ? ` ${relevantNews.length} normalized news signals are in scope; the highest-relevance signal is ${readable(strongestNews.impact_direction)} with sentiment ${rounded(numeric(strongestNews.sentiment_score), 2)} from ${strongestNews.source_name}.`
      : ' No eligible normalized news signal is available for this stock, so news impact is not inferred.'
    return personalizeCopy(`${base}${forecastCopy}${riskCopy}${newsCopy}${syntheticNotice}`, preferences)
  }

  if (mode === 'risk_review') {
    const flags = research.flatMap((item) => strings(item.risk_flags).map((flag) => `${item.display_symbol}: ${flag}`))
    const negativeNews = news.filter((item) => numeric(item.sentiment_score) !== null && Number(item.sentiment_score) < -0.2)
    return personalizeCopy(`I reviewed ${research.length} covered stocks, ${forecasts.length} governed forecasts and ${news.length} normalized news signals through a ${preferences.risk_lens} risk lens. ${flags.length ? `Priority methodology flags are ${flags.slice(0, 4).join('; ')}.` : 'No explicit methodology flags are present in the current snapshot.'} ${negativeNews.length} news signals cross the negative-sentiment review threshold. This is a research risk review, not a suitability decision.${syntheticNotice}${evidenceGap}`, preferences)
  }

  if (mode === 'report_builder') {
    return personalizeCopy(`Your preferred report combines ${preferences.report_sections.map(readable).join(', ')} in ${preferences.default_currency}, using a ${preferences.default_horizon} horizon and ${preferences.assistant_style} explanations. I found ${research.length} covered stocks, ${forecasts.length} governed forecasts and ${news.length} eligible news signals for the current evidence snapshot. Save a report definition to reuse these choices.${syntheticNotice}${evidenceGap}`, preferences)
  }

  const positive = research.filter((item) => item.research_classification === 'research_positive').length
  const cautious = research.filter((item) => item.research_classification === 'research_cautious').length
  const directional = forecasts.reduce<Record<string, number>>((summary, item) => {
    summary[item.direction] = (summary[item.direction] ?? 0) + 1
    return summary
  }, {})
  return personalizeCopy(`The grounded market brief covers ${research.length} stocks: ${positive} research-positive and ${cautious} research-cautious. Governed forecasts currently show ${directional.up ?? 0} up, ${directional.down ?? 0} down and ${directional.flat ?? 0} flat classifications. ${news.length} normalized global-news signals are visible across your selected evidence scope.${syntheticNotice}${evidenceGap}`, preferences)
}

Deno.serve(observeEdgeHandler('agentic-investing', async (request) => {
  if (request.method === 'OPTIONS') return corsPreflightResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request, { requireVerifiedMfaWhenEnrolled: true })
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: AgentRequest
  try {
    input = await parseJsonBody<AgentRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse({ error: validation?.publicMessage ?? 'Invalid JSON request' }, validation?.status ?? 400)
  }

  const prompt = input.prompt?.trim() ?? ''
  const mode = input.mode ?? 'market_brief'
  const clientRunId = input.clientRunId?.trim() ?? ''
  const requestedAssetIds = [...new Set(input.assetIds ?? [])]
  if (
    prompt.length < 3 || prompt.length > 1200 || !allowedModes.has(mode) ||
    !clientIdPattern.test(clientRunId) || requestedAssetIds.length > 5 ||
    requestedAssetIds.some((id) => !Number.isInteger(id) || id <= 0) ||
    (input.conversationId && !uuidPattern.test(input.conversationId))
  ) return jsonResponse({ error: 'Invalid agent research request' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const userId = userContext.user.id
  let activeRunId: string | null = null

  try {
    const existing = await admin.from('agentic_runs')
      .select('id, conversation_id, status, response_payload')
      .eq('user_id', userId).eq('client_run_id', clientRunId).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) return jsonResponse({
      status: existing.data.status,
      runId: existing.data.id,
      conversationId: existing.data.conversation_id,
      response: existing.data.response_payload,
      idempotentReplay: true,
    })

    const [controlResult, preferenceResult] = await Promise.all([
      admin.from('agentic_ai_control_status').select('*').eq('control_key', 'customer-agentic-research').single(),
      admin.from('agentic_workspace_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (controlResult.error || !controlResult.data?.workspace_enabled) throw controlResult.error ?? new Error('workspace_disabled')
    if (requestedAssetIds.length > controlResult.data.max_assets_per_run || prompt.length > controlResult.data.max_prompt_characters) {
      return jsonResponse({ error: 'Agent research request exceeds the active safety policy' }, 400)
    }

    const preferences: Preferences = preferenceResult.data ?? {
      assistant_style: 'balanced', risk_lens: 'balanced', default_horizon: '1w',
      default_currency: 'USD', preferred_regions: ['GLOBAL'],
      report_sections: ['market_snapshot', 'forecast', 'news', 'risk'],
      prompt_training_opt_in: false,
    }

    let conversationId = input.conversationId
    if (conversationId) {
      const conversation = await admin.from('agentic_conversations').select('id')
        .eq('id', conversationId).eq('user_id', userId).maybeSingle()
      if (conversation.error) throw conversation.error
      if (!conversation.data) return jsonResponse({ error: 'Conversation is unavailable' }, 404)
    } else {
      const created = await admin.from('agentic_conversations')
        .insert({ user_id: userId, title: prompt.replace(/\s+/g, ' ').slice(0, 96) })
        .select('id').single()
      if (created.error) throw created.error
      conversationId = created.data.id
    }

    const promptDigest = await sha256(prompt)
    const refused = executionRequest.test(prompt)
    const runInsert = await admin.from('agentic_runs').insert({
      user_id: userId, conversation_id: conversationId, client_run_id: clientRunId,
      mode, status: 'running', prompt_digest: promptDigest,
      orchestrator_version: ORCHESTRATOR_VERSION, production_effect: false,
    }).select('id').single()
    if (runInsert.error) throw runInsert.error
    const runId = runInsert.data.id
    activeRunId = runId

    const userMessage = await admin.from('agentic_messages').insert({
      conversation_id: conversationId, run_id: runId, user_id: userId,
      role: 'user', content: prompt, grounded_evidence: [], safety_status: 'not_applicable',
      training_consent: Boolean(preferences.prompt_training_opt_in),
    })
    if (userMessage.error) throw userMessage.error

    if (refused) {
      const response = {
        answer: 'I can analyze evidence, forecasts, scenarios and risk, but I cannot place trades, route orders or move money. Ask me to compare the evidence or build a paper-trading research plan instead.',
        agents: ['planner', 'safety_reviewer'], evidence: [],
        disclaimer: 'Research and education only. No financial advice or execution.',
        dataCutoff: new Date().toISOString(),
      }
      const writes = await Promise.all([
        admin.from('agentic_run_steps').insert([
          { run_id: runId, sequence_number: 1, agent_role: 'planner', status: 'blocked', evidence: { reason: 'execution_request' } },
          { run_id: runId, sequence_number: 2, agent_role: 'safety_reviewer', status: 'completed', evidence: { autonomous_execution: false } },
        ]),
        admin.from('agentic_runs').update({ status: 'refused', response_payload: response, refusal_reasons: ['AUTONOMOUS_EXECUTION_DISABLED'], completed_at: new Date().toISOString() }).eq('id', runId),
        admin.from('agentic_messages').insert({ conversation_id: conversationId, run_id: runId, user_id: userId, role: 'assistant', content: response.answer, grounded_evidence: [], safety_status: 'refused' }),
      ])
      const writeError = writes.find((result) => result.error)?.error
      if (writeError) throw writeError
      return jsonResponse({ status: 'refused', runId, conversationId, response, idempotentReplay: false })
    }

    let assetIds = requestedAssetIds
    if (assetIds.length === 0) {
      const watchlist = await admin.from('watchlists').select('id').eq('user_id', userId)
        .order('is_default', { ascending: false }).limit(1).maybeSingle()
      if (watchlist.error) throw watchlist.error
      if (watchlist.data) {
        const items = await admin.from('watchlist_items').select('asset_id')
          .eq('watchlist_id', watchlist.data.id)
          .order('created_at', { ascending: true }).limit(5)
        if (items.error) throw items.error
        assetIds = (items.data ?? []).map((item) => item.asset_id)
      }
    }

    let researchQuery = admin.from('equity_research_dashboard')
      .select('market_asset_id, display_symbol, company_name, price, change_percent, research_score, research_classification, research_confidence, forecast_direction, reasons, risk_flags, observed_at, research_generated_at')
      .order('research_generated_at', { ascending: false, nullsFirst: false }).limit(5)
    let forecastQuery = admin.from('display_qualified_market_forecasts')
      .select('asset_id, symbol, predicted_price, lower_bound, upper_bound, confidence_score, direction, reliability_status, generated_at, target_at, model_name, model_version')
      .order('generated_at', { ascending: false }).limit(10)
    if (assetIds.length) {
      researchQuery = researchQuery.in('market_asset_id', assetIds)
      forecastQuery = forecastQuery.in('asset_id', assetIds)
    }

    const [researchResult, forecastResult, newsResult] = await Promise.all([
      researchQuery, forecastQuery,
      admin.from('global_news_signal_catalog').select('*').order('published_at', { ascending: false }).limit(20),
    ])
    const queryError = researchResult.error ?? forecastResult.error ?? newsResult.error
    if (queryError) throw queryError
    const research = (researchResult.data ?? []) as ResearchRow[]
    const forecasts = (forecastResult.data ?? []) as ForecastRow[]
    const news = ((newsResult.data ?? []) as NewsRow[]).filter((item) =>
      (assetIds.length === 0 || item.asset_id === null || assetIds.includes(item.asset_id)) &&
      (preferences.preferred_regions.includes('GLOBAL') || preferences.preferred_regions.includes(item.region_code)),
    ).slice(0, 10)

    const evidence = [
      ...research.map((item) => ({ type: 'research', assetId: item.market_asset_id, symbol: item.display_symbol, observedAt: item.research_generated_at ?? item.observed_at })),
      ...forecasts.map((item) => ({ type: 'forecast', assetId: item.asset_id, symbol: item.symbol, observedAt: item.generated_at, model: `${item.model_name}@${item.model_version}` })),
      ...news.map((item) => ({ type: 'news_signal', assetId: item.asset_id, symbol: item.symbol, observedAt: item.published_at, source: item.source_name, sourceReference: item.source_reference, synthetic: item.synthetic })),
    ]
    const answer = responseCopy(mode, preferences, research, forecasts, news)
    const dataCutoff = evidence.map((item) => item.observedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString()
    const agents = ['planner', 'news_analyst', 'forecast_analyst', 'risk_analyst', ...(mode === 'report_builder' ? ['report_builder'] : []), 'safety_reviewer']
    const response = {
      answer, agents, evidence,
      disclaimer: 'Probabilistic research support only—not financial advice, a suitability decision, or an order instruction.',
      dataCutoff, style: preferences.assistant_style, riskLens: preferences.risk_lens,
      modelMode: 'grounded-orchestrator', externalLlmConnected: false,
    }

    const stepRows = agents.map((agent, index) => ({
      run_id: runId, sequence_number: index + 1, agent_role: agent,
      status: 'completed', evidence: { evidence_count: evidence.length, production_effect: false },
    }))
    const completedAt = new Date().toISOString()
    const writes = await Promise.all([
      admin.from('agentic_run_steps').insert(stepRows),
      admin.from('agentic_runs').update({
        status: 'completed', source_snapshot: { assetIds, dataCutoff },
        evidence_count: evidence.length, response_payload: response, completed_at: completedAt,
      }).eq('id', runId),
      admin.from('agentic_messages').insert({
        conversation_id: conversationId, run_id: runId, user_id: userId,
        role: 'assistant', content: answer, grounded_evidence: evidence, safety_status: 'grounded',
      }),
      admin.from('agentic_conversations').update({ updated_at: completedAt }).eq('id', conversationId).eq('user_id', userId),
    ])
    const writeError = writes.find((result) => result.error)?.error
    if (writeError) throw writeError

    return jsonResponse({ status: 'completed', runId, conversationId, response, idempotentReplay: false })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown_error'
    console.error('Agentic investing request failed:', code)
    if (activeRunId) {
      const failedRun = await admin.from('agentic_runs').update({
        status: 'failed', completed_at: new Date().toISOString(),
        refusal_reasons: ['INTERNAL_PROCESSING_ERROR'],
      }).eq('id', activeRunId).eq('user_id', userId)
      if (failedRun.error) console.error('Agentic investing failure ledger update failed')
    }
    return jsonResponse({ error: 'The grounded investing agent could not complete this request.' }, 500)
  }
}))
