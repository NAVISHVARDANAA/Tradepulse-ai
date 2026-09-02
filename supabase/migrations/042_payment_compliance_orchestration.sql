-- TradePulse AI
-- Migration 042: Phase 7C payment compliance orchestration
-- This migration publishes synthetic corridor requirements only. It creates no
-- identity record, compliance case, provider connection, clearance or payment path.

create table public.payment_compliance_orchestration_controls (
  control_key text primary key check (control_key = 'payment-compliance-orchestration'),
  workspace_enabled boolean not null default true check (workspace_enabled),
  synthetic_case_rehearsal_enabled boolean not null default true check (synthetic_case_rehearsal_enabled),
  data_mode text not null default 'synthetic_case_rehearsal' check (data_mode = 'synthetic_case_rehearsal'),
  real_identity_collection_enabled boolean not null default false check (not real_identity_collection_enabled),
  document_upload_enabled boolean not null default false check (not document_upload_enabled),
  pii_storage_enabled boolean not null default false check (not pii_storage_enabled),
  compliance_provider_connectivity_enabled boolean not null default false check (not compliance_provider_connectivity_enabled),
  live_sanctions_screening_enabled boolean not null default false check (not live_sanctions_screening_enabled),
  transaction_monitoring_connectivity_enabled boolean not null default false check (not transaction_monitoring_connectivity_enabled),
  travel_rule_transmission_enabled boolean not null default false check (not travel_rule_transmission_enabled),
  compliance_case_writes_enabled boolean not null default false check (not compliance_case_writes_enabled),
  automated_clearance_enabled boolean not null default false check (not automated_clearance_enabled),
  manual_override_enabled boolean not null default false check (not manual_override_enabled),
  quote_acceptance_enabled boolean not null default false check (not quote_acceptance_enabled),
  transfer_creation_enabled boolean not null default false check (not transfer_creation_enabled),
  payment_execution_enabled boolean not null default false check (not payment_execution_enabled),
  money_movement_enabled boolean not null default false check (not money_movement_enabled),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table public.payment_compliance_workflow_requirements (
  id bigint generated always as identity primary key,
  workflow_code text not null unique check (workflow_code ~ '^[A-Z0-9-]{8,64}$'),
  corridor_id bigint not null references public.payment_corridors(id),
  customer_type text not null check (customer_type in ('individual', 'business', 'both')),
  stage_key text not null check (stage_key in ('kyc', 'kyb', 'aml', 'sanctions', 'transaction_monitoring', 'travel_rule', 'audit')),
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 320),
  evidence_required text not null check (char_length(evidence_required) between 10 and 320),
  customer_action text not null check (char_length(customer_action) between 10 and 280),
  review_owner text not null check (review_owner in ('identity_operations', 'financial_crime_operations', 'sanctions_operations', 'transaction_monitoring_operations', 'travel_rule_operations', 'compliance_assurance')),
  outcome text not null check (outcome in ('review_required', 'blocked')),
  priority integer not null check (priority between 1 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corridor_id, customer_type, stage_key)
);

create index payment_compliance_requirements_corridor
  on public.payment_compliance_workflow_requirements(corridor_id, priority)
  where enabled;

alter table public.payment_compliance_orchestration_controls enable row level security;
alter table public.payment_compliance_workflow_requirements enable row level security;

create policy "Public reads payment compliance locks"
  on public.payment_compliance_orchestration_controls for select to anon, authenticated
  using (true);

create policy "Public reads enabled synthetic compliance requirements"
  on public.payment_compliance_workflow_requirements for select to anon, authenticated
  using (enabled);

revoke all on public.payment_compliance_orchestration_controls from anon, authenticated, service_role;
revoke all on public.payment_compliance_workflow_requirements from anon, authenticated, service_role;
grant select on public.payment_compliance_orchestration_controls to anon, authenticated;
grant select on public.payment_compliance_workflow_requirements to anon, authenticated;

create trigger payment_compliance_orchestration_controls_set_updated_at
  before update on public.payment_compliance_orchestration_controls
  for each row execute function public.set_updated_at();

create trigger payment_compliance_workflow_requirements_set_updated_at
  before update on public.payment_compliance_workflow_requirements
  for each row execute function public.set_updated_at();

insert into public.payment_compliance_orchestration_controls (
  control_key, workspace_enabled, synthetic_case_rehearsal_enabled, data_mode,
  real_identity_collection_enabled, document_upload_enabled, pii_storage_enabled,
  compliance_provider_connectivity_enabled, live_sanctions_screening_enabled,
  transaction_monitoring_connectivity_enabled, travel_rule_transmission_enabled,
  compliance_case_writes_enabled, automated_clearance_enabled,
  manual_override_enabled, quote_acceptance_enabled, transfer_creation_enabled,
  payment_execution_enabled, money_movement_enabled, policy_version
) values (
  'payment-compliance-orchestration', true, true, 'synthetic_case_rehearsal',
  false, false, false,
  false, false,
  false, false,
  false, false,
  false, false, false,
  false, false, 'payment-compliance-orchestration-v1'
);

insert into public.payment_compliance_workflow_requirements (
  workflow_code, corridor_id, customer_type, stage_key, title, description,
  evidence_required, customer_action, review_owner, outcome, priority
)
select
  corridor.code || '-' || stage.code_suffix,
  corridor.id,
  stage.customer_type,
  stage.stage_key,
  stage.title,
  stage.description,
  stage.evidence_required,
  stage.customer_action,
  stage.review_owner,
  stage.outcome,
  stage.priority
