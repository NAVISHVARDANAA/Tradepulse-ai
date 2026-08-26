-- TradePulse AI
-- Migration 032: bounded Business invitations and member administration

create or replace function public.is_business_workspace_admin(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.business_workspace_memberships where workspace_id=p_workspace_id and user_id=auth.uid() and status='active' and role in ('owner','admin'))
$$;
revoke all on function public.is_business_workspace_admin(uuid) from public;
grant execute on function public.is_business_workspace_admin(uuid) to authenticated;

create policy "Workspace admins read memberships" on public.business_workspace_memberships for select to authenticated
using(public.is_business_workspace_admin(workspace_id));

create table public.business_workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  invited_email text not null check (invited_email=lower(trim(invited_email)) and invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(invited_email)<=254),
  role text not null check (role in ('admin','analyst','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),expires_at timestamptz not null default (now()+interval '7 days'),responded_at timestamptz,
  unique(workspace_id,invited_email)
);
create index business_workspace_invitations_email on public.business_workspace_invitations(invited_email,status,expires_at desc);
alter table public.business_workspace_invitations enable row level security;
create policy "Admins read workspace invitations" on public.business_workspace_invitations for select to authenticated using(public.is_business_workspace_admin(workspace_id));
create policy "Invitees read their invitations" on public.business_workspace_invitations for select to authenticated using(invited_email=lower(coalesce(auth.jwt()->>'email','')));
revoke all on public.business_workspace_invitations from anon,authenticated;
grant select on public.business_workspace_invitations to authenticated;

create or replace function public.invite_business_workspace_member(p_workspace_id uuid,p_email text,p_role text)
returns public.business_workspace_invitations language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_email text:=lower(trim(p_email));v_invite public.business_workspace_invitations;v_limit smallint;v_count integer;
begin
  if v_user is null or auth.role()<>'authenticated' then raise exception 'Authentication required';end if;
  if not public.is_business_workspace_admin(p_workspace_id) then raise exception 'Workspace administrator access required';end if;
  if v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email)>254 or p_role not in ('admin','analyst','viewer') then raise exception 'Invalid workspace invitation';end if;
  select seat_limit into v_limit from public.business_workspaces where id=p_workspace_id and status<>'suspended' for update;
  select count(*) into v_count from public.business_workspace_memberships where workspace_id=p_workspace_id and status='active';
  if v_count+(select count(*) from public.business_workspace_invitations where workspace_id=p_workspace_id and status='pending' and expires_at>now())>=v_limit then raise exception 'Workspace seat limit reached';end if;
  insert into public.business_workspace_invitations(workspace_id,invited_email,role,invited_by) values(p_workspace_id,v_email,p_role,v_user)
  on conflict(workspace_id,invited_email) do update set role=excluded.role,status='pending',invited_by=excluded.invited_by,created_at=now(),expires_at=now()+interval '7 days',responded_at=null returning * into v_invite;
  insert into public.business_workspace_events(workspace_id,actor_user_id,event_type,evidence) values(p_workspace_id,v_user,'membership_changed',jsonb_build_object('action','invited','role',p_role));
  return v_invite;
end;
$$;

create or replace function public.accept_business_workspace_invitation(p_invitation_id uuid)
returns public.business_workspace_memberships language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_email text:=lower(coalesce(auth.jwt()->>'email',''));v_invite public.business_workspace_invitations;v_membership public.business_workspace_memberships;v_limit smallint;v_count integer;
begin
  if v_user is null or auth.role()<>'authenticated' or v_email='' then raise exception 'Verified email session required';end if;
  select * into v_invite from public.business_workspace_invitations where id=p_invitation_id for update;
  if not found or v_invite.invited_email<>v_email or v_invite.status<>'pending' or v_invite.expires_at<=now() then raise exception 'Active invitation not found';end if;
  select seat_limit into v_limit from public.business_workspaces where id=v_invite.workspace_id and status<>'suspended' for update;
  select count(*) into v_count from public.business_workspace_memberships where workspace_id=v_invite.workspace_id and status='active';
  if v_count>=v_limit then raise exception 'Workspace seat limit reached';end if;
  insert into public.business_workspace_memberships(workspace_id,user_id,role) values(v_invite.workspace_id,v_user,v_invite.role)
  on conflict(workspace_id,user_id) do update set role=excluded.role,status='active' returning * into v_membership;
  update public.business_workspace_invitations set status='accepted',responded_at=now() where id=v_invite.id;
  insert into public.business_workspace_events(workspace_id,actor_user_id,event_type,evidence) values(v_invite.workspace_id,v_user,'membership_changed',jsonb_build_object('action','accepted','role',v_invite.role));
  return v_membership;
end;
$$;

create or replace function public.remove_business_workspace_member(p_workspace_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_role text;
begin
  if v_user is null or auth.role()<>'authenticated' or not public.is_business_workspace_admin(p_workspace_id) then raise exception 'Workspace administrator access required';end if;
  select role into v_role from public.business_workspace_memberships where workspace_id=p_workspace_id and user_id=p_user_id for update;
  if v_role is null or v_role='owner' then raise exception 'Workspace owner membership is protected';end if;
  update public.business_workspace_memberships set status='suspended' where workspace_id=p_workspace_id and user_id=p_user_id;
  insert into public.business_workspace_events(workspace_id,actor_user_id,event_type,evidence) values(p_workspace_id,v_user,'membership_changed',jsonb_build_object('action','removed','previousRole',v_role));
end;
$$;

revoke all on function public.invite_business_workspace_member(uuid,text,text),public.accept_business_workspace_invitation(uuid),public.remove_business_workspace_member(uuid,uuid) from public;
grant execute on function public.invite_business_workspace_member(uuid,text,text),public.accept_business_workspace_invitation(uuid),public.remove_business_workspace_member(uuid,uuid) to authenticated;

comment on table public.business_workspace_invitations is 'Private in-app invitations matched to a signed-in email. No external email delivery is enabled.';
