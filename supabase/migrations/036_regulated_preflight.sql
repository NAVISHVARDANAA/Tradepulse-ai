-- TradePulse AI
-- Migration 036: Regulated preflight review
-- This phase evaluates readiness evidence only. It cannot create, submit,
-- route, fund, settle or custody an order.

create table if not exists public.brokerage_preflight_controls (
  control_key text primary key check (control_key = 'regulated-preflight'),
  preflight_enabled boolean not null default true,
  order_submission_enabled boolean not null default false check (not order_submission_enabled),
  market_session_verification_enabled boolean not null default false check (not market_session_verification_enabled),
  fee_schedule_enabled boolean not null default false check (not fee_schedule_enabled),
  risk_capacity_approval_enabled boolean not null default false check (not risk_capacity_approval_enabled),
  policy_version text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.brokerage_preflight_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_request_id uuid not null,
  instrument_id bigint not null references public.investment_instruments(id),
  side text not null check (side in ('buy', 'sell')),
  order_type text not null check (order_type in ('market', 'limit')),
  quantity numeric(24,8) not null check (quantity > 0),
  limit_price numeric(20,8) check (limit_price is null or limit_price > 0),
  reference_price numeric(20,8) check (reference_price is null or reference_price > 0),
  reference_observed_at timestamptz,
  estimated_notional numeric(24,8) check (estimated_notional is null or estimated_notional > 0),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  eligibility_status text not null check (
    eligibility_status in ('not_verified', 'review_required', 'policy_match', 'blocked')
  ),
  disclosure_status text not null check (disclosure_status in ('complete', 'incomplete')),
  suitability_status text not null check (
    suitability_status in ('not_assessed', 'pending', 'suitable', 'restricted')
  ),
  market_session_status text not null default 'not_verified' check (
    market_session_status = 'not_verified'
  ),
  reference_data_status text not null check (
    reference_data_status in ('current', 'stale', 'unavailable')
  ),
  cost_status text not null default 'unavailable' check (cost_status = 'unavailable'),
  cost_breakdown jsonb not null check (jsonb_typeof(cost_breakdown) = 'object'),
  risk_status text not null default 'review_required' check (risk_status = 'review_required'),
  risk_summary jsonb not null check (jsonb_typeof(risk_summary) = 'object'),
  review_status text not null default 'blocked' check (review_status = 'blocked'),
  executable boolean not null default false check (not executable),
  block_reasons jsonb not null check (
    jsonb_typeof(block_reasons) = 'array' and jsonb_array_length(block_reasons) > 0
  ),
  policy_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_request_id),
  check (order_type <> 'limit' or limit_price is not null),
  check (expires_at > created_at)
);

create index if not exists idx_brokerage_preflight_user_created
  on public.brokerage_preflight_reviews(user_id, created_at desc);

alter table public.brokerage_preflight_controls enable row level security;
alter table public.brokerage_preflight_reviews enable row level security;

create policy "Public reads regulated preflight controls"
  on public.brokerage_preflight_controls for select to anon, authenticated
  using (true);

create policy "Users read their regulated preflight reviews"
  on public.brokerage_preflight_reviews for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.brokerage_preflight_controls from anon, authenticated;
revoke insert, update, delete on public.brokerage_preflight_reviews from anon, authenticated;

grant select on public.brokerage_preflight_controls to anon, authenticated;
grant select on public.brokerage_preflight_reviews to authenticated;

create trigger brokerage_preflight_controls_set_updated_at
  before update on public.brokerage_preflight_controls
  for each row execute function public.set_updated_at();

insert into public.brokerage_preflight_controls (
  control_key,
  preflight_enabled,
  order_submission_enabled,
  market_session_verification_enabled,
  fee_schedule_enabled,
  risk_capacity_approval_enabled,
  policy_version
)
values (
  'regulated-preflight',
  true,
  false,
  false,
  false,
  false,
  'regulated-preflight-v1'
)
on conflict (control_key) do update
set
  preflight_enabled = true,
  order_submission_enabled = false,
  market_session_verification_enabled = false,
  fee_schedule_enabled = false,
  risk_capacity_approval_enabled = false,
  policy_version = excluded.policy_version;

insert into public.brokerage_disclosures (
  code,
  version,
  title,
  summary,
  required,
  published,
  effective_at
)
values
  (
    'preflight-cost-boundary',
    'v1',
    'A complete total cost is not yet available',
    'The preflight may calculate reference notional, but broker fees, taxes, foreign-exchange costs and final charges remain unavailable until approved provider schedules are configured.',
    true,
    true,
    '2026-01-01T00:00:00Z'
  ),
  (
    'preflight-market-state-boundary',
    'v1',
    'A reference price does not prove the market is open',
    'Quote freshness and exchange session state are separate controls. TradePulse does not currently verify an executable market session or guarantee that a displayed reference can be traded.',
    true,
    true,
    '2026-01-01T00:00:00Z'
  )
