import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in to use your private AI workspace.')
  return data.user.id
}

async function functionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string }
      if (payload.error) throw new Error(payload.error)
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) throw responseError
    }
  }
  throw error instanceof Error ? error : new Error('The AI workspace request could not be completed.')
}

export type AgenticControl = {
  policyVersion: string
  groundedResponsesRequired: boolean
  citationsRequired: boolean
  continuousCandidateTrainingEnabled: boolean
  humanModelPromotionRequired: boolean
  externalLlmConnected: boolean
  directSelfPromotionEnabled: boolean
  autonomousTradeExecutionEnabled: boolean
  maxAssetsPerRun: number
}

export type NewsSignal = {
  id: number
  assetId: number | null
  symbol: string | null
  regionCode: string
  eventType: string
  impactDirection: string
  sentimentScore: number
  relevanceScore: number
  summary: string
  sourceReference: string
  sourceName: string
  rightsStatus: string
  publishedAt: string
  synthetic: boolean
}

export type ModelCandidate = {
  candidateKey: string
  modelName: string
  candidateVersion: string
  featureSchemaVersion: string
  candidateStatus: string
  promotionStatus: string
  automaticallyPromoted: boolean
  trainingDataCutoff: string
}

export type AgenticPreferences = {
  assistantStyle: 'concise' | 'balanced' | 'detailed'
  riskLens: 'conservative' | 'balanced' | 'growth'
  defaultHorizon: '1d' | '1w' | '1m' | '3m'
  defaultCurrency: string
  preferredRegions: string[]
  reportSections: string[]
  promptTrainingOptIn: boolean
}

export type AgenticReport = {
  id: string
  clientReportId: string
  name: string
  subject: 'portfolio' | 'watchlist' | 'market' | 'stock' | 'cross_border'
  sections: string[]
  filters: Record<string, unknown>
  schedule: 'on_demand' | 'weekdays' | 'weekly'
  outputFormat: 'interactive' | 'csv'
  updatedAt: string
}

export type AgentMessage = {
  id: number
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  evidence: Array<Record<string, unknown>>
  safetyStatus: string
  createdAt: string
}

export type AgentResponse = {
  answer: string
  agents: string[]
  evidence: Array<Record<string, unknown>>
  disclaimer: string
  dataCutoff: string
  style?: string
  riskLens?: string
  modelMode?: string
  externalLlmConnected?: boolean
}

export type AgenticWorkspace = {
  control: AgenticControl
  news: NewsSignal[]
  candidates: ModelCandidate[]
  preferences: AgenticPreferences
  reports: AgenticReport[]
  messages: AgentMessage[]
  conversationId: string | null
}

const defaultPreferences: AgenticPreferences = {
  assistantStyle: 'balanced', riskLens: 'balanced', defaultHorizon: '1w',
  defaultCurrency: 'USD', preferredRegions: ['GLOBAL'],
  reportSections: ['market_snapshot', 'forecast', 'news', 'risk'],
  promptTrainingOptIn: false,
}

