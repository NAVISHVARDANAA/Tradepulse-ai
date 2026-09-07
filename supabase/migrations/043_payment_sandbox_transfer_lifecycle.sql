-- TradePulse AI
-- Migration 043: Phase 7D payment sandbox transfer lifecycle
-- This migration publishes synthetic lifecycle and double-entry templates only.
-- It creates no transfer, webhook, financial ledger, dispute or refund write path.

create table public.payment_sandbox_transfer_controls (
  control_key text primary key check (control_key = 'payment-sandbox-transfer-lifecycle'),
  workspace_enabled boolean not null default true check (workspace_enabled),
  synthetic_transfer_rehearsal_enabled boolean not null default true check (synthetic_transfer_rehearsal_enabled),
  data_mode text not null default 'synthetic_transfer_rehearsal' check (data_mode = 'synthetic_transfer_rehearsal'),
  licensed_partner_sandbox_reference_enabled boolean not null default true check (licensed_partner_sandbox_reference_enabled),
  double_entry_preview_enabled boolean not null default true check (double_entry_preview_enabled),
  idempotency_rehearsal_enabled boolean not null default true check (idempotency_rehearsal_enabled),
  signed_webhook_rehearsal_enabled boolean not null default true check (signed_webhook_rehearsal_enabled),
  bounded_retry_rehearsal_enabled boolean not null default true check (bounded_retry_rehearsal_enabled),
  reconciliation_rehearsal_enabled boolean not null default true check (reconciliation_rehearsal_enabled),
  rescue_mode_rehearsal_enabled boolean not null default true check (rescue_mode_rehearsal_enabled),
  dispute_rehearsal_enabled boolean not null default true check (dispute_rehearsal_enabled),
  refund_rehearsal_enabled boolean not null default true check (refund_rehearsal_enabled),
  real_customer_data_enabled boolean not null default false check (not real_customer_data_enabled),
  real_beneficiary_data_enabled boolean not null default false check (not real_beneficiary_data_enabled),
  provider_sandbox_connectivity_enabled boolean not null default false check (not provider_sandbox_connectivity_enabled),
  browser_transfer_creation_enabled boolean not null default false check (not browser_transfer_creation_enabled),
  service_transfer_creation_enabled boolean not null default false check (not service_transfer_creation_enabled),
  webhook_ingestion_enabled boolean not null default false check (not webhook_ingestion_enabled),
  financial_ledger_posting_enabled boolean not null default false check (not financial_ledger_posting_enabled),
  retry_execution_enabled boolean not null default false check (not retry_execution_enabled),
  reconciliation_write_enabled boolean not null default false check (not reconciliation_write_enabled),
  rescue_operator_action_enabled boolean not null default false check (not rescue_operator_action_enabled),
  dispute_case_writes_enabled boolean not null default false check (not dispute_case_writes_enabled),
  refund_execution_enabled boolean not null default false check (not refund_execution_enabled),
  production_provider_connectivity_enabled boolean not null default false check (not production_provider_connectivity_enabled),
  quote_acceptance_enabled boolean not null default false check (not quote_acceptance_enabled),
  payment_execution_enabled boolean not null default false check (not payment_execution_enabled),
  money_movement_enabled boolean not null default false check (not money_movement_enabled),
  customer_funding_enabled boolean not null default false check (not customer_funding_enabled),
  custody_enabled boolean not null default false check (not custody_enabled),
  settlement_enabled boolean not null default false check (not settlement_enabled),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table public.payment_sandbox_transfer_stage_templates (
  id bigint generated always as identity primary key,
  stage_code text not null unique check (stage_code ~ '^[A-Z0-9-]{8,72}$'),
  corridor_id bigint not null references public.payment_corridors(id),
  stage_key text not null check (stage_key in (
    'idempotency', 'sandbox_submission', 'webhook_verification',
    'double_entry_ledger', 'retry_policy', 'reconciliation',
    'rescue_mode', 'dispute', 'refund'
  )),
  title text not null check (char_length(title) between 3 and 110),
  description text not null check (char_length(description) between 10 and 360),
  evidence_required text not null check (char_length(evidence_required) between 10 and 320),
  safe_response text not null check (char_length(safe_response) between 10 and 300),
  responsible_owner text not null check (responsible_owner in (
    'payment_operations', 'platform_reliability', 'financial_control', 'customer_protection'
  )),
  rehearsal_outcome text not null check (rehearsal_outcome in (
    'deduplicated', 'acknowledged', 'signature_verified', 'balanced', 'bounded',
    'matched', 'standby', 'review_ready'
  )),
  priority integer not null check (priority between 1 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corridor_id, stage_key)
);

create table public.payment_sandbox_ledger_templates (
  id bigint generated always as identity primary key,
  posting_code text not null unique check (posting_code ~ '^[A-Z0-9-]{8,80}$'),
  corridor_id bigint not null references public.payment_corridors(id),
  journal_key text not null check (journal_key in ('source_funding', 'destination_obligation')),
  currency_role text not null check (currency_role in ('source', 'destination')),
  account_code text not null check (account_code in (
    'sandbox_cash_control', 'sandbox_transfer_liability',
    'sandbox_fx_bridge_control', 'sandbox_payout_payable'
  )),
  entry_side text not null check (entry_side in ('debit', 'credit')),
  amount_basis text not null check (amount_basis in ('source_amount', 'destination_before_tax')),
  narrative text not null check (char_length(narrative) between 10 and 240),
  priority integer not null check (priority between 1 and 20),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (corridor_id, journal_key, account_code)
);

create index payment_sandbox_transfer_stages_corridor
  on public.payment_sandbox_transfer_stage_templates(corridor_id, priority)
  where enabled;

create index payment_sandbox_ledger_corridor
  on public.payment_sandbox_ledger_templates(corridor_id, journal_key, priority)
  where enabled;

alter table public.payment_sandbox_transfer_controls enable row level security;
alter table public.payment_sandbox_transfer_stage_templates enable row level security;
alter table public.payment_sandbox_ledger_templates enable row level security;

create policy "Public reads payment sandbox transfer locks"
  on public.payment_sandbox_transfer_controls for select to anon, authenticated
  using (true);

create policy "Public reads enabled sandbox transfer stages"
  on public.payment_sandbox_transfer_stage_templates for select to anon, authenticated
  using (enabled);

create policy "Public reads enabled sandbox ledger templates"
  on public.payment_sandbox_ledger_templates for select to anon, authenticated
  using (enabled);

revoke all on public.payment_sandbox_transfer_controls from anon, authenticated, service_role;
revoke all on public.payment_sandbox_transfer_stage_templates from anon, authenticated, service_role;
revoke all on public.payment_sandbox_ledger_templates from anon, authenticated, service_role;
grant select on public.payment_sandbox_transfer_controls to anon, authenticated;
grant select on public.payment_sandbox_transfer_stage_templates to anon, authenticated;
grant select on public.payment_sandbox_ledger_templates to anon, authenticated;

create trigger payment_sandbox_transfer_controls_set_updated_at
  before update on public.payment_sandbox_transfer_controls
  for each row execute function public.set_updated_at();

create trigger payment_sandbox_transfer_stages_set_updated_at
  before update on public.payment_sandbox_transfer_stage_templates
  for each row execute function public.set_updated_at();

insert into public.payment_sandbox_transfer_controls (
  control_key, workspace_enabled, synthetic_transfer_rehearsal_enabled, data_mode,
  licensed_partner_sandbox_reference_enabled, double_entry_preview_enabled,
  idempotency_rehearsal_enabled, signed_webhook_rehearsal_enabled,
  bounded_retry_rehearsal_enabled, reconciliation_rehearsal_enabled,
  rescue_mode_rehearsal_enabled, dispute_rehearsal_enabled, refund_rehearsal_enabled,
  real_customer_data_enabled, real_beneficiary_data_enabled,
  provider_sandbox_connectivity_enabled, browser_transfer_creation_enabled,
  service_transfer_creation_enabled, webhook_ingestion_enabled,
  financial_ledger_posting_enabled, retry_execution_enabled,
  reconciliation_write_enabled, rescue_operator_action_enabled,
  dispute_case_writes_enabled, refund_execution_enabled,
  production_provider_connectivity_enabled, quote_acceptance_enabled,
  payment_execution_enabled, money_movement_enabled, customer_funding_enabled,
  custody_enabled, settlement_enabled, policy_version
) values (
  'payment-sandbox-transfer-lifecycle', true, true, 'synthetic_transfer_rehearsal',
  true, true,
  true, true,
  true, true,
  true, true, true,
  false, false,
  false, false,
  false, false,
  false, false,
  false, false,
  false, false,
  false, false,
  false, false, false,
  false, false, 'payment-sandbox-transfer-lifecycle-v1'
);

insert into public.payment_sandbox_transfer_stage_templates (
  stage_code, corridor_id, stage_key, title, description, evidence_required,
  safe_response, responsible_owner, rehearsal_outcome, priority
)
select
  corridor.code || '-' || stage.code_suffix,
  corridor.id,
  stage.stage_key,
  stage.title,
  stage.description,
  stage.evidence_required,
  stage.safe_response,
  stage.responsible_owner,
  stage.rehearsal_outcome,
  stage.priority
from public.payment_corridors corridor
cross join (
  values
    ('IDEMP', 'idempotency', 'Idempotency and duplicate suppression',
     'Models how a request key and payload digest prevent duplicate sandbox transfer submission after a timeout or customer retry.',
     'Synthetic request key, payload digest, first-seen timestamp and deterministic replay outcome.',
     'Treat every duplicate as the original rehearsal result; never create a second transfer.',
     'platform_reliability', 'deduplicated', 10),
    ('SUBMIT', 'sandbox_submission', 'Licensed-partner sandbox hand-off',
     'Maps the request schema, acknowledgement and timeout boundary expected for a future licensed-partner sandbox adapter.',
     'Synthetic adapter request, acknowledgement class and timeout classification with no endpoint or credential.',
     'Keep the hand-off disabled until a licensed partner, credentials and operating approval exist.',
     'payment_operations', 'acknowledged', 20),
    ('WEBHOOK', 'webhook_verification', 'Signed webhook verification',
     'Models signature, timestamp, event identifier and replay-window checks before a sandbox status event could be trusted.',
     'Synthetic signature verdict, timestamp age, event digest and replay-detection result.',
     'Reject stale, invalid or replayed events and preserve the last trusted synthetic state.',
     'platform_reliability', 'signature_verified', 30),
    ('LEDGER', 'double_entry_ledger', 'Currency-separated double-entry journals',
     'Maps balanced source-funding and destination-obligation journals without treating FX conversion as one mixed-currency balance.',
     'Debit and credit templates, currency role, amount basis and per-journal balance proof.',
     'Review the synthetic journals only; no financial ledger entry can be posted in this phase.',
     'financial_control', 'balanced', 40),
    ('RETRY', 'retry_policy', 'Bounded retry and ambiguity policy',
     'Models attempt ceilings, exponential backoff, jitter and read-before-retry handling for ambiguous sandbox outcomes.',
     'Synthetic attempt count, next delay, ambiguity reason and terminal retry classification.',
     'Stop at the configured ceiling and move ambiguous results to reconciliation instead of repeating a write.',
     'platform_reliability', 'bounded', 50),
    ('RECON', 'reconciliation', 'Provider and ledger reconciliation',
     'Maps transfer state, amount, currency and journal evidence comparison against a future partner sandbox response.',
     'Synthetic provider-state digest, ledger digest, mismatch count and freshness evidence.',
     'Place any mismatch into a non-operational hold and require financial-control review.',
     'financial_control', 'matched', 60),
    ('RESCUE', 'rescue_mode', 'Rescue-mode hold and recovery',
     'Models a fail-closed operating mode for partner outages, uncertain state, ledger imbalance or reconciliation exceptions.',
     'Synthetic trigger, affected stage, hold reason, owner and recovery checklist.',
     'Keep the rehearsal held until every recovery check is complete; no operator action is available here.',
     'payment_operations', 'standby', 70),
    ('DISPUTE', 'dispute', 'Dispute evidence and customer protection',
     'Maps acknowledgement, reason classification, evidence preservation, ownership and response timing for a sandbox dispute.',
     'Synthetic dispute reason, evidence checklist, response clock and responsible owner.',
     'Show the support path without opening a real dispute or collecting customer evidence.',
     'customer_protection', 'review_ready', 80),
    ('REFUND', 'refund', 'Refund and balanced reversal plan',
     'Maps eligibility, original-journal reference, approval separation and balanced reversal evidence for a sandbox refund.',
     'Synthetic eligibility result, original posting references and reversal-journal checklist.',
     'Explain the illustrative outcome only; no refund, credit, payout or money movement can occur.',
     'financial_control', 'review_ready', 90)
) as stage(
  code_suffix, stage_key, title, description, evidence_required,
  safe_response, responsible_owner, rehearsal_outcome, priority
)
where corridor.enabled;

insert into public.payment_sandbox_ledger_templates (
  posting_code, corridor_id, journal_key, currency_role, account_code,
  entry_side, amount_basis, narrative, priority
)
select
  corridor.code || '-' || posting.code_suffix,
  corridor.id,
  posting.journal_key,
  posting.currency_role,
  posting.account_code,
  posting.entry_side,
  posting.amount_basis,
  posting.narrative,
  posting.priority
from public.payment_corridors corridor
cross join (
  values
    ('SRC-DR', 'source_funding', 'source', 'sandbox_cash_control', 'debit', 'source_amount',
     'Illustrative receipt into a sandbox cash-control account.', 10),
    ('SRC-CR', 'source_funding', 'source', 'sandbox_transfer_liability', 'credit', 'source_amount',
     'Illustrative recognition of the matching sandbox transfer liability.', 20),
    ('DST-DR', 'destination_obligation', 'destination', 'sandbox_fx_bridge_control', 'debit', 'destination_before_tax',
     'Illustrative destination-currency debit to the sandbox FX bridge control.', 10),
    ('DST-CR', 'destination_obligation', 'destination', 'sandbox_payout_payable', 'credit', 'destination_before_tax',
     'Illustrative destination-currency credit to the sandbox payout payable.', 20)
) as posting(
  code_suffix, journal_key, currency_role, account_code, entry_side,
  amount_basis, narrative, priority
)
where corridor.enabled;

do $$
begin
  if to_regclass('public.payment_sandbox_transfers') is not null
    or to_regclass('public.payment_sandbox_webhook_events') is not null
    or to_regclass('public.payment_sandbox_ledger_entries') is not null
    or to_regclass('public.payment_sandbox_disputes') is not null
    or to_regclass('public.payment_sandbox_refunds') is not null then
    raise exception 'Phase 7D cannot deploy while an operational payment sandbox write table exists';
  end if;
  if to_regprocedure('public.create_payment_sandbox_transfer(jsonb)') is not null
    or to_regprocedure('public.ingest_payment_sandbox_webhook(jsonb)') is not null
    or to_regprocedure('public.execute_payment_sandbox_refund(jsonb)') is not null then
    raise exception 'Phase 7D cannot deploy while a transfer, webhook or refund RPC exists';
  end if;
  if exists (select 1 from public.payment_intents where status <> 'disabled') then
    raise exception 'Phase 7D cannot deploy while a payment intent is enabled';
  end if;
  if exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'Phase 7D cannot deploy with an accepted payment quote';
  end if;
end;
$$;

create or replace view public.payment_sandbox_transfer_lifecycle_reference
with (security_invoker = true)
as
select
  stage.id,
  stage.stage_code,
  corridor.id as corridor_id,
  corridor.code as corridor_code,
  corridor.source_currency,
  corridor.destination_currency,
  stage.stage_key,
  stage.title,
  stage.description,
  stage.evidence_required,
  stage.safe_response,
  stage.responsible_owner,
  stage.rehearsal_outcome,
  stage.priority,
  control.data_mode,
  control.licensed_partner_sandbox_reference_enabled,
  control.double_entry_preview_enabled,
  false as real_customer_data_enabled,
  false as real_beneficiary_data_enabled,
  false as provider_sandbox_connectivity_enabled,
  false as browser_transfer_creation_enabled,
  false as service_transfer_creation_enabled,
  false as webhook_ingestion_enabled,
  false as financial_ledger_posting_enabled,
  false as retry_execution_enabled,
  false as reconciliation_write_enabled,
  false as rescue_operator_action_enabled,
  false as dispute_case_writes_enabled,
  false as refund_execution_enabled,
  false as production_provider_connectivity_enabled,
  false as quote_acceptance_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled,
  false as customer_funding_enabled,
  false as custody_enabled,
  false as settlement_enabled
from public.payment_sandbox_transfer_stage_templates stage
join public.payment_corridors corridor on corridor.id = stage.corridor_id
cross join public.payment_sandbox_transfer_controls control
where stage.enabled
  and corridor.enabled
  and control.control_key = 'payment-sandbox-transfer-lifecycle'
  and control.workspace_enabled
  and control.synthetic_transfer_rehearsal_enabled;

create or replace view public.payment_sandbox_ledger_reference
with (security_invoker = true)
as
select
  posting.id,
  posting.posting_code,
  corridor.id as corridor_id,
  corridor.code as corridor_code,
  corridor.source_currency,
  corridor.destination_currency,
  posting.journal_key,
  posting.currency_role,
  posting.account_code,
  posting.entry_side,
  posting.amount_basis,
  posting.narrative,
  posting.priority,
  control.data_mode,
  control.double_entry_preview_enabled,
  false as financial_ledger_posting_enabled,
  false as refund_execution_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled
from public.payment_sandbox_ledger_templates posting
join public.payment_corridors corridor on corridor.id = posting.corridor_id
cross join public.payment_sandbox_transfer_controls control
where posting.enabled
  and corridor.enabled
  and control.control_key = 'payment-sandbox-transfer-lifecycle'
  and control.workspace_enabled
  and control.synthetic_transfer_rehearsal_enabled;

grant select on public.payment_sandbox_transfer_lifecycle_reference to anon, authenticated;
grant select on public.payment_sandbox_ledger_reference to anon, authenticated;

comment on table public.payment_sandbox_transfer_controls is
  'Phase 7D hard locks: synthetic lifecycle rehearsal only, with no provider call, transfer write, webhook ingestion, ledger posting, dispute, refund or money movement.';
comment on table public.payment_sandbox_transfer_stage_templates is
  'Public synthetic idempotency, sandbox hand-off, webhook, ledger, retry, reconciliation, rescue, dispute and refund templates by corridor.';
comment on table public.payment_sandbox_ledger_templates is
  'Currency-separated debit and credit templates for a non-posting double-entry preview.';
comment on view public.payment_sandbox_transfer_lifecycle_reference is
  'Sanitized Phase 7D transfer-lifecycle map with explicit non-operational controls.';
comment on view public.payment_sandbox_ledger_reference is
  'Sanitized Phase 7D ledger template with no customer, provider or financial ledger data.';
