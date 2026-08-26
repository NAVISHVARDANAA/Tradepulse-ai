-- TradePulse AI
-- Migration 029: generate support references with the platform UUID primitive

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
  v_reference:='TP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.customer_support_requests(user_id,request_type,subject,message,customer_rating,support_reference)
  values(v_user,p_request_type,trim(p_subject),trim(p_message),p_customer_rating,v_reference) returning * into v_request;
  return v_request;
end;
$$;
revoke all on function public.submit_customer_support_request(text,text,text,smallint) from public;
grant execute on function public.submit_customer_support_request(text,text,text,smallint) to authenticated;
