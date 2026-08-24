import { supabase } from '../supabase/client'

export type PrivacyPreferences = {
  productAnalytics: boolean
  researchUpdates: boolean
  policyVersion: string
  updatedAt: string
}

export type PrivacyRequest = {
  id: string
  requestType: 'access_export' | 'account_deletion'
  status: 'requested' | 'in_review' | 'completed' | 'cancelled' | 'rejected'
  requestedAt: string
}

type PreferenceRow = { product_analytics: boolean; research_updates: boolean; policy_version: string; updated_at: string }
type RequestRow = { id: string; request_type: PrivacyRequest['requestType']; status: PrivacyRequest['status']; requested_at: string }

const mapRequest = (row: RequestRow): PrivacyRequest => ({
  id: row.id, requestType: row.request_type, status: row.status, requestedAt: row.requested_at,
})

export async function getPrivacyCenter() {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Authentication required')

  const [preferencesResult, requestsResult] = await Promise.all([
    supabase.from('customer_privacy_preferences').select('product_analytics, research_updates, policy_version, updated_at').maybeSingle(),
    supabase.from('customer_privacy_requests').select('id, request_type, status, requested_at').order('requested_at', { ascending: false }).limit(12),
  ])
  if (preferencesResult.error) throw preferencesResult.error
  if (requestsResult.error) throw requestsResult.error

  const row = preferencesResult.data as PreferenceRow | null
  return {
    preferences: row ? {
      productAnalytics: row.product_analytics,
      researchUpdates: row.research_updates,
      policyVersion: row.policy_version,
      updatedAt: row.updated_at,
    } : null,
    requests: ((requestsResult.data ?? []) as RequestRow[]).map(mapRequest),
  }
}

export async function savePrivacyPreferences(productAnalytics: boolean, researchUpdates: boolean) {
  const { error } = await supabase.rpc('set_customer_privacy_preferences', {
    p_product_analytics: productAnalytics,
    p_research_updates: researchUpdates,
  })
  if (error) throw error
}

export async function createPrivacyRequest(requestType: PrivacyRequest['requestType']) {
  const { data, error } = await supabase.rpc('request_customer_privacy_action', { p_request_type: requestType })
  if (error) throw error
  return mapRequest(data as RequestRow)
}

export async function cancelDeletionRequest(requestId: string) {
  const { error } = await supabase.rpc('cancel_customer_deletion_request', { p_request_id: requestId })
  if (error) throw error
}
