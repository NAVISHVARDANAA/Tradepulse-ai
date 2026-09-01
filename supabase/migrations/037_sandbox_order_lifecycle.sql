-- TradePulse AI
-- Migration 037: Phase 6B partner-sandbox order lifecycle
-- Every provider route is fixed to Alpaca's Broker API sandbox. Browser order
-- submission, production routing, funding, custody, settlement and money
-- movement remain disabled.

create table public.broker_sandbox_order_controls (
  control_key text primary key check (control_key = 'alpaca-sandbox-orders'),
  provider_id bigint not null references public.broker_provider_registry(id),
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  api_origin text not null check (
    api_origin = 'https://broker-api.sandbox.alpaca.markets'
  ),
  internal_submission_enabled boolean not null default true,
  browser_submission_enabled boolean not null default false check (not browser_submission_enabled),
  live_order_routing_enabled boolean not null default false check (not live_order_routing_enabled),
  cancel_enabled boolean not null default true,
  replace_enabled boolean not null default true,
  reconciliation_enabled boolean not null default true,
  protective_orders_required boolean not null default true,
  max_order_notional_usd numeric(18,2) not null default 1000
    check (max_order_notional_usd between 1 and 10000),
  max_quantity numeric(18,8) not null default 1000
    check (max_quantity between 0.00000001 and 100000),
  policy_version text not null,
  updated_at timestamptz not null default now(),
  unique (provider_id)
);

create table public.broker_sandbox_order_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  provider_id bigint not null references public.broker_provider_registry(id),
  command_id uuid not null,
  action text not null check (action in ('submit', 'cancel', 'replace', 'reconcile')),
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  root_client_order_id text not null check (
    root_client_order_id ~ '^tp-sbx-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  client_order_id text not null check (
    client_order_id ~ '^tp-sbx-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  prior_client_order_id text check (
    prior_client_order_id is null or prior_client_order_id ~ '^tp-sbx-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  account_fingerprint text not null check (account_fingerprint ~ '^[0-9a-f]{64}$'),
  provider_order_fingerprint text check (
    provider_order_fingerprint is null or provider_order_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  symbol text not null check (symbol ~ '^[A-Z][A-Z0-9.-]{0,14}$'),
  asset_class text not null default 'us_equity' check (asset_class = 'us_equity'),
  side text not null check (side = 'buy'),
  order_type text not null check (order_type = 'limit'),
  time_in_force text not null default 'day' check (time_in_force = 'day'),
  order_class text not null check (order_class = 'bracket'),
  quantity numeric(18,8) not null check (quantity > 0),
  limit_price numeric(18,8) check (limit_price is null or limit_price > 0),
  take_profit_limit_price numeric(18,8) check (
    take_profit_limit_price is null or take_profit_limit_price > 0
  ),
  stop_loss_stop_price numeric(18,8) check (
    stop_loss_stop_price is null or stop_loss_stop_price > 0
  ),
  estimated_notional_usd numeric(18,2) not null check (
    estimated_notional_usd > 0 and estimated_notional_usd <= 10000
  ),
  provider_status text not null check (provider_status in (
    'accepted', 'new', 'partially_filled', 'filled', 'done_for_day',
    'canceled', 'expired', 'replaced', 'pending_cancel', 'pending_replace',
    'rejected', 'stopped', 'suspended', 'calculated', 'ambiguous'
  )),
  http_status integer check (http_status is null or http_status between 100 and 599),
  latency_ms integer not null check (latency_ms between 0 and 15000),
  recovered_after_ambiguous boolean not null default false,
  provider_recorded_at timestamptz,
  live_order_routing_enabled boolean not null default false check (not live_order_routing_enabled),
  browser_originated boolean not null default false check (not browser_originated),
  created_at timestamptz not null default now(),
  unique (user_id, command_id),
  check (limit_price is not null),
  check (
    order_class <> 'bracket' or (
      take_profit_limit_price is not null
      and stop_loss_stop_price is not null
      and take_profit_limit_price > stop_loss_stop_price
      and take_profit_limit_price > limit_price
      and stop_loss_stop_price < limit_price
    )
  )
);

create table public.broker_sandbox_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id bigint not null references public.broker_provider_registry(id),
  run_key uuid not null unique,
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  checked_orders integer not null check (checked_orders between 0 and 10000),
  matching_orders integer not null check (matching_orders between 0 and checked_orders),
  mismatched_orders integer not null check (mismatched_orders between 0 and checked_orders),
  missing_orders integer not null check (missing_orders between 0 and checked_orders),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('passed', 'attention_required', 'failed')),
  live_order_routing_tested boolean not null default false check (not live_order_routing_tested),
  created_at timestamptz not null default now(),
  check (matching_orders + mismatched_orders + missing_orders = checked_orders)
);

