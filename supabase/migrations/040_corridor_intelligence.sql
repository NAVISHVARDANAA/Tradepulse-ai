-- TradePulse AI
-- Migration 040: Phase 7A cross-border corridor intelligence
-- This migration adds transparent, reference-only route comparisons. It does
-- not connect a payment provider, collect beneficiary data or move money.

create table public.payment_corridor_intelligence_controls (
  control_key text primary key check (control_key = 'corridor-intelligence'),
  intelligence_enabled boolean not null default true check (intelligence_enabled),
  public_comparison_enabled boolean not null default true check (public_comparison_enabled),
  data_mode text not null default 'sandbox_model' check (data_mode = 'sandbox_model'),
  max_reference_age_minutes integer not null default 60 check (
    max_reference_age_minutes between 1 and 1440
  ),
  provider_connectivity_enabled boolean not null default false check (not provider_connectivity_enabled),
  beneficiary_collection_enabled boolean not null default false check (not beneficiary_collection_enabled),
  quote_acceptance_enabled boolean not null default false check (not quote_acceptance_enabled),
  automatic_route_selection_enabled boolean not null default false check (not automatic_route_selection_enabled),
  transfer_creation_enabled boolean not null default false check (not transfer_creation_enabled),
  payment_execution_enabled boolean not null default false check (not payment_execution_enabled),
  money_movement_enabled boolean not null default false check (not money_movement_enabled),
  custody_enabled boolean not null default false check (not custody_enabled),
  settlement_enabled boolean not null default false check (not settlement_enabled),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table public.payment_corridor_routes (
  id bigint generated always as identity primary key,
  route_code text not null unique check (route_code ~ '^[A-Z]{3}-[A-Z]{3}-[A-Z0-9-]{3,32}$'),
  corridor_id bigint not null references public.payment_corridors(id),
  provider_label text not null check (char_length(provider_label) between 3 and 80),
  provider_rate_mode text not null default 'sandbox_model' check (
    provider_rate_mode = 'sandbox_model'
  ),
  delivery_tier text not null check (delivery_tier in ('economy', 'priority')),
  provider_spread_bps numeric(8,2) not null check (provider_spread_bps between 0 and 5000),
  variable_fee_bps numeric(8,2) not null check (variable_fee_bps between 0 and 5000),
  fixed_fee numeric(20,2) not null check (fixed_fee >= 0),
  minimum_fee numeric(20,2) not null check (minimum_fee >= 0),
  tax_status text not null default 'unavailable' check (
    tax_status in ('unavailable', 'estimated', 'not_applicable')
  ),
  estimated_tax_bps numeric(8,2) check (
    estimated_tax_bps is null or estimated_tax_bps between 0 and 5000
  ),
  tax_explanation text not null check (char_length(tax_explanation) between 10 and 240),
  eta_min_minutes integer not null check (eta_min_minutes > 0),
  eta_max_minutes integer not null check (eta_max_minutes >= eta_min_minutes),
  availability text not null default 'reference_only' check (
    availability in ('reference_only', 'unavailable')
  ),
  availability_reason text not null check (char_length(availability_reason) between 10 and 240),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corridor_id, delivery_tier),
  check (
    (tax_status = 'estimated' and estimated_tax_bps is not null)
    or (tax_status <> 'estimated' and estimated_tax_bps is null)
  )
);

create index payment_corridor_routes_corridor
  on public.payment_corridor_routes(corridor_id, delivery_tier)
  where enabled;

alter table public.payment_corridor_intelligence_controls enable row level security;
alter table public.payment_corridor_routes enable row level security;

create policy "Public reads corridor intelligence locks"
  on public.payment_corridor_intelligence_controls for select to anon, authenticated
  using (true);

create policy "Public reads enabled corridor route models"
  on public.payment_corridor_routes for select to anon, authenticated
  using (enabled);

revoke all on public.payment_corridor_intelligence_controls from anon, authenticated, service_role;
revoke all on public.payment_corridor_routes from anon, authenticated, service_role;
grant select on public.payment_corridor_intelligence_controls to anon, authenticated;
grant select on public.payment_corridor_routes to anon, authenticated;

create trigger payment_corridor_intelligence_controls_set_updated_at
  before update on public.payment_corridor_intelligence_controls
  for each row execute function public.set_updated_at();

create trigger payment_corridor_routes_set_updated_at
  before update on public.payment_corridor_routes
  for each row execute function public.set_updated_at();

insert into public.payment_corridor_intelligence_controls (
  control_key, intelligence_enabled, public_comparison_enabled, data_mode,
  max_reference_age_minutes, provider_connectivity_enabled,
  beneficiary_collection_enabled, quote_acceptance_enabled,
  automatic_route_selection_enabled, transfer_creation_enabled,
  payment_execution_enabled, money_movement_enabled, custody_enabled,
  settlement_enabled, policy_version
) values (
  'corridor-intelligence', true, true, 'sandbox_model',
  60, false,
  false, false,
  false, false,
  false, false, false,
  false, 'corridor-intelligence-v1'
);

