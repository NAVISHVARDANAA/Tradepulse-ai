import { supabase } from '../supabase/client'

type PublicStatusRow = {
  service_code: string
  display_name: string
  service_category: string
  current_status: 'operational' | 'degraded' | 'outage' | 'initializing'
  public_title: string | null
  public_message: string | null
  last_checked_at: string | null
  next_update_at: string | null
  target_availability_bps: number
  observed_availability_bps: number | null
  error_budget_remaining_bps: number | null
  evidence_count_30d: number
}

export type PlatformServiceStatus = {
  serviceCode: string
  displayName: string
  serviceCategory: string
  status: PublicStatusRow['current_status']
  title: string | null
  message: string | null
  lastCheckedAt: string | null
  nextUpdateAt: string | null
  targetAvailabilityBps: number
  observedAvailabilityBps: number | null
  errorBudgetRemainingBps: number | null
  evidenceCount30d: number
}

export async function getPlatformStatus(): Promise<PlatformServiceStatus[]> {
  const { data, error } = await supabase
    .from('platform_public_status')
    .select(
      'service_code, display_name, service_category, current_status, public_title, public_message, last_checked_at, next_update_at, target_availability_bps, observed_availability_bps, error_budget_remaining_bps, evidence_count_30d',
    )
    .order('service_code')

  if (error) throw error

  return ((data ?? []) as PublicStatusRow[]).map((row) => ({
    serviceCode: row.service_code,
    displayName: row.display_name,
    serviceCategory: row.service_category,
    status: row.current_status,
    title: row.public_title,
    message: row.public_message,
    lastCheckedAt: row.last_checked_at,
    nextUpdateAt: row.next_update_at,
    targetAvailabilityBps: Number(row.target_availability_bps),
    observedAvailabilityBps:
      row.observed_availability_bps === null ? null : Number(row.observed_availability_bps),
    errorBudgetRemainingBps:
      row.error_budget_remaining_bps === null ? null : Number(row.error_budget_remaining_bps),
    evidenceCount30d: Number(row.evidence_count_30d),
  }))
}
