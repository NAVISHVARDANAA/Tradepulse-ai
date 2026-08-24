-- TradePulse AI
-- Migration 024: customer privacy preferences and service-controlled rights requests

create table public.customer_privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  product_analytics boolean not null default false,
  research_updates boolean not null default false,
  policy_version text not null default 'privacy-v1' check (policy_version ~ '^privacy-v[0-9]+$'),
  updated_at timestamptz not null default now()
);

create table public.customer_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access_export', 'account_deletion')),
  status text not null default 'requested' check (status in ('requested', 'in_review', 'completed', 'cancelled', 'rejected')),
  policy_version text not null default 'privacy-v1' check (policy_version ~ '^privacy-v[0-9]+$'),
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  service_note text check (service_note is null or length(service_note) <= 240),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((status = 'completed') = (completed_at is not null))
);

create unique index customer_privacy_requests_one_active_type
  on public.customer_privacy_requests(user_id, request_type)
  where status in ('requested', 'in_review');
create index customer_privacy_requests_user_time
  on public.customer_privacy_requests(user_id, requested_at desc);

alter table public.customer_privacy_preferences enable row level security;
alter table public.customer_privacy_requests enable row level security;

create policy "Users read their privacy preferences"
  on public.customer_privacy_preferences for select to authenticated
  using (user_id = auth.uid());
create policy "Users create their privacy preferences"
  on public.customer_privacy_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users update their privacy preferences"
  on public.customer_privacy_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users read their privacy requests"
  on public.customer_privacy_requests for select to authenticated
  using (user_id = auth.uid());

revoke all on public.customer_privacy_preferences from anon, authenticated;
revoke all on public.customer_privacy_requests from anon, authenticated;
grant select on public.customer_privacy_preferences to authenticated;
grant select on public.customer_privacy_requests to authenticated;

create or replace function public.set_customer_privacy_preferences(
  p_product_analytics boolean,
  p_research_updates boolean
)
returns public.customer_privacy_preferences
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_preferences public.customer_privacy_preferences;
begin
  if auth.uid() is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;
  insert into public.customer_privacy_preferences(
    user_id, product_analytics, research_updates, policy_version, updated_at
  ) values (
    auth.uid(), coalesce(p_product_analytics, false),
    coalesce(p_research_updates, false), 'privacy-v1', clock_timestamp()
  )
  on conflict (user_id) do update set
    product_analytics = excluded.product_analytics,
    research_updates = excluded.research_updates,
    policy_version = excluded.policy_version,
    updated_at = excluded.updated_at
  returning * into v_preferences;
  return v_preferences;
end;
$$;

create or replace function public.request_customer_privacy_action(p_request_type text)
returns public.customer_privacy_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
  v_enrolled_factors integer;
  v_request public.customer_privacy_requests;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;
  if p_request_type not in ('access_export', 'account_deletion') then
    raise exception 'Unsupported privacy request';
  end if;

  select coalesce(verified_factor_count, 0) into v_enrolled_factors
  from public.account_security_posture where user_id = v_user_id;
  if coalesce(v_enrolled_factors, 0) > 0 and v_aal <> 'aal2' then
    raise exception 'Authenticator verification required';
  end if;

  select * into v_request from public.customer_privacy_requests
  where user_id = v_user_id and request_type = p_request_type
    and status in ('requested', 'in_review')
  order by requested_at desc limit 1;
  if found then return v_request; end if;

  insert into public.customer_privacy_requests(user_id, request_type)
  values (v_user_id, p_request_type)
  returning * into v_request;
  return v_request;
end;
$$;

create or replace function public.cancel_customer_deletion_request(p_request_id uuid)
returns public.customer_privacy_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.customer_privacy_requests;
begin
  if auth.uid() is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;
  update public.customer_privacy_requests
  set status = 'cancelled', cancelled_at = clock_timestamp()
  where id = p_request_id and user_id = auth.uid()
    and request_type = 'account_deletion' and status = 'requested'
  returning * into v_request;
  if not found then raise exception 'Cancellable deletion request not found'; end if;
  return v_request;
end;
$$;

revoke all on function public.request_customer_privacy_action(text) from public;
revoke all on function public.cancel_customer_deletion_request(uuid) from public;
revoke all on function public.set_customer_privacy_preferences(boolean, boolean) from public;
grant execute on function public.request_customer_privacy_action(text) to authenticated;
grant execute on function public.cancel_customer_deletion_request(uuid) to authenticated;
grant execute on function public.set_customer_privacy_preferences(boolean, boolean) to authenticated;

comment on table public.customer_privacy_requests is
  'Private rights-request queue. Completion and destructive deletion remain service-controlled.';