insert into public.payment_corridor_routes (
  route_code, corridor_id, provider_label, provider_rate_mode, delivery_tier,
  provider_spread_bps, variable_fee_bps, fixed_fee, minimum_fee,
  tax_status, estimated_tax_bps, tax_explanation,
  eta_min_minutes, eta_max_minutes, availability, availability_reason
)
select
  corridor.code || '-' || route.code_suffix,
  corridor.id,
  route.provider_label,
  'sandbox_model',
  route.delivery_tier,
  route.provider_spread_bps,
  route.variable_fee_bps,
  case when corridor.source_currency = 'INR' then route.fixed_fee_inr else route.fixed_fee_major end,
  case when corridor.source_currency = 'INR' then route.minimum_fee_inr else route.minimum_fee_major end,
  'unavailable',
  null,
  'Tax depends on customer and corridor facts and is not available in this reference-only phase.',
  greatest(15, round(corridor.settlement_minutes * route.eta_min_factor)::integer),
  greatest(30, round(corridor.settlement_minutes * route.eta_max_factor)::integer),
  'reference_only',
  'Licensed provider production connectivity and route approval are not configured.'
from public.payment_corridors corridor
cross join (
  values
    ('ECONOMY', 'Economy sandbox provider model', 'economy', 25::numeric, 30::numeric, 0.35::numeric, 15::numeric, 0.75::numeric, 30::numeric, 1.00::numeric, 1.50::numeric),
    ('PRIORITY', 'Priority sandbox provider model', 'priority', 40::numeric, 20::numeric, 0.75::numeric, 30::numeric, 1.25::numeric, 60::numeric, 0.25::numeric, 0.75::numeric)
) as route(
  code_suffix, provider_label, delivery_tier, provider_spread_bps,
  variable_fee_bps, fixed_fee_major, fixed_fee_inr, minimum_fee_major,
  minimum_fee_inr, eta_min_factor, eta_max_factor
)
where corridor.enabled
on conflict (route_code) do update
set
  provider_label = excluded.provider_label,
  provider_spread_bps = excluded.provider_spread_bps,
  variable_fee_bps = excluded.variable_fee_bps,
  fixed_fee = excluded.fixed_fee,
  minimum_fee = excluded.minimum_fee,
  tax_status = excluded.tax_status,
  estimated_tax_bps = excluded.estimated_tax_bps,
  tax_explanation = excluded.tax_explanation,
  eta_min_minutes = excluded.eta_min_minutes,
  eta_max_minutes = excluded.eta_max_minutes,
  availability = excluded.availability,
  availability_reason = excluded.availability_reason,
  enabled = true;

do $$
begin
  if exists (select 1 from public.payment_intents where status <> 'disabled') then
    raise exception 'Phase 7A cannot deploy while a payment intent is enabled';
  end if;
  if exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'Phase 7A cannot deploy with an accepted payment quote';
  end if;
end;
$$;

alter table public.payment_intents
  add constraint payment_intents_phase_7a_disabled check (status = 'disabled');

alter table public.payment_quotes
  add constraint payment_quotes_phase_7a_non_executable check (status <> 'accepted');

revoke all on public.payment_intents from anon, authenticated, service_role;

create or replace view public.payment_corridor_intelligence
with (security_invoker = true)
as
select
  route.id,
  route.route_code,
  corridor.id as corridor_id,
  corridor.code as corridor_code,
  corridor.source_currency,
  corridor.destination_currency,
  corridor.fx_symbol,
  corridor.rate_operation,
  route.provider_label,
  route.provider_rate_mode,
  route.delivery_tier,
  route.provider_spread_bps,
  route.variable_fee_bps,
  route.fixed_fee,
  route.minimum_fee,
  route.tax_status,
  route.estimated_tax_bps,
  route.tax_explanation,
  route.eta_min_minutes,
  route.eta_max_minutes,
  route.availability,
  route.availability_reason,
  control.max_reference_age_minutes,
  false as provider_connectivity_enabled,
  false as beneficiary_collection_enabled,
  false as quote_acceptance_enabled,
  false as automatic_route_selection_enabled,
  false as transfer_creation_enabled,
  false as payment_execution_enabled,
  false as money_movement_enabled,
  false as custody_enabled,
  false as settlement_enabled
from public.payment_corridor_routes route
join public.payment_corridors corridor on corridor.id = route.corridor_id
cross join public.payment_corridor_intelligence_controls control
where route.enabled
  and corridor.enabled
  and control.control_key = 'corridor-intelligence'
  and control.intelligence_enabled
  and control.public_comparison_enabled;

grant select on public.payment_corridor_intelligence to anon, authenticated;

comment on table public.payment_corridor_intelligence_controls is
  'Phase 7A comparison controls. Provider connectivity, beneficiary collection, quote acceptance, transfers and money movement are database-locked false.';
comment on table public.payment_corridor_routes is
  'Transparent sandbox route models for indicative comparison; no provider credentials, beneficiary data or executable instructions.';
comment on view public.payment_corridor_intelligence is
  'Public sanitized corridor comparison inputs with explicit tax uncertainty, ETA and route availability.';