export async function getAgenticWorkspace(): Promise<AgenticWorkspace> {
  const userId = await currentUserId()
  const [controlResult, newsResult, candidateResult, preferenceResult, reportResult, conversationResult] = await Promise.all([
    supabase.from('agentic_ai_control_status').select('*').eq('control_key', 'customer-agentic-research').single(),
    supabase.from('global_news_signal_catalog').select('*').order('published_at', { ascending: false }).limit(12),
    supabase.from('agentic_model_learning_ledger').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('agentic_workspace_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('agentic_report_definitions').select('*').eq('user_id', userId).eq('active', true).order('updated_at', { ascending: false }).limit(8),
    supabase.from('agentic_conversations').select('id').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const firstError = [controlResult.error, newsResult.error, candidateResult.error, preferenceResult.error, reportResult.error, conversationResult.error].find(Boolean)
  if (firstError) throw firstError

  const conversationId = conversationResult.data?.id ?? null
  const messageResult = conversationId
    ? await supabase.from('agentic_messages').select('*').eq('conversation_id', conversationId).order('created_at').limit(30)
    : { data: [], error: null }
  if (messageResult.error) throw messageResult.error
  const control = controlResult.data
  const preference = preferenceResult.data

  return {
    control: {
      policyVersion: control.policy_version,
      groundedResponsesRequired: control.grounded_responses_required,
      citationsRequired: control.citations_required,
      continuousCandidateTrainingEnabled: control.continuous_candidate_training_enabled,
      humanModelPromotionRequired: control.human_model_promotion_required,
      externalLlmConnected: control.external_llm_connected,
      directSelfPromotionEnabled: control.direct_self_promotion_enabled,
      autonomousTradeExecutionEnabled: control.autonomous_trade_execution_enabled,
      maxAssetsPerRun: control.max_assets_per_run,
    },
    news: (newsResult.data ?? []).map((item) => ({
      id: item.id, assetId: item.asset_id, symbol: item.symbol,
      regionCode: item.region_code, eventType: item.event_type,
      impactDirection: item.impact_direction,
      sentimentScore: toNumber(item.sentiment_score) ?? 0,
      relevanceScore: toNumber(item.relevance_score) ?? 0,
      summary: item.normalized_summary, sourceReference: item.source_reference,
      sourceName: item.source_name, rightsStatus: item.rights_status,
      publishedAt: item.published_at, synthetic: item.synthetic,
    })),
    candidates: (candidateResult.data ?? []).map((item) => ({
      candidateKey: item.candidate_key, modelName: item.model_name,
      candidateVersion: item.candidate_version,
      featureSchemaVersion: item.feature_schema_version,
      candidateStatus: item.candidate_status, promotionStatus: item.promotion_status,
      automaticallyPromoted: item.automatically_promoted,
      trainingDataCutoff: item.training_data_cutoff,
    })),
    preferences: preference ? {
      assistantStyle: preference.assistant_style,
      riskLens: preference.risk_lens,
      defaultHorizon: preference.default_horizon,
      defaultCurrency: preference.default_currency,
      preferredRegions: preference.preferred_regions,
      reportSections: preference.report_sections,
      promptTrainingOptIn: preference.prompt_training_opt_in,
    } : defaultPreferences,
    reports: (reportResult.data ?? []).map((item) => ({
      id: item.id, clientReportId: item.client_report_id, name: item.name,
      subject: item.subject, sections: item.sections,
      filters: item.filters as Record<string, unknown>, schedule: item.schedule,
      outputFormat: item.output_format, updatedAt: item.updated_at,
    })),
    messages: (messageResult.data ?? []).map((item) => ({
      id: item.id, conversationId: item.conversation_id, role: item.role,
      content: item.content,
      evidence: Array.isArray(item.grounded_evidence) ? item.grounded_evidence : [],
      safetyStatus: item.safety_status, createdAt: item.created_at,
    })),
    conversationId,
  }
}

export async function saveAgenticPreferences(preferences: AgenticPreferences) {
  const { error } = await supabase.rpc('save_agentic_workspace_preferences', {
    p_assistant_style: preferences.assistantStyle,
    p_risk_lens: preferences.riskLens,
    p_default_horizon: preferences.defaultHorizon,
    p_default_currency: preferences.defaultCurrency,
    p_preferred_regions: preferences.preferredRegions,
    p_report_sections: preferences.reportSections,
    p_prompt_training_opt_in: preferences.promptTrainingOptIn,
  })
  if (error) throw error
}

export async function saveAgenticReport(input: Omit<AgenticReport, 'id' | 'updatedAt'>) {
  const { error } = await supabase.rpc('save_agentic_report_definition', {
    p_client_report_id: input.clientReportId,
    p_name: input.name,
    p_subject: input.subject,
    p_sections: input.sections,
    p_filters: input.filters,
    p_schedule: input.schedule,
    p_output_format: input.outputFormat,
  })
  if (error) throw error
}

export async function runInvestingAgent(input: {
  prompt: string
  mode: 'market_brief' | 'stock_analysis' | 'risk_review' | 'report_builder'
  assetIds: number[]
  conversationId: string | null
}) {
  const { data, error } = await supabase.functions.invoke('run-investing-agent', {
    body: {
      ...input,
      clientRunId: `agent-${crypto.randomUUID()}`,
      conversationId: input.conversationId ?? undefined,
    },
  })
  if (error) return functionError(error)
  return data as { status: string; conversationId: string; response: AgentResponse }
}
