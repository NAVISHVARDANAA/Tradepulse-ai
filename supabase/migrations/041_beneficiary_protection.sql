-- TradePulse AI
-- Migration 041: Phase 7B beneficiary protection
-- This migration publishes synthetic protection rules only. It creates no
-- beneficiary record, identifier store, provider connection or payment path.

create table public.payment_beneficiary_protection_controls (
  control_key text primary key check (control_key = 'beneficiary-protection'),
  workspace_enabled boolean not null default true check (workspace_enabled),
  synthetic_rehearsal_enabled boolean not null default true check (synthetic_rehearsal_enabled),
  data_mode text not null default 'synthetic_rehearsal' check (data_mode = 'synthetic_rehearsal'),
  real_beneficiary_collection_enabled boolean not null default false check (not real_beneficiary_collection_enabled),
  beneficiary_identifier_storage_enabled boolean not null default false check (not beneficiary_identifier_storage_enabled),
  validation_provider_connectivity_enabled boolean not null default false check (not validation_provider_connectivity_enabled),
  beneficiary_creation_enabled boolean not null default false check (not beneficiary_creation_enabled),
  duplicate_override_enabled boolean not null default false check (not duplicate_override_enabled),
  cooling_off_bypass_enabled boolean not null default false check (not cooling_off_bypass_enabled),
  quote_acceptance_enabled boolean not null default false check (not quote_acceptance_enabled),
  transfer_creation_enabled boolean not null default false check (not transfer_creation_enabled),
  payment_execution_enabled boolean not null default false check (not payment_execution_enabled),
  money_movement_enabled boolean not null default false check (not money_movement_enabled),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table public.payment_beneficiary_protection_rules (
  id bigint generated always as identity primary key,
  rule_code text not null unique check (rule_code ~ '^[A-Z][A-Z0-9_]{2,48}$'),
  category text not null check (category in ('validation', 'duplicate', 'cooling_off', 'scam')),
  signal_key text not null unique check (signal_key ~ '^[a-z][a-z0-9_]{2,48}$'),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 10 and 280),
  severity text not null check (severity in ('medium', 'high', 'critical')),
  outcome text not null check (outcome in ('manual_review', 'cooling_off', 'blocked')),
  cooling_off_hours integer not null default 0 check (cooling_off_hours between 0 and 168),
  customer_message text not null check (char_length(customer_message) between 10 and 280),
  required_action text not null check (char_length(required_action) between 10 and 280),
  priority integer not null unique check (priority between 1 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (outcome = 'cooling_off' and cooling_off_hours > 0)
    or (outcome <> 'cooling_off' and cooling_off_hours = 0)
  )
);

alter table public.payment_beneficiary_protection_controls enable row level security;
alter table public.payment_beneficiary_protection_rules enable row level security;

create policy "Public reads beneficiary protection locks"
  on public.payment_beneficiary_protection_controls for select to anon, authenticated
  using (true);

create policy "Public reads enabled beneficiary protection rules"
  on public.payment_beneficiary_protection_rules for select to anon, authenticated
  using (enabled);

revoke all on public.payment_beneficiary_protection_controls from anon, authenticated, service_role;
revoke all on public.payment_beneficiary_protection_rules from anon, authenticated, service_role;
grant select on public.payment_beneficiary_protection_controls to anon, authenticated;
grant select on public.payment_beneficiary_protection_rules to anon, authenticated;

create trigger payment_beneficiary_protection_controls_set_updated_at
  before update on public.payment_beneficiary_protection_controls
  for each row execute function public.set_updated_at();

create trigger payment_beneficiary_protection_rules_set_updated_at
  before update on public.payment_beneficiary_protection_rules
  for each row execute function public.set_updated_at();

insert into public.payment_beneficiary_protection_controls (
  control_key, workspace_enabled, synthetic_rehearsal_enabled, data_mode,
  real_beneficiary_collection_enabled, beneficiary_identifier_storage_enabled,
  validation_provider_connectivity_enabled, beneficiary_creation_enabled,
  duplicate_override_enabled, cooling_off_bypass_enabled,
  quote_acceptance_enabled, transfer_creation_enabled,
  payment_execution_enabled, money_movement_enabled, policy_version
) values (
  'beneficiary-protection', true, true, 'synthetic_rehearsal',
  false, false,
  false, false,
  false, false,
  false, false,
  false, false, 'beneficiary-protection-v1'
);

