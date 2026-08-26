-- TradePulse AI
-- Migration 026: plans, trials, entitlements and usage metering without payment execution

create table public.commercial_plans (
  code text primary key check (code in ('free', 'pro', 'business')),
  name text not null,
  description text not null,
  monthly_price_usd numeric(10,2) not null check (monthly_price_usd >= 0),
  monthly_price_gbp numeric(10,2) not null check (monthly_price_gbp >= 0),
  trial_days smallint not null default 0 check (trial_days between 0 and 30),
  self_serve boolean not null default false,
  display_order smallint not null unique check (display_order > 0),
  active boolean not null default true,
  catalog_version text not null check (catalog_version ~ '^pricing-v[0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.commercial_plans values
  ('free', 'Free', 'Core market intelligence and learning tools.', 0, 0, 0, true, 1, true, 'pricing-v1', now(), now()),
  ('pro', 'Pro', 'Expanded research, alerts and paper-investing capacity.', 24, 19, 14, true, 2, true, 'pricing-v1', now(), now()),
  ('business', 'Business', 'Team-scale limits and future organization controls.', 79, 65, 0, false, 3, true, 'pricing-v1', now(), now());

create table public.entitlement_definitions (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{2,63}$'),
  name text not null,
  unit text not null check (unit in ('count', 'per_day', 'boolean')),
  description text not null
);

insert into public.entitlement_definitions values
  ('watchlists', 'Watchlists', 'count', 'Maximum private watchlists.'),
  ('watchlist_assets', 'Watchlist assets', 'count', 'Maximum assets across watchlists.'),
  ('market_alerts', 'Market alerts', 'count', 'Maximum active alert rules.'),
  ('paper_portfolios', 'Paper portfolios', 'count', 'Maximum virtual portfolios.'),
  ('daily_briefs', 'Daily research briefs', 'per_day', 'Maximum on-demand briefs per UTC day.'),
  ('advanced_research', 'Advanced research', 'boolean', 'Access to expanded research surfaces.');

create table public.plan_entitlements (
  plan_code text not null references public.commercial_plans(code),
  entitlement_code text not null references public.entitlement_definitions(code),
  allowance integer not null check (allowance >= 0),
  primary key (plan_code, entitlement_code)
);

insert into public.plan_entitlements values
  ('free','watchlists',1), ('free','watchlist_assets',5), ('free','market_alerts',3), ('free','paper_portfolios',1), ('free','daily_briefs',1), ('free','advanced_research',0),
  ('pro','watchlists',10), ('pro','watchlist_assets',50), ('pro','market_alerts',25), ('pro','paper_portfolios',5), ('pro','daily_briefs',10), ('pro','advanced_research',1),
  ('business','watchlists',50), ('business','watchlist_assets',250), ('business','market_alerts',100), ('business','paper_portfolios',25), ('business','daily_briefs',100), ('business','advanced_research',1);

create table public.billing_provider_registry (
  code text primary key,
  display_name text not null,
  integration_status text not null check (integration_status in ('not_selected','sandbox','production_disabled')),
  checkout_enabled boolean not null default false check (not checkout_enabled),
  charge_collection_enabled boolean not null default false check (not charge_collection_enabled),
  customer_portal_enabled boolean not null default false check (not customer_portal_enabled),
  updated_at timestamptz not null default now()
);
insert into public.billing_provider_registry values ('unselected', 'Billing provider not selected', 'not_selected', false, false, false, now());

create table public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_code text not null references public.commercial_plans(code),
  status text not null check (status in ('free','trialing','active','past_due','cancelled','expired')),
  provider_code text not null default 'unselected' references public.billing_provider_registry(code),
  provider_customer_reference_hash text check (provider_customer_reference_hash is null or provider_customer_reference_hash ~ '^[a-f0-9]{64}$'),
  provider_subscription_reference_hash text check (provider_subscription_reference_hash is null or provider_subscription_reference_hash ~ '^[a-f0-9]{64}$'),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  subscription_revision bigint not null default 1 check (subscription_revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'trialing' or (trial_started_at is not null and trial_ends_at is not null)),
  check (trial_ends_at is null or trial_ends_at > trial_started_at)
);

create table public.subscription_events (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.customer_subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('free_initialized','trial_started','trial_expired','provider_sync','access_downgraded')),
  from_plan text references public.commercial_plans(code),
  to_plan text not null references public.commercial_plans(code),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object' and pg_column_size(evidence) <= 2048),
  occurred_at timestamptz not null default now()
);
create index subscription_events_user_time on public.subscription_events(user_id, occurred_at desc);

