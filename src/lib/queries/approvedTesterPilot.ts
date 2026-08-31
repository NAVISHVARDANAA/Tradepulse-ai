import { supabase } from '../supabase/client'

export type PilotMissionCode =
  | 'trust-review'
  | 'forecast-review'
  | 'paper-simulation'
  | 'support-recovery'

export type ApprovedTesterPilotStatus = {
  eligible: boolean
  cohortCode: string | null
  cohortName: string | null
  cohortStatus: 'draft' | 'approved' | 'active' | 'paused' | 'completed' | 'cancelled' | null
  membershipStatus: 'approved' | 'active' | 'paused' | 'completed' | 'revoked' | null
  startsAt: string | null
  endsAt: string | null
  termsVersion: string | null
  termsAcceptedAt: string | null
  termsVersionAccepted: string | null
  maxTesters: number | null
  feedbackResponseTargetHours: number | null
  incidentResponseTargetMinutes: number | null
  completedMissions: PilotMissionCode[]
}

type PilotPayload = Partial<ApprovedTesterPilotStatus> & { eligible?: unknown }

const emptyStatus: ApprovedTesterPilotStatus = {
  eligible: false,
  cohortCode: null,
  cohortName: null,
  cohortStatus: null,
  membershipStatus: null,
  startsAt: null,
  endsAt: null,
  termsVersion: null,
  termsAcceptedAt: null,
  termsVersionAccepted: null,
  maxTesters: null,
  feedbackResponseTargetHours: null,
  incidentResponseTargetMinutes: null,
  completedMissions: [],
}

function mapStatus(data: unknown): ApprovedTesterPilotStatus {
  if (!data || typeof data !== 'object') return emptyStatus
  const payload = data as PilotPayload
  return {
    ...emptyStatus,
    ...payload,
    eligible: payload.eligible === true,
    completedMissions: Array.isArray(payload.completedMissions)
      ? payload.completedMissions.filter((mission): mission is PilotMissionCode => (
        ['trust-review', 'forecast-review', 'paper-simulation', 'support-recovery']
          .includes(String(mission))
      ))
      : [],
  }
}

export async function getApprovedTesterPilotStatus() {
  const { data, error } = await supabase.rpc('get_controlled_beta_pilot_status')
  if (error) throw error
  return mapStatus(data)
}

export async function acceptApprovedTesterPilotTerms(termsVersion: string) {
  const { data, error } = await supabase.rpc('accept_controlled_beta_pilot_terms', {
    p_terms_version: termsVersion,
  })
  if (error) throw error
  return mapStatus(data)
}

export async function setApprovedTesterPilotMission(
  missionCode: PilotMissionCode,
  completed: boolean,
) {
  const { data, error } = await supabase.rpc('set_controlled_beta_pilot_mission', {
    p_mission_code: missionCode,
    p_completed: completed,
  })
  if (error) throw error
  return mapStatus(data)
}