from public.payment_corridors corridor
cross join (
  values
    ('KYC', 'individual', 'kyc', 'Individual identity and residency',
     'Rehearses the identity, age, residency and source-of-funds evidence expected for an individual sender.',
     'Synthetic identity, residency and source-of-funds evidence with no document or personal-data upload.',
     'Review the illustrative requirements; do not enter names, identifiers, addresses or documents.',
     'identity_operations', 'review_required', 10),
    ('KYB', 'business', 'kyb', 'Business identity and controllers',
     'Rehearses entity registration, ownership, controller and business-purpose evidence for a business sender.',
     'Synthetic registration, ownership and controller evidence with no company or person identifiers.',
     'Review the illustrative business requirements; do not enter company, controller or document data.',
     'identity_operations', 'review_required', 10),
    ('AML', 'both', 'aml', 'AML risk assessment',
     'Maps the illustrative customer, corridor, purpose, source-of-funds and expected-activity risk review.',
     'Synthetic risk factors and review rationale without customer, beneficiary or transaction records.',
     'Treat the stage as unresolved until a licensed compliance operation performs the real assessment.',
     'financial_crime_operations', 'review_required', 20),
    ('SANCTIONS', 'both', 'sanctions', 'Sanctions and watchlist screening',
     'Maps sender, beneficiary, ownership and geography screening expected before a corridor could be used.',
     'Synthetic screening evidence only; no live watchlist provider response or identity is processed.',
     'Stop the rehearsal at this gate because live screening and match resolution are unavailable.',
     'sanctions_operations', 'blocked', 30),
    ('TXMON', 'both', 'transaction_monitoring', 'Transaction-monitoring controls',
     'Maps velocity, amount, behavior, device and corridor risk signals expected around a payment lifecycle.',
     'Synthetic monitoring signals and escalation paths with no customer transaction surveillance.',
     'Review the illustrative escalation path; no monitoring decision can be produced in this phase.',
     'transaction_monitoring_operations', 'review_required', 40),
    ('TRAVELRULE', 'both', 'travel_rule', 'Travel-rule applicability',
     'Maps applicability, required data fields, counterparty capability and transmission safeguards by corridor.',
     'Synthetic applicability evidence only; no originator or beneficiary information is transmitted.',
     'Stop the rehearsal because counterparty validation and protected data transmission are unavailable.',
     'travel_rule_operations', 'blocked', 50),
    ('AUDIT', 'both', 'audit', 'Audit evidence and decision trace',
     'Maps the policy version, reviewer role, evidence lineage, decision reason and retention proof expected for audit.',
     'Synthetic evidence checklist only; no real compliance case or customer audit event is written.',
     'Use this map for readiness review only; preserve no customer or case evidence in the browser.',
     'compliance_assurance', 'review_required', 60)
) as stage(
  code_suffix, customer_type, stage_key, title, description, evidence_required,
  customer_action, review_owner, outcome, priority
)
where corridor.enabled;

do $$
begin
  if to_regclass('public.payment_compliance_cases') is not null
    or to_regclass('public.payment_identity_documents') is not null then
    raise exception 'Phase 7C cannot deploy while compliance-case or identity-document storage exists';
  end if;
  if to_regprocedure('public.clear_payment_compliance(jsonb)') is not null
    or to_regprocedure('public.create_payment_compliance_case(jsonb)') is not null then
    raise exception 'Phase 7C cannot deploy while a compliance clearance or case RPC exists';
  end if;
  if exists (select 1 from public.payment_intents where status <> 'disabled') then
    raise exception 'Phase 7C cannot deploy while a payment intent is enabled';
  end if;
  if exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'Phase 7C cannot deploy with an accepted payment quote';
  end if;
end;
$$;

create or replace view public.payment_compliance_orchestration_reference
with (security_invoker = true)
as
select
  requirement.id,
  requirement.workflow_code,
  corridor.id as corridor_id,
  corridor.code as corridor_code,
  corridor.source_currency,
  corridor.destination_currency,
  requirement.customer_type,
  requirement.stage_key,
  requirement.title,
  requirement.description,
  requirement.evidence_required,
  requirement.customer_action,
  requirement.review_owner,
  requirement.outcome,
  requirement.priority,
  control.data_mode,
  false as real_identity_collection_enabled,
  false as document_upload_enabled,
  false as pii_storage_enabled,
  false as compliance_provider_connectivity_enabled,
  false as live_sanctions_screening_enabled,
  false as transaction_monitoring_connectivity_enabled,
  false as travel_rule_transmission_enabled,
  false as compliance_case_writes_enabled,
  false as automated_clearance_enabled,
  false as manual_override_enabled,
  false as quote_acceptance_enabled,
  false as transfer_creation_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled
from public.payment_compliance_workflow_requirements requirement
join public.payment_corridors corridor on corridor.id = requirement.corridor_id
cross join public.payment_compliance_orchestration_controls control
where requirement.enabled
  and corridor.enabled
  and control.control_key = 'payment-compliance-orchestration'
  and control.workspace_enabled
  and control.synthetic_case_rehearsal_enabled;

grant select on public.payment_compliance_orchestration_reference to anon, authenticated;

comment on table public.payment_compliance_orchestration_controls is
  'Phase 7C hard locks: synthetic corridor maps only, with no identity collection, provider screening, case writes, clearance or payment execution.';
comment on table public.payment_compliance_workflow_requirements is
  'Public synthetic KYC, KYB, AML, sanctions, transaction-monitoring, travel-rule and audit requirement templates by corridor.';
comment on view public.payment_compliance_orchestration_reference is
  'Sanitized Phase 7C corridor compliance map with explicit non-operational controls and no customer or case data.';
