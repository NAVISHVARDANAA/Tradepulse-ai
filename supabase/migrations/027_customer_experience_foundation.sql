-- TradePulse AI
-- Migration 027: unified customer preferences and durable onboarding

alter table public.profiles
  add column if not exists locale text not null default 'en-IN' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  add column if not exists time_zone text not null default 'Asia/Kolkata' check (length(time_zone) between 3 and 64),
  add column if not exists theme_preference text not null default 'system' check (theme_preference in ('system','dark','light')),
  add column if not exists display_density text not null default 'comfortable' check (display_density in ('comfortable','compact')),
  add column if not exists reduced_motion boolean not null default false,
  add column if not exists high_contrast boolean not null default false;

alter table public.academy_onboarding_state
  add column if not exists status text not null default 'not_started' check (status in ('not_started','in_progress','completed','skipped')),
  add column if not exists started_at timestamptz,
  add column if not exists completion_version text;

update public.academy_onboarding_state set
  status=case when completed_at is not null then 'completed' when skipped_at is not null then 'skipped' when current_step>0 then 'in_progress' else 'not_started' end,
  started_at=case when current_step>0 then updated_at else null end,
  completion_version=case when completed_at is not null then tour_version else null end;

create table public.customer_experience_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('preferences_saved','tour_started','tour_completed','tour_skipped','pwa_installed')),
  experience_version text not null default 'experience-v1' check (experience_version ~ '^experience-v[0-9]+$'),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object' and pg_column_size(evidence)<=2048),
  occurred_at timestamptz not null default now()
);
create index customer_experience_events_user_time on public.customer_experience_events(user_id,occurred_at desc);
alter table public.customer_experience_events enable row level security;
create policy "Users read their experience history" on public.customer_experience_events for select to authenticated using(user_id=auth.uid());
revoke all on public.customer_experience_events from anon,authenticated;
grant select on public.customer_experience_events to authenticated;

create or replace function public.prevent_customer_experience_event_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth as $$
begin
  if tg_op='DELETE' and not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
  raise exception 'Customer experience evidence is append-only';
end;
$$;
create trigger customer_experience_events_append_only before update or delete on public.customer_experience_events
for each row execute function public.prevent_customer_experience_event_mutation();

create or replace function public.set_customer_experience_preferences(
  p_display_name text,p_locale text,p_time_zone text,p_theme text,p_density text,p_reduced_motion boolean,p_high_contrast boolean
) returns public.profiles language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_profile public.profiles;
begin
  if v_user is null or auth.role()<>'authenticated' then raise exception 'Authentication required'; end if;
  if p_display_name is not null and (length(trim(p_display_name))<1 or length(trim(p_display_name))>80) then raise exception 'Display name must contain 1 to 80 characters'; end if;
  if p_locale !~ '^[a-z]{2}(-[A-Z]{2})?$' or p_theme not in ('system','dark','light') or p_density not in ('comfortable','compact') then raise exception 'Unsupported experience preference'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_time_zone) then raise exception 'Unsupported time zone'; end if;
  update public.profiles set display_name=nullif(trim(p_display_name),''),locale=p_locale,time_zone=p_time_zone,
    theme_preference=p_theme,display_density=p_density,reduced_motion=coalesce(p_reduced_motion,false),
    high_contrast=coalesce(p_high_contrast,false),updated_at=clock_timestamp() where id=v_user returning * into v_profile;
  insert into public.customer_experience_events(user_id,event_type,evidence)
  values(v_user,'preferences_saved',jsonb_build_object('locale',v_profile.locale,'timeZone',v_profile.time_zone,'theme',v_profile.theme_preference,
    'density',v_profile.display_density,'reducedMotion',v_profile.reduced_motion,'highContrast',v_profile.high_contrast));
  return v_profile;
end;
$$;
revoke all on function public.set_customer_experience_preferences(text,text,text,text,text,boolean,boolean) from public;
grant execute on function public.set_customer_experience_preferences(text,text,text,text,text,boolean,boolean) to authenticated;

create or replace function public.save_customer_onboarding(p_current_step integer,p_status text,p_tour_version text default 'product-tour-v3')
returns public.academy_onboarding_state language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_state public.academy_onboarding_state;v_event text;
begin
  if v_user is null or auth.role()<>'authenticated' then raise exception 'Authentication required'; end if;
  if p_current_step not between 0 and 8 or p_status not in ('in_progress','completed','skipped') or p_tour_version!~'^product-tour-v[0-9]+$' then raise exception 'Invalid onboarding state'; end if;
  insert into public.academy_onboarding_state(user_id,tour_version,current_step,status,started_at,completed_at,skipped_at,completion_version)
  values(v_user,p_tour_version,p_current_step,p_status,clock_timestamp(),case when p_status='completed' then clock_timestamp() end,
    case when p_status='skipped' then clock_timestamp() end,case when p_status='completed' then p_tour_version end)
  on conflict(user_id) do update set tour_version=excluded.tour_version,current_step=greatest(public.academy_onboarding_state.current_step,excluded.current_step),
    status=case when public.academy_onboarding_state.status='completed' then 'completed' else excluded.status end,
    started_at=coalesce(public.academy_onboarding_state.started_at,excluded.started_at),
    completed_at=coalesce(public.academy_onboarding_state.completed_at,excluded.completed_at),
    skipped_at=case when excluded.status='completed' then null else coalesce(public.academy_onboarding_state.skipped_at,excluded.skipped_at) end,
    completion_version=coalesce(public.academy_onboarding_state.completion_version,excluded.completion_version),updated_at=clock_timestamp()
  returning * into v_state;
  v_event:=case p_status when 'completed' then 'tour_completed' when 'skipped' then 'tour_skipped' else 'tour_started' end;
  if not exists(select 1 from public.customer_experience_events where user_id=v_user and event_type=v_event and evidence->>'tourVersion'=p_tour_version) then
    insert into public.customer_experience_events(user_id,event_type,evidence) values(v_user,v_event,jsonb_build_object('tourVersion',p_tour_version,'currentStep',p_current_step));
  end if;
  return v_state;
end;
$$;
revoke all on function public.save_customer_onboarding(integer,text,text) from public;
grant execute on function public.save_customer_onboarding(integer,text,text) to authenticated;

comment on table public.customer_experience_events is 'Private append-only preference and onboarding evidence without device fingerprints or behavioral tracking.';