create index broker_sandbox_receipts_user_created
  on public.broker_sandbox_order_receipts(user_id, created_at desc);
create index broker_sandbox_receipts_root_created
  on public.broker_sandbox_order_receipts(user_id, root_client_order_id, created_at desc);
create index broker_sandbox_reconciliation_provider_created
  on public.broker_sandbox_reconciliation_runs(provider_id, created_at desc);

alter table public.broker_sandbox_order_controls enable row level security;
alter table public.broker_sandbox_order_receipts enable row level security;
alter table public.broker_sandbox_reconciliation_runs enable row level security;

create policy "Public reads sandbox lifecycle controls"
  on public.broker_sandbox_order_controls for select to anon, authenticated
  using (true);

create policy "Users read their sandbox order receipts"
  on public.broker_sandbox_order_receipts for select to authenticated
  using (user_id = auth.uid());

create policy "Authenticated users read sandbox reconciliation health"
  on public.broker_sandbox_reconciliation_runs for select to authenticated
  using (true);

revoke insert, update, delete on public.broker_sandbox_order_controls from anon, authenticated;
revoke insert, update, delete on public.broker_sandbox_order_receipts from anon, authenticated;
revoke insert, update, delete on public.broker_sandbox_reconciliation_runs from anon, authenticated;
revoke insert, update, delete on public.broker_sandbox_order_controls from service_role;
revoke insert, update, delete on public.broker_sandbox_order_receipts from service_role;
revoke insert, update, delete on public.broker_sandbox_reconciliation_runs from service_role;
grant select on public.broker_sandbox_order_controls to anon, authenticated;
grant select on public.broker_sandbox_order_receipts to authenticated;
grant select on public.broker_sandbox_reconciliation_runs to authenticated;
grant select on public.broker_sandbox_order_controls to service_role;
grant select on public.broker_sandbox_order_receipts to service_role;
grant select on public.broker_sandbox_reconciliation_runs to service_role;

create trigger broker_sandbox_order_controls_set_updated_at
  before update on public.broker_sandbox_order_controls
  for each row execute function public.set_updated_at();

insert into public.broker_sandbox_order_controls (
  control_key,
  provider_id,
  environment,
  api_origin,
  internal_submission_enabled,
  browser_submission_enabled,
  live_order_routing_enabled,
  cancel_enabled,
  replace_enabled,
  reconciliation_enabled,
  protective_orders_required,
  max_order_notional_usd,
  max_quantity,
  policy_version
)
select
  'alpaca-sandbox-orders',
  provider.id,
  'sandbox',
  'https://broker-api.sandbox.alpaca.markets',
  true,
  false,
  false,
  true,
  true,
  true,
  true,
  1000,
  1000,
  'sandbox-order-lifecycle-v1'
from public.broker_provider_registry provider
where provider.code = 'alpaca-broker-sandbox'
on conflict (control_key) do update
set
  provider_id = excluded.provider_id,
  environment = 'sandbox',
  api_origin = excluded.api_origin,
  internal_submission_enabled = true,
  browser_submission_enabled = false,
  live_order_routing_enabled = false,
  cancel_enabled = true,
  replace_enabled = true,
  reconciliation_enabled = true,
  protective_orders_required = true,
  max_order_notional_usd = excluded.max_order_notional_usd,
  max_quantity = excluded.max_quantity,
  policy_version = excluded.policy_version;

create or replace function public.prevent_sandbox_order_evidence_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Sandbox order evidence is append-only';
end;
$$;

create trigger broker_sandbox_receipts_append_only
  before update or delete on public.broker_sandbox_order_receipts
  for each row execute function public.prevent_sandbox_order_evidence_mutation();

