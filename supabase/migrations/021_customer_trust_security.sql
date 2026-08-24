-- TradePulse AI
-- Migration 021: Customer trust, authenticated API abuse controls and evidence retention

create table public.api_rate_limit_buckets (
  user_id uuid not null,
  route_key text not null check (
    length(route_key) between 1 and 128
    and route_key ~ '^[a-z0-9/_-]+$'
  ),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, route_key, window_started_at)
);

create index api_rate_limit_buckets_retention
  on public.api_rate_limit_buckets(updated_at);

alter table public.api_rate_limit_buckets enable row level security;

revoke all on table public.api_rate_limit_buckets from anon, authenticated;

create or replace function public.consume_user_api_rate_limit(
  p_user_id uuid,
  p_route_key text,
  p_request_limit integer default 60,
  p_window_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
  v_retry_after integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the trusted API service';
  end if;

  if
    p_user_id is null
    or p_route_key is null
    or length(p_route_key) not between 1 and 128
    or p_route_key !~ '^[a-z0-9/_-]+$'
    or p_request_limit not between 1 and 1000
    or p_window_seconds not between 10 and 3600
  then
    raise exception 'Invalid API rate-limit policy';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limit_buckets (
    user_id,
    route_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_user_id, p_route_key, v_window_started_at, 1, v_now)
  on conflict (user_id, route_key, window_started_at)
  do update set
    request_count = public.api_rate_limit_buckets.request_count + 1,
    updated_at = excluded.updated_at
  returning request_count into v_request_count;

  delete from public.api_rate_limit_buckets
  where user_id = p_user_id
    and updated_at < v_now - interval '2 hours';

  v_retry_after := greatest(
    1,
    ceil(
      extract(epoch from v_window_started_at + make_interval(secs => p_window_seconds) - v_now)
    )::integer
  );

  return jsonb_build_object(
    'allowed', v_request_count <= p_request_limit,
    'limit', p_request_limit,
    'remaining', greatest(0, p_request_limit - v_request_count),
    'retryAfterSeconds', v_retry_after
  );
end;
$$;

revoke all on function public.consume_user_api_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_user_api_rate_limit(uuid, text, integer, integer)
  to service_role;

comment on table public.api_rate_limit_buckets is
  'Short-lived, service-only counters used to limit authenticated Edge Function abuse.';
comment on function public.consume_user_api_rate_limit(uuid, text, integer, integer) is
  'Atomically consumes an authenticated API allowance. No browser role may invoke it.';
