-- TradePulse AI
-- Migration 044: Phase 7E controlled money-movement readiness
-- This migration records sanitized, corridor-specific approval evidence only.
-- It cannot connect a production partner, fund an account, create a transfer,
-- post a ledger entry, settle, refund or move customer money.

create table public.payment_money_movement_controls (
  control_key text primary key check (control_key = 'controlled-money-movement'),
  readiness_workspace_enabled boolean not null default true check (readiness_workspace_enabled),
  public_sanitized_ledger_enabled boolean not null default true check (public_sanitized_ledger_enabled),
  evidence_collection_enabled boolean not null default true check (evidence_collection_enabled),
  activation_status text not null default 'blocked' check (activation_status = 'blocked'),
  manual_activation_review_required boolean not null default true check (manual_activation_review_required),
  real_customer_data_enabled boolean not null default false check (not real_customer_data_enabled),
  real_beneficiary_data_enabled boolean not null default false check (not real_beneficiary_data_enabled),
  production_partner_connectivity_enabled boolean not null default false check (not production_partner_connectivity_enabled),
  safeguarding_account_activation_enabled boolean not null default false check (not safeguarding_account_activation_enabled),
  customer_funding_enabled boolean not null default false check (not customer_funding_enabled),
  quote_acceptance_enabled boolean not null default false check (not quote_acceptance_enabled),
  transfer_creation_enabled boolean not null default false check (not transfer_creation_enabled),
  webhook_ingestion_enabled boolean not null default false check (not webhook_ingestion_enabled),
  financial_ledger_posting_enabled boolean not null default false check (not financial_ledger_posting_enabled),
  reconciliation_write_enabled boolean not null default false check (not reconciliation_write_enabled),
  rescue_operator_action_enabled boolean not null default false check (not rescue_operator_action_enabled),
  dispute_case_writes_enabled boolean not null default false check (not dispute_case_writes_enabled),
  refund_execution_enabled boolean not null default false check (not refund_execution_enabled),
  payment_execution_enabled boolean not null default false check (not payment_execution_enabled),
  money_movement_enabled boolean not null default false check (not money_movement_enabled),
  custody_enabled boolean not null default false check (not custody_enabled),
  settlement_enabled boolean not null default false check (not settlement_enabled),
  automatic_activation_enabled boolean not null default false check (not automatic_activation_enabled),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table public.payment_money_movement_requirements (
  id bigint generated always as identity primary key,
  requirement_code text not null unique check (requirement_code ~ '^[A-Z0-9-]{8,80}$'),
  corridor_id bigint not null references public.payment_corridors(id),
  requirement_key text not null check (requirement_key in (
    'legal_authorization', 'regulated_partner_agreement',
    'partner_production_certification', 'safeguarding_account_structure',
    'customer_funds_reconciliation', 'kyc_kyb_program',
    'aml_sanctions_monitoring', 'source_of_funds_controls',
    'security_privacy_review', 'treasury_liquidity_fx_controls',
    'operational_resilience', 'customer_protection_redress'
  )),
  domain text not null check (domain in (
    'legal', 'partner', 'safeguarding', 'compliance',
    'security', 'treasury', 'operations', 'customer_protection'
  )),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 10 and 500),
  evidence_expected text not null check (char_length(evidence_expected) between 10 and 420),
  responsible_owner text not null check (responsible_owner in (
    'legal_compliance', 'partner_management', 'financial_control',
    'financial_crime_operations', 'security_privacy', 'treasury',
    'payment_operations', 'customer_protection'
  )),
  evidence_required boolean not null default true check (evidence_required),
  activation_blocking boolean not null default true check (activation_blocking),
  display_order integer not null check (display_order between 1 and 200),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corridor_id, requirement_key),
  unique (corridor_id, display_order)
);