on conflict (code, version) do update
set
  title = excluded.title,
  summary = excluded.summary,
  required = excluded.required,
  published = excluded.published,
  effective_at = excluded.effective_at;

create or replace function public.persist_regulated_preflight_review(
  p_user_id uuid,
  p_client_request_id uuid,
  p_instrument_id bigint,
  p_side text,
  p_order_type text,
  p_quantity numeric,
  p_limit_price numeric,
  p_reference_price numeric,
  p_reference_observed_at timestamptz,
  p_estimated_notional numeric,
  p_quote_currency text,
  p_eligibility_status text,
  p_disclosure_status text,
  p_suitability_status text,
  p_reference_data_status text,
  p_cost_breakdown jsonb,
  p_risk_summary jsonb,
  p_block_reasons jsonb,
  p_policy_version text,
  p_expires_at timestamptz
)
returns public.brokerage_preflight_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  review_record public.brokerage_preflight_reviews%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the regulated-preflight service';
  end if;

  insert into public.brokerage_preflight_reviews (
    user_id,
    client_request_id,
    instrument_id,
    side,
    order_type,
    quantity,
    limit_price,
    reference_price,
    reference_observed_at,
    estimated_notional,
    quote_currency,
    eligibility_status,
    disclosure_status,
    suitability_status,
    market_session_status,
    reference_data_status,
    cost_status,
    cost_breakdown,
    risk_status,
    risk_summary,
    review_status,
    executable,
    block_reasons,
    policy_version,
    expires_at
  ) values (
    p_user_id,
    p_client_request_id,
    p_instrument_id,
    p_side,
    p_order_type,
    p_quantity,
    p_limit_price,
    p_reference_price,
    p_reference_observed_at,
    p_estimated_notional,
    p_quote_currency,
    p_eligibility_status,
    p_disclosure_status,
    p_suitability_status,
    'not_verified',
    p_reference_data_status,
    'unavailable',
    p_cost_breakdown,
    'review_required',
    p_risk_summary,
    'blocked',
    false,
    p_block_reasons,
    p_policy_version,
    p_expires_at
  )
  on conflict (user_id, client_request_id) do nothing
  returning * into review_record;

  if review_record.id is null then
    select * into review_record
    from public.brokerage_preflight_reviews
    where user_id = p_user_id
      and client_request_id = p_client_request_id;
    return review_record;
  end if;

  insert into public.financial_audit_events (
    user_id,
    event_type,
    resource_type,
    resource_id,
    actor_type,
    correlation_id,
    details
  ) values (
    p_user_id,
    'regulated_preflight_blocked',
    'brokerage_preflight_review',
    review_record.id::text,
    'system',
    p_client_request_id::text,
    jsonb_build_object(
      'instrumentId', p_instrument_id,
      'eligibilityStatus', p_eligibility_status,
      'disclosureStatus', p_disclosure_status,
      'suitabilityStatus', p_suitability_status,
      'referenceDataStatus', p_reference_data_status,
      'reviewStatus', 'blocked',
      'executable', false,
      'policyVersion', p_policy_version
    )
  );

  return review_record;
end;
$$;

revoke all on function public.persist_regulated_preflight_review(
  uuid, uuid, bigint, text, text, numeric, numeric, numeric, timestamptz,
  numeric, text, text, text, text, text, jsonb, jsonb, jsonb, text, timestamptz
) from public;
grant execute on function public.persist_regulated_preflight_review(
  uuid, uuid, bigint, text, text, numeric, numeric, numeric, timestamptz,
  numeric, text, text, text, text, text, jsonb, jsonb, jsonb, text, timestamptz
) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'brokerage_preflight_reviews'
  ) then
    alter publication supabase_realtime add table public.brokerage_preflight_reviews;
  end if;
end;
$$;

comment on table public.brokerage_preflight_controls is
  'Fail-closed Phase 6A controls. Every execution-adjacent capability remains disabled.';
comment on table public.brokerage_preflight_reviews is
  'Private, identity-bound regulated preflight evidence. Every row is blocked and non-executable.';
comment on function public.persist_regulated_preflight_review(
  uuid, uuid, bigint, text, text, numeric, numeric, numeric, timestamptz,
  numeric, text, text, text, text, text, jsonb, jsonb, jsonb, text, timestamptz
) is 'Service-only idempotent persistence for blocked regulated preflight evidence.';