create table public.usage_meter_definitions (
  code text primary key references public.entitlement_definitions(code),
  aggregation text not null check (aggregation in ('daily_count','current_count')),
  billable boolean not null default false check (not billable),
  enabled boolean not null default true
);
insert into public.usage_meter_definitions values
  ('watchlists','current_count',false,true), ('watchlist_assets','current_count',false,true),
  ('market_alerts','current_count',false,true), ('paper_portfolios','current_count',false,true),
  ('daily_briefs','daily_count',false,true);

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_code text not null references public.usage_meter_definitions(code),
  quantity integer not null default 1 check (quantity between 1 and 10000),
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  source text not null check (source in ('platform_service','reconciliation')),
  occurred_at timestamptz not null default now(),
  unique (user_id, meter_code, idempotency_key)
);
create index usage_events_user_meter_time on public.usage_events(user_id, meter_code, occurred_at desc);

create or replace function public.prevent_commercial_event_mutation()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth as $$
begin
  if tg_op='DELETE' and not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
  raise exception 'Commercial evidence is append-only';
end;
$$;
create trigger subscription_events_append_only before update or delete on public.subscription_events
for each row execute function public.prevent_commercial_event_mutation();
create trigger usage_events_append_only before update or delete on public.usage_events
for each row execute function public.prevent_commercial_event_mutation();

alter table public.commercial_plans enable row level security;
alter table public.entitlement_definitions enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.billing_provider_registry enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.usage_meter_definitions enable row level security;
alter table public.usage_events enable row level security;

create policy "Customers read active plans" on public.commercial_plans for select to anon, authenticated using (active);
create policy "Customers read entitlement definitions" on public.entitlement_definitions for select to anon, authenticated using (true);
create policy "Customers read plan entitlements" on public.plan_entitlements for select to anon, authenticated using (true);
create policy "Customers read billing activation state" on public.billing_provider_registry for select to authenticated using (true);
create policy "Users read their subscription" on public.customer_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "Users read their subscription history" on public.subscription_events for select to authenticated using (user_id = auth.uid());
create policy "Users read their usage" on public.usage_events for select to authenticated using (user_id = auth.uid());

revoke all on public.commercial_plans, public.entitlement_definitions, public.plan_entitlements, public.billing_provider_registry,
  public.customer_subscriptions, public.subscription_events, public.usage_meter_definitions, public.usage_events from anon, authenticated;
grant select on public.commercial_plans, public.entitlement_definitions, public.plan_entitlements to anon, authenticated;
grant select on public.billing_provider_registry, public.customer_subscriptions, public.subscription_events, public.usage_events to authenticated;

create view public.customer_entitlements with (security_invoker = true) as
select subscription.user_id, subscription.plan_code, subscription.status,
  entitlement.entitlement_code, entitlement.allowance, subscription.trial_ends_at,
  subscription.current_period_ends_at
from public.customer_subscriptions subscription
join public.plan_entitlements entitlement on entitlement.plan_code = subscription.plan_code;
grant select on public.customer_entitlements to authenticated;

create or replace function public.commercial_entitlement_allowance(p_user_id uuid,p_entitlement text)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_allowance integer;
begin
  select entitlement.allowance into v_allowance
  from public.customer_subscriptions subscription
  join public.plan_entitlements entitlement on entitlement.plan_code=subscription.plan_code
  where subscription.user_id=p_user_id and entitlement.entitlement_code=p_entitlement
    and subscription.status in ('free','trialing','active');
  if v_allowance is null then raise exception 'Commercial entitlement is unavailable'; end if;
  return v_allowance;
