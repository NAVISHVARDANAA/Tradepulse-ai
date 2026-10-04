import { supabase } from '../supabase/client'

export type PilotFoundation = {
  key: 'audience' | 'live-data' | 'commercial'
  label: string
  policyVersion: string
  dimensionCount: number
  gateCount: number
  stateCount: number
  readinessCellCount: number
  blockedReadinessCellCount: number
  authorizedReadinessCellCount: number
  ready: boolean
}

export type PilotCohort = {
  label: string
  target: number
  learningGoal: string
}

export type PilotMetric = {
  label: string
  threshold: string
  decisionUse: string
}

export type PilotWorkstream = {
  label: string
  deliverable: string
}

export type ControlledAudiencePilotOperatingModel = {
  foundations: PilotFoundation[]
  cohorts: PilotCohort[]
  metrics: PilotMetric[]
  workstreams: PilotWorkstream[]
  readyFoundationCount: number
}

const cohorts: PilotCohort[] = [
  { label: 'Novice investors', target: 8, learningGoal: 'Clarity, education and trust' },
  { label: 'Self-directed investors', target: 8, learningGoal: 'Research workflow value' },
  { label: 'Finance and data professionals', target: 6, learningGoal: 'Evidence and methodology' },
  { label: 'Fintech and product reviewers', target: 4, learningGoal: 'Positioning and differentiation' },
  { label: 'Mobile and accessibility testers', target: 4, learningGoal: 'Inclusive usability' },
]

const metrics: PilotMetric[] = [
  { label: 'Activation', threshold: '≥ 70%', decisionUse: 'Can approved participants reach first value?' },
  { label: 'Time to first value', threshold: '≤ 10 min', decisionUse: 'Is onboarding sufficiently focused?' },
  { label: 'Weekly retention', threshold: '≥ 40%', decisionUse: 'Does the product earn repeat use over four weeks?' },
  { label: 'Research-flow completion', threshold: '≥ 60%', decisionUse: 'Can participants complete the core job?' },
  { label: 'Trust clarity', threshold: '≥ 4/5', decisionUse: 'Are evidence, freshness and boundaries understood?' },
  { label: 'Critical safety violations', threshold: '0', decisionUse: 'Does the bounded pilot remain safe?' },
  { label: 'Support response', threshold: '< 1 business day', decisionUse: 'Can the team support the cohort responsibly?' },
]

const workstreams: PilotWorkstream[] = [
  { label: 'Target segment', deliverable: 'Screening criteria and problem hypotheses' },
  { label: 'Value proposition', deliverable: 'Research-only promise and differentiation' },
  { label: 'Pilot offer', deliverable: 'Free four-week evaluation, no checkout' },
  { label: 'Recruitment and consent', deliverable: 'Approved roster and informed agreement' },
  { label: 'Onboarding and support', deliverable: 'Missions, office hours and escalation path' },
  { label: 'Telemetry and learning', deliverable: 'Minimal event plan and interview cadence' },
  { label: 'Unit economics', deliverable: 'Manual cost ledger and approved ceiling' },
  { label: 'Go / no-go', deliverable: 'Evidence review, rollback and accountable decision' },
]

export async function getControlledAudiencePilotOperatingModel(): Promise<ControlledAudiencePilotOperatingModel> {
  const [audienceResult, liveDataResult, commercialResult] = await Promise.all([
    supabase.from('external_audience_launch_status').select('*')
      .eq('control_key', 'external-audience-launch-controls').single(),
    supabase.from('licensed_live_data_integration_status').select('*')
      .eq('control_key', 'licensed-live-data-integration-controls').single(),
    supabase.from('licensed_provider_commercial_readiness_status').select('*')
      .eq('control_key', 'licensed-provider-commercial-readiness-controls').single(),
  ])
  const firstError = [audienceResult.error, liveDataResult.error, commercialResult.error].find(Boolean)
  if (firstError) throw firstError

  const rows = [
    {
      key: 'audience' as const, label: 'External audience launch', data: audienceResult.data,
      dimensionCount: audienceResult.data.audience_surface_count,
      gateCount: audienceResult.data.launch_gate_count,
      stateCount: audienceResult.data.launch_state_count,
    },
    {
      key: 'live-data' as const, label: 'Licensed live-data integration', data: liveDataResult.data,
      dimensionCount: liveDataResult.data.feed_class_count,
      gateCount: liveDataResult.data.integration_gate_count,
      stateCount: liveDataResult.data.integration_state_count,
    },
    {
      key: 'commercial' as const, label: 'Provider commercial readiness', data: commercialResult.data,
      dimensionCount: commercialResult.data.commercial_domain_count,
      gateCount: commercialResult.data.commercial_gate_count,
      stateCount: commercialResult.data.commercial_state_count,
    },
  ]
  const foundations: PilotFoundation[] = rows.map((row) => ({
    key: row.key,
    label: row.label,
    policyVersion: row.data.policy_version,
    dimensionCount: row.dimensionCount,
    gateCount: row.gateCount,
    stateCount: row.stateCount,
    readinessCellCount: row.data.readiness_cell_count,
    blockedReadinessCellCount: row.data.blocked_readiness_cell_count,
    authorizedReadinessCellCount: row.data.authorized_readiness_cell_count,
    ready: row.data.blocked_readiness_cell_count === 0
      && row.data.authorized_readiness_cell_count === row.data.readiness_cell_count,
  }))

  return {
    foundations,
    cohorts,
    metrics,
    workstreams,
    readyFoundationCount: foundations.filter((foundation) => foundation.ready).length,
  }
}
