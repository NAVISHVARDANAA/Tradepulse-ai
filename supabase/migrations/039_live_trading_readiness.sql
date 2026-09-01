-- TradePulse AI
-- Migration 039: Controlled live-trading readiness foundation
-- This migration records and summarizes activation evidence. It cannot submit,
-- route, fund, custody or settle an order and cannot activate a kill switch.

create table public.live_trading_activation_controls (
  control_key text primary key check (control_key = 'controlled-live-trading'),
  readiness_review_enabled boolean not null default true,
  evidence_collection_enabled boolean not null default true,
  activation_status text not null default 'blocked' check (activation_status = 'blocked'),
  live_order_routing_enabled boolean not null default false check (not live_order_routing_enabled),
  browser_order_submission_enabled boolean not null default false check (not browser_order_submission_enabled),
  automatic_activation_enabled boolean not null default false check (not automatic_activation_enabled),
  customer_funding_enabled boolean not null default false check (not customer_funding_enabled),
  custody_enabled boolean not null default false check (not custody_enabled),
  settlement_enabled boolean not null default false check (not settlement_enabled),
  short_selling_enabled boolean not null default false check (not short_selling_enabled),
  margin_enabled boolean not null default false check (not margin_enabled),
  kill_switch_activation_enabled boolean not null default false check (not kill_switch_activation_enabled),
  manual_activation_review_required boolean not null default true check (manual_activation_review_required),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table public.live_trading_activation_requirements (
  requirement_key text primary key check (requirement_key ~ '^[a-z][a-z0-9_]{2,63}$'),
  domain text not null check (domain in (
    'jurisdiction', 'broker', 'compliance', 'money', 'market_data',
    'risk', 'operations', 'customer'
  )),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 10 and 500),
  evidence_required boolean not null default true check (evidence_required),
  activation_blocking boolean not null default true check (activation_blocking),
  display_order integer not null unique check (display_order between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.live_trading_approval_evidence (
  id uuid primary key default gen_random_uuid(),
  evidence_sequence bigint generated always as identity unique,
  requirement_key text not null references public.live_trading_activation_requirements(requirement_key),
  evidence_version text not null check (evidence_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  decision text not null check (decision in ('approved', 'rejected', 'expired')),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  reviewer_fingerprint text not null check (reviewer_fingerprint ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (requirement_key, evidence_digest),
  check (decision <> 'approved' or valid_until is null or valid_until > reviewed_at)
);

create index live_trading_evidence_requirement_sequence
  on public.live_trading_approval_evidence(requirement_key, evidence_sequence desc);

alter table public.live_trading_activation_controls enable row level security;
alter table public.live_trading_activation_requirements enable row level security;
alter table public.live_trading_approval_evidence enable row level security;

create policy "Public reads live trading activation locks"
  on public.live_trading_activation_controls for select to anon, authenticated
  using (true);

create policy "Public reads activation requirements"
  on public.live_trading_activation_requirements for select to anon, authenticated
  using (true);

create policy "Public reads sanitized approval states"
  on public.live_trading_approval_evidence for select to anon, authenticated
  using (true);

revoke all on public.live_trading_activation_controls from anon, authenticated, service_role;
revoke all on public.live_trading_activation_requirements from anon, authenticated, service_role;
revoke all on public.live_trading_approval_evidence from anon, authenticated, service_role;

grant select on public.live_trading_activation_controls to anon, authenticated;
grant select on public.live_trading_activation_requirements to anon, authenticated;
grant select (
  evidence_sequence, requirement_key, decision, reviewed_at, valid_until, created_at
) on public.live_trading_approval_evidence to anon, authenticated;

create trigger live_trading_activation_controls_set_updated_at
  before update on public.live_trading_activation_controls
  for each row execute function public.set_updated_at();

insert into public.live_trading_activation_controls (
  control_key, readiness_review_enabled, evidence_collection_enabled,
  activation_status, live_order_routing_enabled, browser_order_submission_enabled,
  automatic_activation_enabled, customer_funding_enabled, custody_enabled,
  settlement_enabled, short_selling_enabled, margin_enabled,
  kill_switch_activation_enabled, manual_activation_review_required, policy_version
) values (
  'controlled-live-trading', true, true,
  'blocked', false, false,
  false, false, false,
  false, false, false,
  false, true, 'live-trading-readiness-v1'
);

insert into public.live_trading_activation_requirements (
  requirement_key, domain, title, summary, display_order
) values
  ('jurisdiction_authorization', 'jurisdiction', 'Jurisdiction authorization', 'Written legal analysis and regulatory authorization for every customer and execution jurisdiction.', 1),
  ('broker_production_agreement', 'broker', 'Production broker agreement', 'Executed production agreement, approved account model and documented broker responsibilities.', 2),
  ('broker_production_certification', 'broker', 'Production broker certification', 'Broker-certified production connectivity, order lifecycle, rejection and recovery evidence.', 3),
  ('customer_identity_kyc', 'compliance', 'Customer identity and KYC', 'Approved identity verification, beneficial-owner and customer due-diligence controls.', 4),
  ('aml_sanctions_program', 'compliance', 'AML and sanctions program', 'Documented sanctions, PEP, adverse-media and ongoing transaction-monitoring program.', 5),
  ('suitability_appropriateness', 'compliance', 'Suitability and appropriateness', 'Approved customer classification, suitability, appropriateness and product-governance policy.', 6),
  ('customer_disclosures', 'customer', 'Customer disclosures and consent', 'Approved risk, execution, fee, conflict, privacy and market-data disclosures with versioned consent.', 7),
  ('funding_partner_approval', 'money', 'Funding partner approval', 'Approved funding partner, source-of-funds controls and account ownership verification.', 8),
  ('custody_safeguarding', 'money', 'Custody and safeguarding', 'Documented asset custody, segregation, safeguarding and customer-money responsibilities.', 9),
  ('settlement_clearing', 'money', 'Settlement and clearing', 'Approved clearing, settlement, failed-trade and corporate-action operating model.', 10),
  ('market_data_licensing', 'market_data', 'Market-data licensing', 'Production data licenses, entitlements, redistribution rights and exchange attribution controls.', 11),
  ('pretrade_risk_limits', 'risk', 'Pre-trade risk limits', 'Independently approved order, notional, concentration, price, velocity and loss controls.', 12),
  ('kill_switch_drill', 'risk', 'Kill-switch drill', 'Observed stop-routing drill with ownership, dual control, recovery criteria and retained evidence.', 13),
  ('monitoring_alerting', 'operations', 'Monitoring and alerting', 'Production telemetry, alert ownership, on-call coverage and escalation thresholds.', 14),
  ('broker_ledger_reconciliation', 'operations', 'Broker ledger reconciliation', 'Position, cash, order, fill and fee reconciliation with controlled exception handling.', 15),
  ('incident_disaster_recovery', 'operations', 'Incident and disaster recovery', 'Tested incident response, rollback, continuity, recovery-time and recovery-point evidence.', 16),
  ('security_privacy_review', 'operations', 'Security and privacy approval', 'Independent security, threat-model, privacy, retention and access-control approval.', 17),
  ('customer_support_complaints', 'customer', 'Support and complaints operations', 'Staffed support, regulated complaint handling, vulnerable-customer and escalation procedures.', 18);

create or replace function public.prevent_live_trading_evidence_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Live trading approval evidence is append-only';
end;
$$;

create trigger live_trading_approval_evidence_append_only
  before update or delete on public.live_trading_approval_evidence
  for each row execute function public.prevent_live_trading_evidence_mutation();

create or replace function public.persist_live_trading_approval_evidence(p_evidence jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requirement_value text := p_evidence ->> 'requirementKey';
  digest_value text := p_evidence ->> 'evidenceDigest';
  evidence_record public.live_trading_approval_evidence%rowtype;
  existing_record public.live_trading_approval_evidence%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the regulated activation evidence service';
  end if;

  if not exists (
    select 1 from public.live_trading_activation_requirements
    where requirement_key = requirement_value
  ) then
    raise exception 'Unknown live trading activation requirement';
  end if;

  select * into existing_record
  from public.live_trading_approval_evidence
  where requirement_key = requirement_value
    and evidence_digest = digest_value;

  if existing_record.id is not null then
    if existing_record.evidence_version is distinct from p_evidence ->> 'evidenceVersion'
      or existing_record.decision is distinct from p_evidence ->> 'decision'
      or existing_record.reviewer_fingerprint is distinct from p_evidence ->> 'reviewerFingerprint'
      or existing_record.reviewed_at is distinct from (p_evidence ->> 'reviewedAt')::timestamptz
      or existing_record.valid_until is distinct from nullif(p_evidence ->> 'validUntil', '')::timestamptz then
      raise exception 'Activation evidence digest was reused with different input';
    end if;
    return jsonb_build_object('evidence', to_jsonb(existing_record), 'idempotent', true);
  end if;

  insert into public.live_trading_approval_evidence (
    requirement_key, evidence_version, decision, evidence_digest,
    reviewer_fingerprint, reviewed_at, valid_until
  ) values (
    requirement_value,
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
    'live_trading_approval_evidence_recorded',
    'live_trading_activation_requirement',
    requirement_value,
    'system',
    evidence_record.id::text,
    jsonb_build_object(
      'decision', evidence_record.decision,
      'evidenceVersion', evidence_record.evidence_version,
      'activationStatus', 'blocked',
      'liveOrderRoutingEnabled', false
    )
  );

  return jsonb_build_object('evidence', to_jsonb(evidence_record), 'idempotent', false);
end;
$$;

revoke all on function public.persist_live_trading_approval_evidence(jsonb) from public;
grant execute on function public.persist_live_trading_approval_evidence(jsonb) to service_role;

create or replace view public.live_trading_readiness_requirements
with (security_invoker = true)
as
select
  requirement.requirement_key,
  requirement.domain,
  requirement.title,
  requirement.summary,
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
  ) as approval_current
from public.live_trading_activation_requirements requirement
left join lateral (
  select decision, reviewed_at, valid_until
  from public.live_trading_approval_evidence
  where requirement_key = requirement.requirement_key
  order by evidence_sequence desc
  limit 1
) evidence on true;

grant select on public.live_trading_readiness_requirements to anon, authenticated;

create or replace view public.live_trading_readiness_summary
with (security_invoker = true)
as
select
  control.policy_version,
  count(requirement.requirement_key)::integer as requirement_count,
  count(*) filter (where requirement.approval_current)::integer as current_approval_count,
  count(*) filter (where not requirement.approval_current)::integer as blocking_gap_count,
  'blocked'::text as readiness_status,
  true as manual_activation_review_required,
  false as live_order_routing_enabled,
  false as browser_order_submission_enabled,
  false as automatic_activation_enabled,
  false as customer_funding_enabled,
  false as custody_enabled,
  false as settlement_enabled,
  false as kill_switch_activation_enabled
from public.live_trading_activation_controls control
cross join public.live_trading_readiness_requirements requirement
where control.control_key = 'controlled-live-trading'
group by control.policy_version;

grant select on public.live_trading_readiness_summary to anon, authenticated;

comment on table public.live_trading_activation_controls is
  'Phase 6C readiness controls. Every production execution and money-movement capability remains database-locked false.';
comment on table public.live_trading_activation_requirements is
  'Public, independently reviewable requirements that must have written evidence before a future activation decision.';
comment on table public.live_trading_approval_evidence is
  'Append-only approval decisions containing one-way evidence and reviewer fingerprints; raw documents and identities are not stored.';
comment on view public.live_trading_readiness_summary is
  'Sanitized activation-readiness totals. Phase 6C remains blocked even when all evidence is current.';