end;
$$;
revoke all on function public.commercial_entitlement_allowance(uuid,text) from public,anon,authenticated,service_role;

create or replace function public.enforce_watchlist_limit()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_count integer; v_limit integer;
begin
  perform 1 from public.customer_subscriptions where user_id=new.user_id for update;
  v_limit:=public.commercial_entitlement_allowance(new.user_id,'watchlists');
  select count(*) into v_count from public.watchlists where user_id=new.user_id;
  if v_count>=v_limit then raise exception 'Watchlist limit reached for the current plan'; end if;
  return new;
end;
$$;

create or replace function public.enforce_watchlist_item_limit()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_owner uuid; v_count integer; v_limit integer;
begin
  select user_id into v_owner from public.watchlists where id=new.watchlist_id;
  perform 1 from public.customer_subscriptions where user_id=v_owner for update;
  v_limit:=public.commercial_entitlement_allowance(v_owner,'watchlist_assets');
  select count(*) into v_count from public.watchlist_items item join public.watchlists list on list.id=item.watchlist_id where list.user_id=v_owner;
  if v_count>=v_limit then raise exception 'Watchlist asset limit reached for the current plan'; end if;
  return new;
end;
$$;

create or replace function public.enforce_market_alert_limit()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_count integer; v_limit integer;
begin
  perform 1 from public.customer_subscriptions where user_id=new.user_id for update;
  v_limit:=public.commercial_entitlement_allowance(new.user_id,'market_alerts');
  select count(*) into v_count from public.market_alerts where user_id=new.user_id;
  if v_count>=v_limit then raise exception 'Market alert limit reached for the current plan'; end if;
  return new;
end;
$$;

create or replace function public.start_pro_trial()
returns public.customer_subscriptions language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_user uuid := auth.uid(); v_existing public.customer_subscriptions; v_result public.customer_subscriptions;
begin
  if v_user is null or auth.role() <> 'authenticated' then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':commercial-trial', 0));
  select * into v_existing from public.customer_subscriptions where user_id = v_user for update;
  if found and (v_existing.trial_started_at is not null or v_existing.status in ('trialing','active')) then
    raise exception 'The introductory trial is unavailable for this account';
  end if;
  insert into public.customer_subscriptions(user_id, plan_code, status, trial_started_at, trial_ends_at, current_period_ends_at)
  values (v_user, 'pro', 'trialing', clock_timestamp(), clock_timestamp() + interval '14 days', clock_timestamp() + interval '14 days')
  on conflict (user_id) do update set plan_code='pro', status='trialing', trial_started_at=clock_timestamp(),
    trial_ends_at=clock_timestamp()+interval '14 days', current_period_ends_at=clock_timestamp()+interval '14 days',
    subscription_revision=public.customer_subscriptions.subscription_revision+1, updated_at=clock_timestamp()
  returning * into v_result;
  update public.profiles set plan='pro', updated_at=clock_timestamp() where id=v_user;
  insert into public.subscription_events(subscription_id,user_id,event_type,from_plan,to_plan,evidence)
  values(v_result.id,v_user,'trial_started',coalesce(v_existing.plan_code,'free'),'pro',jsonb_build_object('trialDays',14,'checkoutEnabled',false,'chargeCollectionEnabled',false));
  return v_result;
end;
$$;
revoke all on function public.start_pro_trial() from public;
grant execute on function public.start_pro_trial() to authenticated;

