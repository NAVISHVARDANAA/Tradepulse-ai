import {
  getControlledAudiencePilotOperatingModel,
  type ControlledAudiencePilotOperatingModel,
} from './controlledAudiencePilotOperatingModel'

export type PilotActivationGate = {
  key: string
  label: string
  accountableOwner: string
  requiredEvidence: string
  status: 'verification-required'
}

export type PilotActivationWave = {
  label: string
  participantCeiling: number
  audience: string
  advanceWhen: string
}

export type PilotStopCondition = {
  label: string
  response: string
}

export type ControlledPilotActivation = {
  operatingModel: ControlledAudiencePilotOperatingModel
  gates: PilotActivationGate[]
  waves: PilotActivationWave[]
  stopConditions: PilotStopCondition[]
  readyGateCount: number
  participantCeiling: number
  activationAuthorized: false
  invitationsEnabled: false
  realTimeDataEnabled: false
  pilotDataMode: 'authorized-reference-or-delayed'
}

const gates: PilotActivationGate[] = [
  {
    key: 'production-origin',
    label: 'Production origin and authentication',
    accountableOwner: 'Technical lead',
    requiredEvidence: 'HTTPS origin, exact redirects, email delivery, abuse controls and access revocation verified.',
    status: 'verification-required',
  },
  {
    key: 'legal-consent',
    label: 'Legal, privacy, risk and consent pack',
    accountableOwner: 'Business owner',
    requiredEvidence: 'Current pilot terms, privacy notice, non-advice boundary, consent language and complaints route approved.',
    status: 'verification-required',
  },
  {
    key: 'approved-roster',
    label: 'Approved participant roster',
    accountableOwner: 'Pilot owner',
    requiredEvidence: 'Named participants, supported jurisdiction, cohort fit, consent state, expiry and revocation owner confirmed outside the browser.',
    status: 'verification-required',
  },
  {
    key: 'support-incident',
    label: 'Support and incident coverage',
    accountableOwner: 'Operations owner',
    requiredEvidence: 'Staffed support, one-business-day response target, escalation path, monitoring and incident drill verified.',
    status: 'verification-required',
  },
  {
    key: 'privacy-telemetry',
    label: 'Privacy-safe learning telemetry',
    accountableOwner: 'Product analyst',
    requiredEvidence: 'Minimal event dictionary, retention, access, interview cadence and deletion process approved without sensitive financial data.',
    status: 'verification-required',
  },
  {
    key: 'data-labels',
    label: 'Data rights, freshness and labels',
    accountableOwner: 'Data owner',
    requiredEvidence: 'Every pilot surface identifies authorized reference, delayed or unavailable data and never implies real-time coverage.',
    status: 'verification-required',
  },
  {
    key: 'cost-capacity',
    label: 'Cost ceiling and capacity',
    accountableOwner: 'Business owner',
    requiredEvidence: 'Four-week spend ceiling, participant capacity, accessibility evidence and service limits explicitly approved.',
    status: 'verification-required',
  },
  {
    key: 'rollback-go-no-go',
    label: 'Rollback and accountable go / no-go',
    accountableOwner: 'Independent approver',
    requiredEvidence: 'Stop thresholds, access revocation, rollback owner, launch window, reason code and signed go / no-go decision recorded.',
    status: 'verification-required',
  },
]

const waves: PilotActivationWave[] = [
  {
    label: 'Wave 1 · trusted rehearsal',
    participantCeiling: 5,
    audience: 'Known, consented testers across product, finance and accessibility perspectives.',
    advanceWhen: 'Every gate is independently verified and no critical stop condition is open.',
  },
  {
    label: 'Wave 2 · external learning',
    participantCeiling: 10,
    audience: 'Pre-screened external users matching the novice and self-directed cohorts.',
    advanceWhen: 'Wave 1 has seven safe days, support is within target and first-value evidence is usable.',
  },
  {
    label: 'Wave 3 · bounded expansion',
    participantCeiling: 15,
    audience: 'Remaining approved cohorts, preserving the overall 30-participant ceiling.',
    advanceWhen: 'Wave 2 meets safety, trust, activation and research-flow thresholds with capacity remaining.',
  },
]

const stopConditions: PilotStopCondition[] = [
  { label: 'Critical security or privacy incident', response: 'Revoke pilot access and open the incident runbook.' },
  { label: 'Trading, payment or funding path appears', response: 'Stop the pilot and restore the execution lock.' },
  { label: 'Data is mislabeled as real time', response: 'Hide the affected surface until freshness is corrected.' },
  { label: 'Unsupported personalized-advice behavior', response: 'Disable the affected flow and review its evidence boundary.' },
  { label: 'Material data-rights or entitlement doubt', response: 'Remove the affected data until rights are verified.' },
  { label: 'Support or monitoring becomes unstaffed', response: 'Pause new access and notify current participants.' },
  { label: 'Performance or accessibility blocks a core task', response: 'Hold the wave and remediate before expansion.' },
  { label: 'Approved cost or participant ceiling is reached', response: 'Freeze expansion pending a new human authorization.' },
]

export async function getControlledPilotActivation(): Promise<ControlledPilotActivation> {
  const operatingModel = await getControlledAudiencePilotOperatingModel()

  return {
    operatingModel,
    gates,
    waves,
    stopConditions,
    readyGateCount: 0,
    participantCeiling: waves.reduce((total, wave) => total + wave.participantCeiling, 0),
    activationAuthorized: false,
    invitationsEnabled: false,
    realTimeDataEnabled: false,
    pilotDataMode: 'authorized-reference-or-delayed',
  }
}
