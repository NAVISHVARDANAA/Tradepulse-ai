import type { PaymentSandboxLedgerTemplate, PaymentSandboxTransferStage } from '../types/domain'

export type SandboxTransferScenario =
  | 'standard_delivery'
  | 'duplicate_retry'
  | 'webhook_replay'
  | 'reconciliation_exception'
  | 'dispute_refund'

export type SandboxTransferDecision =
  | 'unavailable'
  | 'rehearsal_complete'
  | 'duplicate_suppressed'
  | 'webhook_rejected'
  | 'rescue_review'
  | 'refund_review'

export type SandboxStageState =
  | 'evidence_ready'
  | 'standby'
  | 'not_required'
  | 'not_reached'
  | 'duplicate_suppressed'
  | 'replay_rejected'
  | 'exception_detected'
  | 'review_required'

export type SandboxTransferStageResult = PaymentSandboxTransferStage & {
  rehearsalState: SandboxStageState
}

export type SandboxLedgerEntry = PaymentSandboxLedgerTemplate & {
  currency: string
  amount: number
}

export type SandboxLedgerJournal = {
  journalKey: PaymentSandboxLedgerTemplate['journalKey']
  currency: string
  debit: number
  credit: number
  balanced: boolean
}

export type SandboxLedgerPreview = {
  entries: SandboxLedgerEntry[]
  journals: SandboxLedgerJournal[]
  balanced: boolean
}

export type SandboxTransferRehearsal = {
  decision: SandboxTransferDecision
  stages: SandboxTransferStageResult[]
  mappedStageCount: number
  requiredStageCount: number
  ledger: SandboxLedgerPreview
  summary: string
}

const expectedStages: PaymentSandboxTransferStage['stageKey'][] = [
  'idempotency',
  'sandbox_submission',
  'webhook_verification',
  'double_entry_ledger',
  'retry_policy',
  'reconciliation',
  'rescue_mode',
  'dispute',
  'refund',
]

const stateForScenario = (
  scenario: SandboxTransferScenario,
  stage: PaymentSandboxTransferStage['stageKey'],
): SandboxStageState => {
  const position = expectedStages.indexOf(stage)

  if (scenario === 'duplicate_retry') {
    return stage === 'idempotency' ? 'duplicate_suppressed' : 'not_reached'
  }
  if (scenario === 'webhook_replay') {
    if (stage === 'webhook_verification') return 'replay_rejected'
    return position < expectedStages.indexOf('webhook_verification') ? 'evidence_ready' : 'not_reached'
  }
  if (scenario === 'reconciliation_exception') {
    if (stage === 'reconciliation') return 'exception_detected'
    if (stage === 'rescue_mode') return 'review_required'
    return position < expectedStages.indexOf('reconciliation') ? 'evidence_ready' : 'not_reached'
  }
  if (scenario === 'dispute_refund') {
    if (stage === 'rescue_mode') return 'standby'
    if (stage === 'dispute' || stage === 'refund') return 'review_required'
    return 'evidence_ready'
  }
  if (stage === 'rescue_mode') return 'standby'
  if (stage === 'dispute' || stage === 'refund') return 'not_required'
  return 'evidence_ready'
}

export function buildSandboxLedgerPreview(
  templates: PaymentSandboxLedgerTemplate[],
  sourceAmount: number,
  destinationAmount: number,
): SandboxLedgerPreview {
  const amountsValid = Number.isFinite(sourceAmount)
    && sourceAmount > 0
    && Number.isFinite(destinationAmount)
    && destinationAmount > 0

  const entries = templates
    .slice()
    .sort((left, right) => left.priority - right.priority)
    .map((template) => ({
      ...template,
      currency: template.currencyRole === 'source'
        ? template.sourceCurrency
        : template.destinationCurrency,
      amount: template.amountBasis === 'source_amount' ? sourceAmount : destinationAmount,
    }))

  const journals = (['source_funding', 'destination_obligation'] as const).map((journalKey) => {
    const journalEntries = entries.filter((entry) => entry.journalKey === journalKey)
    const debit = journalEntries
      .filter((entry) => entry.entrySide === 'debit')
      .reduce((total, entry) => total + entry.amount, 0)
    const credit = journalEntries
      .filter((entry) => entry.entrySide === 'credit')
      .reduce((total, entry) => total + entry.amount, 0)
    const currencies = new Set(journalEntries.map((entry) => entry.currency))
    return {
      journalKey,
      currency: journalEntries[0]?.currency ?? '—',
      debit,
      credit,
      balanced: amountsValid
        && journalEntries.length === 2
        && currencies.size === 1
        && Math.abs(debit - credit) < 0.005,
    }
  })

  return {
    entries,
    journals,
    balanced: entries.length === 4 && journals.every((journal) => journal.balanced),
  }
}

export function buildSandboxTransferRehearsal(
  stageTemplates: PaymentSandboxTransferStage[],
  ledgerTemplates: PaymentSandboxLedgerTemplate[],
  scenario: SandboxTransferScenario,
  sourceAmount: number,
  destinationAmount: number,
): SandboxTransferRehearsal {
  const expected = new Set(expectedStages)
  const applicableStages = stageTemplates
    .filter((stage) => expected.has(stage.stageKey))
    .sort((left, right) => left.priority - right.priority)
  const mappedStages = new Set(applicableStages.map((stage) => stage.stageKey))
  const complete = applicableStages.length === expectedStages.length
    && expectedStages.every((stage) => mappedStages.has(stage))
  const ledger = buildSandboxLedgerPreview(ledgerTemplates, sourceAmount, destinationAmount)

  if (!complete || !ledger.balanced) {
    return {
      decision: 'unavailable',
      stages: applicableStages.map((stage) => ({ ...stage, rehearsalState: 'not_reached' })),
      mappedStageCount: mappedStages.size,
      requiredStageCount: expectedStages.length,
      ledger,
      summary: 'Lifecycle or ledger evidence is incomplete. No outcome is available.',
    }
  }

  const decisions: Record<SandboxTransferScenario, Exclude<SandboxTransferDecision, 'unavailable'>> = {
    standard_delivery: 'rehearsal_complete',
    duplicate_retry: 'duplicate_suppressed',
    webhook_replay: 'webhook_rejected',
    reconciliation_exception: 'rescue_review',
    dispute_refund: 'refund_review',
  }
  const decision = decisions[scenario]

  const summaries: Record<Exclude<SandboxTransferDecision, 'unavailable'>, string> = {
    rehearsal_complete: 'Synthetic lifecycle complete. Nothing was submitted or posted.',
    duplicate_suppressed: 'Duplicate suppressed. No second transfer was created.',
    webhook_rejected: 'Webhook replay rejected before state or ledger changes.',
    rescue_review: 'Reconciliation exception held for review. No retry or action ran.',
    refund_review: 'Dispute and refund mapped for review. No case or refund was created.',
  }

  return {
    decision,
    stages: applicableStages.map((stage) => ({
      ...stage,
      rehearsalState: stateForScenario(scenario, stage.stageKey),
    })),
    mappedStageCount: mappedStages.size,
    requiredStageCount: expectedStages.length,
    ledger,
    summary: summaries[decision],
  }
}
