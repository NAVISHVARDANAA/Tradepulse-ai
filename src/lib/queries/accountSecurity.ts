import { supabase } from '../supabase/client'

export type AccountSecurityFactor = {
  id: string
  factorType: string
  friendlyName: string
  createdAt: string
  updatedAt: string
}

export type AccountSecurityPosture = {
  verifiedFactorCount: number
  verifiedFactorTypes: string[]
  currentAssuranceLevel: 'aal1' | 'aal2'
  nextAssuranceLevel: 'aal1' | 'aal2'
  securityState: 'standard' | 'step_up_required' | 'verified'
  postureRevision: number
  lastStepUpAt: string | null
  lastSyncedAt: string
}

export type AccountSecurityStatus = {
  posture: AccountSecurityPosture
  factors: AccountSecurityFactor[]
}

type SecurityEventRow = {
  id: number
  event_type: string
  summary: string
  occurred_at: string
}

export type AccountSecurityEvent = {
  id: number
  eventType: string
  summary: string
  occurredAt: string
}

async function invokeSecurityAction(action: 'status' | 'revoke_other_sessions') {
  const { data, error } = await supabase.functions.invoke('manage-account-security', {
    body: { action },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))

  return data
}

export async function getAccountSecurityStatus(): Promise<AccountSecurityStatus> {
  return await invokeSecurityAction('status') as AccountSecurityStatus
}

export async function revokeOtherAccountSessions() {
  return await invokeSecurityAction('revoke_other_sessions') as {
    revoked: boolean
    warning?: string
  }
}

export async function getAccountSecurityEvents(): Promise<AccountSecurityEvent[]> {
  const { data, error } = await supabase
    .from('account_security_events')
    .select('id, event_type, summary, occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(12)

  if (error) throw error

  return ((data ?? []) as SecurityEventRow[]).map((event) => ({
    id: Number(event.id),
    eventType: event.event_type,
    summary: event.summary,
    occurredAt: event.occurred_at,
  }))
}
