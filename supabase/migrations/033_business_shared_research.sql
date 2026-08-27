-- TradePulse AI
-- Migration 033: role-controlled shared research collections

create or replace function public.is_business_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.business_workspace_memberships where workspace_id=p_workspace_id and user_id=auth.uid() and status='active')
$$;
create or replace function public.can_edit_business_workspace_research(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.business_workspace_memberships where workspace_id=p_workspace_id and user_id=auth.uid() and status='active' and role in ('owner','admin','analyst'))
$$;
revoke all on function public.is_business_workspace_member(uuid),public.can_edit_business_workspace_research(uuid) from public;
grant execute on function public.is_business_workspace_member(uuid),public.can_edit_business_workspace_research(uuid) to authenticated;

create table public.business_research_collections (
  id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  name text not null check(length(name) between 3 and 80),description text not null default '' check(length(description)<=500),
  created_by uuid not null references auth.users(id) on delete cascade,revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(workspace_id,name)
);
create table public.business_research_items (
  id uuid primary key default gen_random_uuid(),collection_id uuid not null references public.business_research_collections(id) on delete cascade,
  instrument_id bigint not null references public.investment_instruments(id),thesis text not null check(length(thesis) between 10 and 1000),
  research_stance text not null default 'watch' check(research_stance in ('watch','positive','neutral','cautious')),
  added_by uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(collection_id,instrument_id)
);
create table public.business_research_events (
  id bigint generated always as identity primary key,workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,event_type text not null check(event_type in ('collection_created','item_upserted','item_removed')),
  evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object' and pg_column_size(evidence)<=1024),occurred_at timestamptz not null default now()
);
create index business_research_collections_workspace on public.business_research_collections(workspace_id,updated_at desc);
create index business_research_items_collection on public.business_research_items(collection_id,updated_at desc);
alter table public.business_research_collections enable row level security;alter table public.business_research_items enable row level security;alter table public.business_research_events enable row level security;
create policy "Members read shared collections" on public.business_research_collections for select to authenticated using(public.is_business_workspace_member(workspace_id));
create policy "Members read shared items" on public.business_research_items for select to authenticated using(exists(select 1 from public.business_research_collections c where c.id=collection_id and public.is_business_workspace_member(c.workspace_id)));
create policy "Members read shared research evidence" on public.business_research_events for select to authenticated using(public.is_business_workspace_member(workspace_id));
revoke all on public.business_research_collections,public.business_research_items,public.business_research_events from anon,authenticated;
grant select on public.business_research_collections,public.business_research_items,public.business_research_events to authenticated;

create or replace function public.prevent_business_research_event_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin if tg_op='DELETE' and not exists(select 1 from public.business_workspaces where id=old.workspace_id) then return old;end if;raise exception 'Business research evidence is append-only';end;
$$;
create trigger business_research_events_append_only before update or delete on public.business_research_events for each row execute function public.prevent_business_research_event_mutation();

create or replace function public.create_business_research_collection(p_workspace_id uuid,p_name text,p_description text default '')
returns public.business_research_collections language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_collection public.business_research_collections;
begin
  if v_user is null or auth.role()<>'authenticated' or not public.can_edit_business_workspace_research(p_workspace_id) then raise exception 'Research editor access required';end if;
  if length(trim(p_name)) not between 3 and 80 or length(trim(coalesce(p_description,'')))>500 then raise exception 'Invalid research collection';end if;
  if (select count(*) from public.business_research_collections where workspace_id=p_workspace_id)>=20 then raise exception 'Workspace research collection limit reached';end if;
  insert into public.business_research_collections(workspace_id,name,description,created_by) values(p_workspace_id,trim(p_name),trim(coalesce(p_description,'')),v_user) returning * into v_collection;
  insert into public.business_research_events(workspace_id,actor_user_id,event_type,evidence) values(p_workspace_id,v_user,'collection_created',jsonb_build_object('collectionId',v_collection.id));return v_collection;
end;
$$;
create or replace function public.upsert_business_research_item(p_collection_id uuid,p_instrument_id bigint,p_thesis text,p_research_stance text default 'watch')
returns public.business_research_items language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_workspace uuid;v_item public.business_research_items;
begin
  select workspace_id into v_workspace from public.business_research_collections where id=p_collection_id;
  if v_user is null or auth.role()<>'authenticated' or v_workspace is null or not public.can_edit_business_workspace_research(v_workspace) then raise exception 'Research editor access required';end if;
  if length(trim(p_thesis)) not between 10 and 1000 or p_research_stance not in ('watch','positive','neutral','cautious') then raise exception 'Invalid research item';end if;
  if not exists(select 1 from public.investment_instruments where id=p_instrument_id and research_enabled) then raise exception 'Research instrument unavailable';end if;
  if not exists(select 1 from public.business_research_items where collection_id=p_collection_id and instrument_id=p_instrument_id) and (select count(*) from public.business_research_items where collection_id=p_collection_id)>=100 then raise exception 'Research collection item limit reached';end if;
  insert into public.business_research_items(collection_id,instrument_id,thesis,research_stance,added_by) values(p_collection_id,p_instrument_id,trim(p_thesis),p_research_stance,v_user)
  on conflict(collection_id,instrument_id) do update set thesis=excluded.thesis,research_stance=excluded.research_stance,added_by=excluded.added_by,updated_at=now() returning * into v_item;
  update public.business_research_collections set revision=revision+1,updated_at=now() where id=p_collection_id;
  insert into public.business_research_events(workspace_id,actor_user_id,event_type,evidence) values(v_workspace,v_user,'item_upserted',jsonb_build_object('collectionId',p_collection_id,'instrumentId',p_instrument_id,'stance',p_research_stance));return v_item;
end;
$$;
revoke all on function public.create_business_research_collection(uuid,text,text),public.upsert_business_research_item(uuid,bigint,text,text) from public;
grant execute on function public.create_business_research_collection(uuid,text,text),public.upsert_business_research_item(uuid,bigint,text,text) to authenticated;

comment on table public.business_research_items is 'Shared, non-personalized research notes. No row can route, recommend or execute a trade.';
