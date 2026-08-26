-- TradePulse AI
-- Migration 028: private customer feedback and support intake

create table public.customer_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('bug','product_feedback','data_question','account_help')),
  subject text not null check (length(subject) between 3 and 120),
  message text not null check (length(message) between 10 and 2000),
  customer_rating smallint check (customer_rating between 1 and 5),
  status text not null default 'submitted' check (status in ('submitted','in_review','resolved','closed')),
  support_reference text not null unique check (support_reference ~ '^TP-[A-F0-9]{12}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_support_requests_user_created on public.customer_support_requests(user_id,created_at desc);
alter table public.customer_support_requests enable row level security;
create policy "Customers read their support requests" on public.customer_support_requests
  for select to authenticated using(user_id=auth.uid());
revoke all on public.customer_support_requests from anon,authenticated;
grant select on public.customer_support_requests to authenticated;

create or replace function public.prevent_customer_support_request_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth as $$
begin
  if tg_op='UPDATE' and auth.role()='service_role' then new.updated_at=clock_timestamp();return new; end if;
  if tg_op='DELETE' and not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
  raise exception 'Customer support history is protected';
end;
$$;
create trigger customer_support_requests_protected before update or delete on public.customer_support_requests
for each row execute function public.prevent_customer_support_request_mutation();

create or replace function public.submit_customer_support_request(
  p_request_type text,p_subject text,p_message text,p_customer_rating smallint default null
) returns public.customer_support_requests language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid();v_request public.customer_support_requests;v_reference text;
begin
  if v_user is null or auth.role()<>'authenticated' then raise exception 'Authentication required'; end if;
  if p_request_type not in ('bug','product_feedback','data_question','account_help') then raise exception 'Unsupported support request type'; end if;
  if length(trim(p_subject)) not between 3 and 120 or length(trim(p_message)) not between 10 and 2000 then raise exception 'Support request content is outside allowed limits'; end if;
  if p_customer_rating is not null and p_customer_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if (select count(*) from public.customer_support_requests where user_id=v_user and created_at>now()-interval '1 hour')>=5 then raise exception 'Support request limit reached'; end if;
  v_reference:='TP-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
  insert into public.customer_support_requests(user_id,request_type,subject,message,customer_rating,support_reference)
  values(v_user,p_request_type,trim(p_subject),trim(p_message),p_customer_rating,v_reference) returning * into v_request;
  return v_request;
end;
$$;
revoke all on function public.submit_customer_support_request(text,text,text,smallint) from public;
grant execute on function public.submit_customer_support_request(text,text,text,smallint) to authenticated;

comment on table public.customer_support_requests is 'Private customer-initiated support intake. It stores no attachments, credentials, device fingerprints, provider payloads or trade instructions.';