create table public.payment_money_movement_approval_evidence (
  id uuid primary key default gen_random_uuid(),
  evidence_sequence bigint generated always as identity unique,
  requirement_id bigint not null references public.payment_money_movement_requirements(id),
  evidence_version text not null check (evidence_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  decision text not null check (decision in ('approved', 'rejected', 'expired')),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  reviewer_fingerprint text not null check (reviewer_fingerprint ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (requirement_id, evidence_digest),
  check (decision <> 'approved' or valid_until is null or valid_until > reviewed_at)
);

create index payment_money_movement_requirements_corridor
  on public.payment_money_movement_requirements(corridor_id, display_order)
  where enabled;

create index payment_money_movement_evidence_requirement_sequence
  on public.payment_money_movement_approval_evidence(requirement_id, evidence_sequence desc);

alter table public.payment_money_movement_controls enable row level security;
alter table public.payment_money_movement_requirements enable row level security;
alter table public.payment_money_movement_approval_evidence enable row level security;

create policy "Public reads payment money movement locks"
  on public.payment_money_movement_controls for select to anon, authenticated
  using (true);

create policy "Public reads enabled money movement requirements"
  on public.payment_money_movement_requirements for select to anon, authenticated
  using (enabled);

create policy "Public reads sanitized money movement approval states"
  on public.payment_money_movement_approval_evidence for select to anon, authenticated
  using (true);

revoke all on public.payment_money_movement_controls from anon, authenticated, service_role;
revoke all on public.payment_money_movement_requirements from anon, authenticated, service_role;
revoke all on public.payment_money_movement_approval_evidence from anon, authenticated, service_role;

grant select on public.payment_money_movement_controls to anon, authenticated;
grant select on public.payment_money_movement_requirements to anon, authenticated;
grant select (
  evidence_sequence, requirement_id, decision, reviewed_at, valid_until, created_at
) on public.payment_money_movement_approval_evidence to anon, authenticated;

create trigger payment_money_movement_controls_set_updated_at
  before update on public.payment_money_movement_controls
  for each row execute function public.set_updated_at();

create trigger payment_money_movement_requirements_set_updated_at
  before update on public.payment_money_movement_requirements
  for each row execute function public.set_updated_at();

insert into public.payment_money_movement_controls (
  control_key, readiness_workspace_enabled, public_sanitized_ledger_enabled,
  evidence_collection_enabled, activation_status,
  manual_activation_review_required, real_customer_data_enabled,
  real_beneficiary_data_enabled, production_partner_connectivity_enabled,
  safeguarding_account_activation_enabled, customer_funding_enabled,
  quote_acceptance_enabled, transfer_creation_enabled, webhook_ingestion_enabled,
  financial_ledger_posting_enabled, reconciliation_write_enabled,
  rescue_operator_action_enabled, dispute_case_writes_enabled,
  refund_execution_enabled, payment_execution_enabled, money_movement_enabled,
  custody_enabled, settlement_enabled, automatic_activation_enabled,
  policy_version
) values (
  'controlled-money-movement', true, true,
  true, 'blocked',
  true, false,
  false, false,
  false, false,
  false, false, false,
  false, false,
  false, false,
  false, false, false,
  false, false, false,
  'controlled-money-movement-readiness-v1'
);

insert into public.payment_money_movement_requirements (
  requirement_code, corridor_id, requirement_key, domain, title, summary,
  evidence_expected, responsible_owner, display_order
)
select
  corridor.code || '-' || requirement.code_suffix,
  corridor.id,
  requirement.requirement_key,
  requirement.domain,
  requirement.title,
  requirement.summary,
  requirement.evidence_expected,
  requirement.responsible_owner,
  requirement.display_order
from public.payment_corridors corridor
cross join (
  values
    ('LEGAL', 'legal_authorization', 'legal', 'Corridor legal authorization',
     'Requires written analysis of licensing, permissions, customer eligibility and prohibited use for this exact source and destination corridor.',
     'Dated legal opinion, regulator or licensed-entity basis, scope, conditions, accountable approver and renewal date.',
     'legal_compliance', 10),
    ('PARTNER', 'regulated_partner_agreement', 'partner', 'Regulated partner agreement',
     'Requires an executed agreement with a licensed payment partner and an explicit allocation of regulated responsibilities.',
     'Executed agreement reference, licence verification, corridor scope, safeguarding responsibility, termination and audit rights.',
     'partner_management', 20),
    ('CERT', 'partner_production_certification', 'partner', 'Partner production certification',
     'Requires observed production certification for authentication, transfer states, webhooks, retries, limits and recovery behavior.',
     'Signed certification record, environment and credential controls, test cases, exceptions, owners and validity window.',
     'partner_management', 30),
    ('SAFEGUARD', 'safeguarding_account_structure', 'safeguarding', 'Safeguarding account structure',
     'Requires a reviewed customer-money segregation and safeguarding structure for the currencies and entities in this corridor.',
     'Bank or partner account structure, ownership, segregation, insolvency treatment, access controls and legal review.',
     'financial_control', 40),
    ('RECON', 'customer_funds_reconciliation', 'safeguarding', 'Customer-funds reconciliation',
     'Requires independent intraday and end-of-day reconciliation with aged-break handling and escalation thresholds.',
     'Source-to-ledger-to-partner reconciliation design, timing, tolerances, exception ownership and observed dry-run evidence.',
     'financial_control', 50),
    ('KYC', 'kyc_kyb_program', 'compliance', 'KYC and KYB operating approval',
     'Requires approved identity, business, beneficial-owner and customer due-diligence controls for the corridor population.',
     'Approved policy versions, provider due diligence, manual-review procedures, retention basis and quality evidence.',
     'financial_crime_operations', 60),
    ('AML', 'aml_sanctions_monitoring', 'compliance', 'AML, sanctions and monitoring approval',
     'Requires sanctions, PEP, adverse-media and transaction-monitoring controls calibrated for the exact corridor risk.',
     'Risk assessment, rule coverage, alert handling, escalation, reporting obligations, tuning and effectiveness evidence.',
     'financial_crime_operations', 70),
    ('SOF', 'source_of_funds_controls', 'compliance', 'Source-of-funds controls',
     'Requires account-ownership, source-of-funds, velocity, amount and suspicious-behavior controls before accepting customer value.',
     'Control design, limits, ownership checks, evidence standards, escalation paths and approved exception policy.',
     'financial_crime_operations', 80),
    ('SECURITY', 'security_privacy_review', 'security', 'Security and privacy approval',
     'Requires independent security, privacy, data-flow, access, encryption, retention and third-party risk approval.',
     'Threat model, privacy assessment, penetration evidence, access review, key controls, retention and remediation record.',
     'security_privacy', 90),
    ('TREASURY', 'treasury_liquidity_fx_controls', 'treasury', 'Treasury, liquidity and FX controls',
     'Requires approved prefunding, liquidity, FX exposure, rate source, fee, cut-off and limit controls for both currencies.',
     'Liquidity model, funding limits, rate governance, stress scenarios, counterparties, cut-offs and accountable treasury sign-off.',
     'treasury', 100),
    ('RESILIENCE', 'operational_resilience', 'operations', 'Operational resilience and recovery',
     'Requires staffed monitoring, dual control, incident response, reconciliation rescue, continuity and tested recovery for the corridor.',
     'Service map, telemetry, on-call rota, runbooks, recovery objectives, rollback and observed failure-drill evidence.',
     'payment_operations', 110),
    ('REDRESS', 'customer_protection_redress', 'customer_protection', 'Customer protection and redress',
     'Requires transparent fees and timing, scam intervention, complaints, disputes, refunds and vulnerable-customer handling.',
     'Approved disclosures, support coverage, response clocks, complaint and refund procedures, compensation basis and test evidence.',
     'customer_protection', 120)
) as requirement(
  code_suffix, requirement_key, domain, title, summary,
  evidence_expected, responsible_owner, display_order
)
where corridor.enabled;

create or replace function public.prevent_payment_money_movement_evidence_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Payment money-movement approval evidence is append-only';
end;
$$;

create trigger payment_money_movement_approval_evidence_append_only
  before update or delete on public.payment_money_movement_approval_evidence
  for each row execute function public.prevent_payment_money_movement_evidence_mutation();

create or replace function public.persist_payment_money_movement_approval_evidence(p_evidence jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  corridor_code_value text := p_evidence ->> 'corridorCode';
  requirement_key_value text := p_evidence ->> 'requirementKey';
  digest_value text := p_evidence ->> 'evidenceDigest';
  requirement_record public.payment_money_movement_requirements%rowtype;
  evidence_record public.payment_money_movement_approval_evidence%rowtype;
  existing_record public.payment_money_movement_approval_evidence%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the regulated payment-readiness evidence service';
  end if;

  select requirement.* into requirement_record
  from public.payment_money_movement_requirements requirement
  join public.payment_corridors corridor on corridor.id = requirement.corridor_id
  where corridor.code = corridor_code_value
    and corridor.enabled
    and requirement.requirement_key = requirement_key_value
    and requirement.enabled;

  if requirement_record.id is null then
    raise exception 'Unknown corridor money-movement requirement';
  end if;

  select * into existing_record
  from public.payment_money_movement_approval_evidence
  where requirement_id = requirement_record.id
    and evidence_digest = digest_value;

  if existing_record.id is not null then
    if existing_record.evidence_version is distinct from p_evidence ->> 'evidenceVersion'
      or existing_record.decision is distinct from p_evidence ->> 'decision'
      or existing_record.reviewer_fingerprint is distinct from p_evidence ->> 'reviewerFingerprint'
      or existing_record.reviewed_at is distinct from (p_evidence ->> 'reviewedAt')::timestamptz
      or existing_record.valid_until is distinct from nullif(p_evidence ->> 'validUntil', '')::timestamptz then
      raise exception 'Money-movement evidence digest was reused with different input';
    end if;
    return jsonb_build_object('evidence', to_jsonb(existing_record), 'idempotent', true);
  end if;

  insert into public.payment_money_movement_approval_evidence (
    requirement_id, evidence_version, decision, evidence_digest,
    reviewer_fingerprint, reviewed_at, valid_until
  ) values (
    requirement_record.id,
    p_evidence ->> 'evidenceVersion',
    p_evidence ->> 'decision',
    digest_value,
    p_evidence ->> 'reviewerFingerprint',
    (p_evidence ->> 'reviewedAt')::timestamptz,
    nullif(p_evidence ->> 'validUntil', '')::timestamptz
  ) returning * into evidence_record;

  insert into public.financial_audit_events (
    event_type, resource_type, resource_id, actor_type, correlation_id, details
  ) values (
    'payment_money_movement_approval_evidence_recorded',
    'payment_money_movement_requirement',
    corridor_code_value || ':' || requirement_key_value,
    'system',
    evidence_record.id::text,
    jsonb_build_object(
      'decision', evidence_record.decision,
      'evidenceVersion', evidence_record.evidence_version,
      'activationStatus', 'blocked',
      'moneyMovementEnabled', false
    )
  );

  return jsonb_build_object('evidence', to_jsonb(evidence_record), 'idempotent', false);
end;
$$;

revoke all on function public.persist_payment_money_movement_approval_evidence(jsonb) from public;
grant execute on function public.persist_payment_money_movement_approval_evidence(jsonb) to service_role;

do $$
begin
  if to_regclass('public.production_payment_transfers') is not null
    or to_regclass('public.payment_funding_accounts') is not null
    or to_regclass('public.payment_customer_balances') is not null
    or to_regclass('public.payment_financial_ledger_entries') is not null then
    raise exception 'Phase 7E cannot deploy while an operational payment or funding table exists';
  end if;
  if to_regprocedure('public.activate_payment_corridor(text)') is not null
    or to_regprocedure('public.create_production_payment_transfer(jsonb)') is not null
    or to_regprocedure('public.initiate_payment_funding(jsonb)') is not null
    or to_regprocedure('public.post_payment_ledger_entry(jsonb)') is not null then
    raise exception 'Phase 7E cannot deploy while an activation or money-movement RPC exists';
  end if;
  if exists (select 1 from public.payment_intents where status <> 'disabled') then
    raise exception 'Phase 7E cannot deploy while a payment intent is enabled';
  end if;
  if exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'Phase 7E cannot deploy with an accepted payment quote';
  end if;
  if exists (
    select 1 from public.payment_sandbox_transfer_controls
    where provider_sandbox_connectivity_enabled
      or production_provider_connectivity_enabled
      or financial_ledger_posting_enabled
      or payment_execution_enabled
      or money_movement_enabled
  ) then
    raise exception 'Phase 7E cannot deploy while a transfer execution lock is open';
  end if;
end;
$$;

create or replace view public.payment_money_movement_readiness_reference
with (security_invoker = true)
as
select
  requirement.id,
  requirement.requirement_code,
  corridor.id as corridor_id,
  corridor.code as corridor_code,
  corridor.source_currency,
  corridor.destination_currency,
  requirement.requirement_key,
  requirement.domain,
  requirement.title,
  requirement.summary,
  requirement.evidence_expected,
  requirement.responsible_owner,
  requirement.activation_blocking,
  requirement.display_order,
  case
    when evidence.decision = 'approved'
      and evidence.valid_until is not null
      and evidence.valid_until <= now() then 'expired'
    else coalesce(evidence.decision, 'missing')
  end as evidence_status,
  evidence.reviewed_at,
  evidence.valid_until,
  coalesce(
    evidence.decision = 'approved'
      and (evidence.valid_until is null or evidence.valid_until > now()),
    false
  ) as approval_current,
  control.activation_status,
  true as manual_activation_review_required,
  false as real_customer_data_enabled,
  false as real_beneficiary_data_enabled,
  false as production_partner_connectivity_enabled,
  false as safeguarding_account_activation_enabled,
  false as customer_funding_enabled,
  false as quote_acceptance_enabled,
  false as transfer_creation_enabled,
  false as webhook_ingestion_enabled,
  false as financial_ledger_posting_enabled,
  false as reconciliation_write_enabled,
  false as rescue_operator_action_enabled,
  false as dispute_case_writes_enabled,
  false as refund_execution_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled,
  false as custody_enabled,
  false as settlement_enabled,
  false as automatic_activation_enabled
from public.payment_money_movement_requirements requirement
join public.payment_corridors corridor on corridor.id = requirement.corridor_id
cross join public.payment_money_movement_controls control
left join lateral (
  select decision, reviewed_at, valid_until
  from public.payment_money_movement_approval_evidence
  where requirement_id = requirement.id
  order by evidence_sequence desc
  limit 1
) evidence on true
where requirement.enabled
  and corridor.enabled
  and control.control_key = 'controlled-money-movement'
  and control.readiness_workspace_enabled;

grant select on public.payment_money_movement_readiness_reference to anon, authenticated;

create or replace view public.payment_money_movement_readiness_summary
with (security_invoker = true)
as
select
  reference.corridor_id,
  reference.corridor_code,
  reference.source_currency,
  reference.destination_currency,
  count(*)::integer as requirement_count,
  count(*) filter (where reference.approval_current)::integer as current_approval_count,
  count(*) filter (where not reference.approval_current)::integer as blocking_gap_count,
  'blocked'::text as activation_status,
  true as manual_activation_review_required,
  false as production_partner_connectivity_enabled,
  false as safeguarding_account_activation_enabled,
  false as customer_funding_enabled,
  false as transfer_creation_enabled,
  false as financial_ledger_posting_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled,
  false as custody_enabled,
  false as settlement_enabled,
  false as automatic_activation_enabled
from public.payment_money_movement_readiness_reference reference
group by
  reference.corridor_id, reference.corridor_code,
  reference.source_currency, reference.destination_currency;

grant select on public.payment_money_movement_readiness_summary to anon, authenticated;

comment on table public.payment_money_movement_controls is
  'Phase 7E hard locks. Approval evidence cannot activate a partner, funding, transfer, ledger, settlement or money-movement path.';
comment on table public.payment_money_movement_requirements is
  'Corridor-specific legal, partner, safeguarding, compliance, security, treasury, operations and customer-protection approval requirements.';
comment on table public.payment_money_movement_approval_evidence is
  'Append-only sanitized approval decisions. Raw documents, reviewer identities, customer data and partner credentials are not stored.';
comment on view public.payment_money_movement_readiness_reference is
  'Public sanitized corridor-readiness ledger. Every operational capability remains false even when all evidence is current.';
comment on view public.payment_money_movement_readiness_summary is
  'Public corridor-level approval counts with activation permanently blocked in Phase 7E.';