create or replace function public.customer_commercial_summary()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_user uuid:=auth.uid(); v_subscription public.customer_subscriptions; v_usage jsonb;
begin
  if v_user is null or auth.role()<>'authenticated' then raise exception 'Authentication required'; end if;
  select * into v_subscription from public.customer_subscriptions where user_id=v_user;
  if not found then raise exception 'Subscription state is unavailable'; end if;
  select jsonb_object_agg(metric,quantity) into v_usage from (
    select 'watchlists' metric,count(*)::integer quantity from public.watchlists where user_id=v_user
    union all select 'watchlist_assets',count(*)::integer from public.watchlist_items item join public.watchlists list on list.id=item.watchlist_id where list.user_id=v_user
    union all select 'market_alerts',count(*)::integer from public.market_alerts where user_id=v_user and enabled
    union all select 'paper_portfolios',count(*)::integer from public.investment_portfolios where user_id=v_user
    union all select 'daily_briefs',count(*)::integer from public.research_briefs where user_id=v_user and generated_at>=date_trunc('day',now() at time zone 'UTC')
  ) usage;
  return jsonb_build_object('subscription',jsonb_build_object('planCode',v_subscription.plan_code,'status',v_subscription.status,
      'trialEndsAt',v_subscription.trial_ends_at,'periodEndsAt',v_subscription.current_period_ends_at,'cancelAtPeriodEnd',v_subscription.cancel_at_period_end),
    'usage',coalesce(v_usage,'{}'::jsonb),'checkoutEnabled',false,'chargeCollectionEnabled',false,'providerCode',v_subscription.provider_code);
end;
$$;
revoke all on function public.customer_commercial_summary() from public;
grant execute on function public.customer_commercial_summary() to authenticated;

create or replace function public.record_usage_event(p_user_id uuid,p_meter_code text,p_quantity integer,p_idempotency_key text)
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'This operation requires the usage service'; end if;
  insert into public.usage_events(user_id,meter_code,quantity,idempotency_key,source)
  values(p_user_id,p_meter_code,p_quantity,p_idempotency_key,'platform_service')
  on conflict(user_id,meter_code,idempotency_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.usage_events
    where user_id=p_user_id and meter_code=p_meter_code and idempotency_key=p_idempotency_key;
  end if;
  return v_id;
end;
$$;
revoke all on function public.record_usage_event(uuid,text,integer,text) from public;
grant execute on function public.record_usage_event(uuid,text,integer,text) to service_role;

create or replace function public.reconcile_subscription_access()
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'This operation requires the subscription service'; end if;
  with expired as (
    update public.customer_subscriptions set plan_code='free', status='expired', current_period_ends_at=null,
      subscription_revision=subscription_revision+1, updated_at=clock_timestamp()
    where status='trialing' and trial_ends_at <= clock_timestamp() returning id,user_id
  ), profiles_updated as (
    update public.profiles profile set plan='free',updated_at=clock_timestamp() from expired where profile.id=expired.user_id returning expired.*
  )
  insert into public.subscription_events(subscription_id,user_id,event_type,from_plan,to_plan,evidence)
  select id,user_id,'trial_expired','pro','free',jsonb_build_object('checkoutEnabled',false) from profiles_updated;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.reconcile_subscription_access() from public;
grant execute on function public.reconcile_subscription_access() to service_role;

create or replace function public.run_subscription_reconciliation_cron()
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if session_user <> 'postgres' then raise exception 'This operation is restricted to the database scheduler'; end if;
  perform set_config('request.jwt.claim.role','service_role',true);
  perform public.reconcile_subscription_access();
end;
$$;
revoke all on function public.run_subscription_reconciliation_cron() from public,anon,authenticated,service_role;
select cron.schedule('tradepulse-subscription-reconciliation','7 * * * *','select public.run_subscription_reconciliation_cron();');

create or replace function public.initialize_customer_subscription()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_subscription public.customer_subscriptions;
begin
  insert into public.customer_subscriptions(user_id,plan_code,status) values(new.id,'free','free') returning * into v_subscription;
  insert into public.subscription_events(subscription_id,user_id,event_type,to_plan,evidence)
  values(v_subscription.id,new.id,'free_initialized','free',jsonb_build_object('billingProvider','unselected'));
  return new;
end;
$$;
create trigger on_profile_created_initialize_subscription after insert on public.profiles
for each row execute function public.initialize_customer_subscription();

update public.profiles set plan='free',updated_at=clock_timestamp() where plan<>'free';
insert into public.customer_subscriptions(user_id,plan_code,status)
select profile.id,'free','free' from public.profiles profile
on conflict(user_id) do nothing;

comment on table public.billing_provider_registry is 'Provider abstraction locked against checkout, charge collection and portal access.';
comment on table public.usage_events is 'Non-billable service-only product usage evidence; never a financial ledger.';