insert into public.payment_beneficiary_protection_rules (
  rule_code, category, signal_key, title, description, severity, outcome,
  cooling_off_hours, customer_message, required_action, priority
) values
  ('DETAILS_INCOMPLETE', 'validation', 'details_incomplete', 'Required details incomplete',
   'Required beneficiary fields have not passed the synthetic completeness signal.', 'high', 'blocked', 0,
   'The beneficiary cannot progress while required details are incomplete.',
   'Stop and independently verify every required field before any future submission.', 10),
  ('NAME_MISMATCH', 'validation', 'name_mismatch', 'Account-name mismatch',
   'The synthetic name-check signal does not match the intended beneficiary.', 'critical', 'blocked', 0,
   'The account-name signal does not match the intended recipient.',
   'Do not continue; confirm the recipient through a trusted independent channel.', 20),
  ('DUPLICATE_IDENTITY', 'duplicate', 'duplicate_identity', 'Possible duplicate beneficiary',
   'A privacy-preserving synthetic fingerprint matches an existing beneficiary profile.', 'high', 'manual_review', 0,
   'A possible duplicate beneficiary requires review before any future creation.',
   'Compare the existing record and investigate unexpected differences without overriding the signal.', 30),
  ('RECENT_DETAILS_CHANGE', 'cooling_off', 'recent_details_change', 'Recently changed payment details',
   'The synthetic scenario indicates that beneficiary payment details changed recently.', 'high', 'cooling_off', 24,
   'Recently changed details trigger a 24-hour protection pause.',
   'Verify the change using a previously trusted contact method and wait for the pause to expire.', 40),
  ('UNVERIFIED_CHANNEL_CHANGE', 'scam', 'unverified_channel_change', 'Unverified channel change',
   'New payment details arrived through a channel that has not been independently verified.', 'critical', 'blocked', 0,
   'Unverified channel changes are a common invoice-redirection warning.',
   'Stop and contact the known recipient using a trusted number or address already on file.', 50),
  ('SOCIAL_ENGINEERING_PRESSURE', 'scam', 'social_engineering_pressure', 'Urgency or secrecy pressure',
   'The synthetic scenario contains urgency, secrecy or coercion signals associated with scams.', 'critical', 'blocked', 0,
   'Pressure to act quickly or secretly is treated as a serious scam warning.',
   'Pause, do not share codes, and independently contact the organization or person involved.', 60),
  ('FIRST_TIME_HIGH_RISK', 'cooling_off', 'first_time_high_risk', 'First-time elevated-risk beneficiary',
   'The synthetic risk signal marks a first-time beneficiary as unusually high risk for the customer context.', 'high', 'cooling_off', 12,
   'A first-time elevated-risk beneficiary triggers a 12-hour protection pause.',
   'Use the pause to re-check identity, purpose and payment instructions through trusted sources.', 70);

do $$
begin
  if to_regclass('public.payment_beneficiaries') is not null then
    raise exception 'Phase 7B cannot deploy while beneficiary record storage exists';
  end if;
  if to_regprocedure('public.create_payment_beneficiary(jsonb)') is not null then
    raise exception 'Phase 7B cannot deploy while a beneficiary creation RPC exists';
  end if;
  if exists (select 1 from public.payment_intents where status <> 'disabled') then
    raise exception 'Phase 7B cannot deploy while a payment intent is enabled';
  end if;
  if exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'Phase 7B cannot deploy with an accepted payment quote';
  end if;
end;
$$;

create or replace view public.payment_beneficiary_protection_reference
with (security_invoker = true)
as
select
  rule.id,
  rule.rule_code,
  rule.category,
  rule.signal_key,
  rule.title,
  rule.description,
  rule.severity,
  rule.outcome,
  rule.cooling_off_hours,
  rule.customer_message,
  rule.required_action,
  rule.priority,
  control.data_mode,
  false as real_beneficiary_collection_enabled,
  false as beneficiary_identifier_storage_enabled,
  false as validation_provider_connectivity_enabled,
  false as beneficiary_creation_enabled,
  false as duplicate_override_enabled,
  false as cooling_off_bypass_enabled,
  false as quote_acceptance_enabled,
  false as transfer_creation_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled
from public.payment_beneficiary_protection_rules rule
cross join public.payment_beneficiary_protection_controls control
where rule.enabled
  and control.control_key = 'beneficiary-protection'
  and control.workspace_enabled
  and control.synthetic_rehearsal_enabled;

grant select on public.payment_beneficiary_protection_reference to anon, authenticated;

comment on table public.payment_beneficiary_protection_controls is
  'Phase 7B hard locks: synthetic rehearsal only, with no real beneficiary data, provider connection, creation, bypass or money movement.';
comment on table public.payment_beneficiary_protection_rules is
  'Public synthetic validation, duplicate, cooling-off and scam-intervention reference rules. Contains no customer or beneficiary data.';
comment on view public.payment_beneficiary_protection_reference is
  'Sanitized Phase 7B protection rules and explicit non-executable controls for the public rehearsal workspace.';
