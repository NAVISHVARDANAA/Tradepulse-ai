-- TradePulse AI
-- Migration 031: private Business workspaces and role foundations

create table public.business_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (length(name) between 3 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,47}$'),
  status text not null default 'setup' check (status in ('setup','active','suspended')),
  seat_limit smallint not null default 3 check (seat_limit between 1 and 100),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.business_workspace_memberships (
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','analyst','viewer')),
  status text not null default 'active' check (status in ('active','suspended')),
  joined_at timestamptz not null default now(),primary key(workspace_id,user_id)
);
create index business_workspace_memberships_user on public.business_workspace_memberships(user_id,joined_at desc);
create table public.business_workspace_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('workspace_created','membership_changed')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object' and pg_column_size(evidence)<=1024),
  occurred_at timestamptz not null default now()
);

alter table public.business_workspaces enable row level security;
alter table public.business_workspace_memberships enable row level security;
alter table public.business_workspace_events enable row level security;
create policy "Members read their workspace" on public.business_workspaces for select to authenticated
using(exists(select 1 from public.business_workspace_memberships m where m.workspace_id=id and m.user_id=auth.uid() and m.status='active'));
create policy "Customers read their memberships" on public.business_workspace_memberships for select to authenticated using(user_id=auth.uid());
create policy "Members read workspace events" on public.business_workspace_events for select to authenticated
using(exists(select 1 from public.business_workspace_memberships m where m.workspace_id=business_workspace_events.workspace_id and m.user_id=auth.uid() and m.status='active'));
revoke all on public.business_workspaces,public.business_workspace_memberships,public.business_workspace_events from anon,authenticated;
grant select on public.business_workspaces,public.business_workspace_memberships,public.business_workspace_events to authenticated;

create or replace function public.prevent_business_workspace_event_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth as $$
begin if tg_op='DELETE' and not exists(select 1 from public.business_workspaces where id=old.workspace_id) then return old; end if;raise exception 'Business workspace evidence is append-only';end;
$$;
create trigger business_workspace_events_append_only before update or delete on public.business_workspace_events for each row execute function public.prevent_business_workspace_event_mutation();

create or replace function public.create_business_workspace(p_name text,p_slug text)
returns public.business_workspaces language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_workspace public.business_workspaces;
begin
  if v_user is null or auth.role()<>'authenticated' then raise exception 'Authentication required';end if;
  if length(trim(p_name)) not between 3 and 80 or lower(trim(p_slug))!~'^[a-z0-9][a-z0-9-]{2,47}$' then raise exception 'Invalid workspace identity';end if;
  if exists(select 1 from public.business_workspaces where owner_user_id=v_user) then raise exception 'An owned workspace already exists';end if;
  insert into public.business_workspaces(owner_user_id,name,slug) values(v_user,trim(p_name),lower(trim(p_slug))) returning * into v_workspace;
  insert into public.business_workspace_memberships(workspace_id,user_id,role) values(v_workspace.id,v_user,'owner');
  insert into public.business_workspace_events(workspace_id,actor_user_id,event_type,evidence) values(v_workspace.id,v_user,'workspace_created',jsonb_build_object('role','owner','seatLimit',v_workspace.seat_limit));
  return v_workspace;
end;
$$;
revoke all on function public.create_business_workspace(text,text) from public;
grant execute on function public.create_business_workspace(text,text) to authenticated;

comment on table public.business_workspaces is 'Private organization boundary for future Business collaboration. It does not activate billing, brokerage or shared trading.';