create trigger broker_sandbox_reconciliation_append_only
  before update or delete on public.broker_sandbox_reconciliation_runs
  for each row execute function public.prevent_sandbox_order_evidence_mutation();

create or replace function public.persist_broker_sandbox_order_receipt(
  p_user_id uuid,
  p_receipt jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  control_record public.broker_sandbox_order_controls%rowtype;
  existing_record public.broker_sandbox_order_receipts%rowtype;
  prior_record public.broker_sandbox_order_receipts%rowtype;
  receipt_record public.broker_sandbox_order_receipts%rowtype;
  action_value text := p_receipt ->> 'action';
  command_value uuid;
  request_digest_value text := p_receipt ->> 'requestDigest';
  root_client_value text := p_receipt ->> 'rootClientOrderId';
  client_value text := p_receipt ->> 'clientOrderId';
  prior_client_value text := nullif(p_receipt ->> 'priorClientOrderId', '');
  order_class_value text := p_receipt ->> 'orderClass';
  notional_value numeric := (p_receipt ->> 'estimatedNotionalUsd')::numeric;
  quantity_value numeric := (p_receipt ->> 'quantity')::numeric;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the sandbox-order lifecycle service';
  end if;

  if jsonb_typeof(p_receipt) <> 'object' then
    raise exception 'Sandbox order receipt must be an object';
  end if;

  begin
    command_value := (p_receipt ->> 'commandId')::uuid;
  exception when others then
    raise exception 'Sandbox order command identifier is invalid';
  end;

  select * into control_record
  from public.broker_sandbox_order_controls
  where control_key = 'alpaca-sandbox-orders';

  if control_record.provider_id is null
    or control_record.environment <> 'sandbox'
    or control_record.api_origin <> 'https://broker-api.sandbox.alpaca.markets'
    or not control_record.internal_submission_enabled
    or control_record.browser_submission_enabled
    or control_record.live_order_routing_enabled then
    raise exception 'Sandbox order lifecycle controls are not fail-closed';
  end if;

  if exists (
    select 1 from public.broker_provider_registry provider
    where provider.id = control_record.provider_id
      and (provider.live_order_routing_enabled or provider.code <> 'alpaca-broker-sandbox')
  ) or exists (
    select 1 from public.brokerage_execution_controls
    where control_key = 'global-live-orders' and execution_enabled
  ) then
    raise exception 'Sandbox order lifecycle requires the global live-order lock';
  end if;

  if not exists (
    select 1
    from public.controlled_beta_pilot_memberships membership
    join public.controlled_beta_pilot_cohorts cohort
      on cohort.cohort_code = membership.cohort_code
    where membership.user_id = p_user_id
      and membership.status = 'active'
      and membership.consented_at is not null
      and cohort.status = 'active'
      and now() between cohort.starts_at and cohort.ends_at
  ) then
    raise exception 'An active approved-tester pilot membership is required';
  end if;

  select * into existing_record
  from public.broker_sandbox_order_receipts
  where user_id = p_user_id and command_id = command_value;

  if existing_record.id is not null then
    if existing_record.request_digest <> request_digest_value then
      raise exception 'Sandbox order idempotency key was reused with different input';
    end if;
    return jsonb_build_object('receipt', to_jsonb(existing_record), 'idempotent', true);
  end if;

  if action_value not in ('submit', 'cancel', 'replace', 'reconcile') then
    raise exception 'Sandbox order action is invalid';
  end if;
  if action_value = 'submit' and (
    root_client_value <> client_value or prior_client_value is not null
  ) then
    raise exception 'Initial sandbox order identifiers must match';
  end if;
  if action_value <> 'submit' then
    select * into prior_record
    from public.broker_sandbox_order_receipts
    where user_id = p_user_id
      and root_client_order_id = root_client_value
      and client_order_id = prior_client_value
    order by created_at desc, id desc
    limit 1;

    if prior_record.id is null then
      raise exception 'Sandbox order lifecycle prior receipt was not found';
    end if;
    if prior_record.account_fingerprint <> p_receipt ->> 'accountFingerprint'
      or prior_record.symbol <> p_receipt ->> 'symbol'
      or prior_record.side <> p_receipt ->> 'side'
      or prior_record.order_type <> p_receipt ->> 'orderType'
      or prior_record.order_class <> order_class_value
      or prior_record.take_profit_limit_price is distinct from nullif(p_receipt ->> 'takeProfitLimitPrice', '')::numeric
      or prior_record.stop_loss_stop_price is distinct from nullif(p_receipt ->> 'stopLossStopPrice', '')::numeric then
      raise exception 'Sandbox order lifecycle identity or protective legs changed';
    end if;
    if action_value in ('cancel', 'reconcile') and (
      client_value <> prior_client_value
      or prior_record.quantity is distinct from quantity_value
      or prior_record.limit_price is distinct from nullif(p_receipt ->> 'limitPrice', '')::numeric
      or prior_record.estimated_notional_usd is distinct from notional_value
    ) then
      raise exception 'Sandbox cancel or reconciliation state changed unexpectedly';
    end if;
    if action_value = 'replace' and client_value = prior_client_value then
      raise exception 'Sandbox replacement requires a new client order identifier';
    end if;
  end if;
  if action_value = 'cancel' and not control_record.cancel_enabled then
    raise exception 'Sandbox cancellation is disabled';
  end if;
  if action_value = 'replace' and not control_record.replace_enabled then
    raise exception 'Sandbox replacement is disabled';
  end if;
  if action_value = 'reconcile' and not control_record.reconciliation_enabled then
    raise exception 'Sandbox reconciliation is disabled';
  end if;
  if action_value in ('submit', 'replace') and (
    notional_value > control_record.max_order_notional_usd
    or quantity_value > control_record.max_quantity
    or (control_record.protective_orders_required and order_class_value <> 'bracket')
  ) then
    raise exception 'Sandbox order exceeds the protective control envelope';
  end if;

  insert into public.broker_sandbox_order_receipts (
    user_id, provider_id, command_id, action, environment,
    root_client_order_id, client_order_id, prior_client_order_id,
    account_fingerprint, provider_order_fingerprint, request_digest, payload_digest,
    symbol, asset_class, side, order_type, time_in_force, order_class,
    quantity, limit_price, take_profit_limit_price, stop_loss_stop_price,
    estimated_notional_usd, provider_status, http_status, latency_ms,
    recovered_after_ambiguous, provider_recorded_at,
    live_order_routing_enabled, browser_originated
  ) values (
    p_user_id,
    control_record.provider_id,
    command_value,
    action_value,
    'sandbox',
    root_client_value,
    client_value,
    prior_client_value,
    p_receipt ->> 'accountFingerprint',
    nullif(p_receipt ->> 'providerOrderFingerprint', ''),
    request_digest_value,
    p_receipt ->> 'payloadDigest',
    p_receipt ->> 'symbol',
    'us_equity',
    p_receipt ->> 'side',
    p_receipt ->> 'orderType',
    'day',
    order_class_value,
    quantity_value,
    nullif(p_receipt ->> 'limitPrice', '')::numeric,
    nullif(p_receipt ->> 'takeProfitLimitPrice', '')::numeric,
    nullif(p_receipt ->> 'stopLossStopPrice', '')::numeric,
    notional_value,
    p_receipt ->> 'providerStatus',
    nullif(p_receipt ->> 'httpStatus', '')::integer,
    (p_receipt ->> 'latencyMs')::integer,
    coalesce((p_receipt ->> 'recoveredAfterAmbiguous')::boolean, false),
    nullif(p_receipt ->> 'providerRecordedAt', '')::timestamptz,
    false,
    false
  ) returning * into receipt_record;

  insert into public.financial_audit_events (
    user_id, event_type, resource_type, resource_id, actor_type, correlation_id, details
  ) values (
    p_user_id,
    'broker_sandbox_order_' || action_value,
    'broker_sandbox_order_receipt',
    receipt_record.id::text,
    'system',
    command_value::text,
    jsonb_build_object(
      'environment', 'sandbox',
      'action', action_value,
      'symbol', receipt_record.symbol,
      'providerStatus', receipt_record.provider_status,
      'policyVersion', control_record.policy_version,
      'browserOriginated', false,
      'liveOrderRoutingEnabled', false
    )
  );

  return jsonb_build_object('receipt', to_jsonb(receipt_record), 'idempotent', false);
end;
$$;

revoke all on function public.persist_broker_sandbox_order_receipt(uuid, jsonb) from public;
grant execute on function public.persist_broker_sandbox_order_receipt(uuid, jsonb) to service_role;

create or replace function public.persist_broker_sandbox_reconciliation(
  p_run_key uuid,
  p_checked_orders integer,
  p_matching_orders integer,
  p_mismatched_orders integer,
  p_missing_orders integer,
  p_evidence_digest text,
  p_status text
)
returns public.broker_sandbox_reconciliation_runs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  control_record public.broker_sandbox_order_controls%rowtype;
  run_record public.broker_sandbox_reconciliation_runs%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the sandbox-order reconciliation service';
  end if;
  select * into control_record from public.broker_sandbox_order_controls
  where control_key = 'alpaca-sandbox-orders';
  if control_record.provider_id is null or not control_record.reconciliation_enabled
    or control_record.live_order_routing_enabled or control_record.browser_submission_enabled then
    raise exception 'Sandbox reconciliation controls are not fail-closed';
  end if;

  insert into public.broker_sandbox_reconciliation_runs (
    provider_id, run_key, environment, checked_orders, matching_orders,
    mismatched_orders, missing_orders, evidence_digest, status,
    live_order_routing_tested
  ) values (
    control_record.provider_id, p_run_key, 'sandbox', p_checked_orders,
    p_matching_orders, p_mismatched_orders, p_missing_orders,
    p_evidence_digest, p_status, false
  )
  on conflict (run_key) do nothing
  returning * into run_record;

  if run_record.id is null then
    select * into run_record from public.broker_sandbox_reconciliation_runs
    where run_key = p_run_key;
  end if;
  return run_record;
end;
$$;

revoke all on function public.persist_broker_sandbox_reconciliation(
  uuid, integer, integer, integer, integer, text, text
) from public;
grant execute on function public.persist_broker_sandbox_reconciliation(
  uuid, integer, integer, integer, integer, text, text
) to service_role;

create or replace view public.broker_sandbox_order_lifecycle
with (security_invoker = true)
as
select distinct on (receipt.user_id, receipt.root_client_order_id)
  receipt.id,
  receipt.user_id,
  receipt.command_id,
  receipt.action,
  receipt.environment,
  receipt.root_client_order_id,
  receipt.client_order_id,
  receipt.symbol,
  receipt.side,
  receipt.order_type,
  receipt.time_in_force,
  receipt.order_class,
  receipt.quantity,
  receipt.limit_price,
  receipt.take_profit_limit_price,
  receipt.stop_loss_stop_price,
  receipt.estimated_notional_usd,
  receipt.provider_status,
  receipt.recovered_after_ambiguous,
  receipt.provider_recorded_at,
  receipt.created_at,
  false as browser_submission_enabled,
  false as live_order_routing_enabled
from public.broker_sandbox_order_receipts receipt
order by receipt.user_id, receipt.root_client_order_id, receipt.created_at desc, receipt.id desc;

grant select on public.broker_sandbox_order_lifecycle to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'broker_sandbox_order_receipts'
  ) then
    alter publication supabase_realtime add table public.broker_sandbox_order_receipts;
  end if;
end;
$$;

comment on table public.broker_sandbox_order_controls is
  'Phase 6B controls for internal-only Alpaca partner sandbox orders; browser and live routing remain disabled.';
comment on table public.broker_sandbox_order_receipts is
  'Append-only, customer-scoped sandbox lifecycle trust receipts. Raw provider account and order identifiers are never stored.';
comment on table public.broker_sandbox_reconciliation_runs is
  'Append-only aggregate sandbox order reconciliation evidence with no provider or customer identifiers.';
comment on view public.broker_sandbox_order_lifecycle is
  'Latest sanitized sandbox lifecycle state per customer order root; no browser submission or live execution capability.';
comment on function public.persist_broker_sandbox_order_receipt(uuid, jsonb) is
  'Service-only idempotent sandbox receipt writer gated by active pilot membership and global live-order locks.';
