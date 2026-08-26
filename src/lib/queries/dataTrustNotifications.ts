import { supabase } from '../supabase/client'

export type DataTrustState = {
  dataset: string
  status: 'healthy' | 'warning' | 'critical' | 'not_run'
  freshnessMinutes: number | null
  recordsChecked: number
  nullRecords: number
  duplicateGroups: number
  policyVersion: string
  evaluatedAt: string
}

export type NotificationPreferences = {
  inAppEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
  researchAlerts: boolean
  platformIncidents: boolean
  productUpdates: boolean
  externalDeliveryEnabled: boolean
}

export async function getDataTrustState(): Promise<DataTrustState[]> {
  const { data, error } = await supabase.from('data_trust_current')
    .select('dataset, status, freshness_minutes, records_checked, null_records, duplicate_groups, policy_version, evaluated_at')
    .order('dataset')
  if (error) throw error
  return (data ?? []).map((row) => ({
    dataset: row.dataset,
    status: row.status as DataTrustState['status'],
    freshnessMinutes: row.freshness_minutes,
    recordsChecked: row.records_checked,
    nullRecords: row.null_records,
    duplicateGroups: row.duplicate_groups,
    policyVersion: row.policy_version,
    evaluatedAt: row.evaluated_at,
  }))
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase.from('notification_preferences')
    .select('in_app_enabled, email_enabled, push_enabled, research_alerts, platform_incidents, product_updates, external_delivery_enabled')
    .maybeSingle()
  if (error) throw error
  return {
    inAppEnabled: data?.in_app_enabled ?? true,
    emailEnabled: data?.email_enabled ?? false,
    pushEnabled: data?.push_enabled ?? false,
    researchAlerts: data?.research_alerts ?? true,
    platformIncidents: data?.platform_incidents ?? true,
    productUpdates: data?.product_updates ?? false,
    externalDeliveryEnabled: data?.external_delivery_enabled ?? false,
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const { error } = await supabase.rpc('set_notification_preferences', {
    p_in_app: preferences.inAppEnabled,
    p_email: preferences.emailEnabled,
    p_push: preferences.pushEnabled,
    p_research_alerts: preferences.researchAlerts,
    p_platform_incidents: preferences.platformIncidents,
    p_product_updates: preferences.productUpdates,
  })
  if (error) throw error
}
