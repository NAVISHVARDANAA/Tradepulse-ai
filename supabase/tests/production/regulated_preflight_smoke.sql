do $$
begin
  if to_regclass('public.brokerage_preflight_controls') is null
    or to_regclass('public.brokerage_preflight_reviews') is null then
    raise exception 'Regulated preflight schema is incomplete';
  end if;

  if (select count(*) from public.brokerage_preflight_controls) <> 1 then
    raise exception 'Exactly one regulated preflight control must exist';
  end if;

  if exists (
    select 1 from public.brokerage_preflight_controls
    where control_key <> 'regulated-preflight'
      or not preflight_enabled
      or order_submission_enabled
      or market_session_verification_enabled
      or fee_schedule_enabled
      or risk_capacity_approval_enabled
      or policy_version <> 'regulated-preflight-v1'
  ) then
    raise exception 'Regulated preflight controls violate the Phase 6A boundary';
  end if;

  if exists (
    select 1 from public.brokerage_preflight_reviews
    where executable
      or review_status <> 'blocked'
      or market_session_status <> 'not_verified'
      or cost_status <> 'unavailable'
      or risk_status <> 'review_required'
      or jsonb_typeof(block_reasons) <> 'array'
      or jsonb_array_length(block_reasons) = 0
  ) then
    raise exception 'A regulated preflight review violates fail-closed invariants';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_preflight_controls'::regclass
      and pg_get_constraintdef(oid) ilike '%not order_submission_enabled%'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_preflight_reviews'::regclass
      and pg_get_constraintdef(oid) ilike '%not executable%'
  ) then
    raise exception 'Database-enforced preflight locks are missing';
  end if;

  if to_regclass('public.brokerage_orders') is not null or exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public' and procedure.proname like '%submit%broker%order%'
  ) then
    raise exception 'A live brokerage order path unexpectedly exists';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.brokerage_preflight_reviews'::regclass) then
    raise exception 'Preflight review RLS is disabled';
  end if;

  if has_table_privilege('authenticated', 'public.brokerage_preflight_reviews', 'INSERT')
    or has_table_privilege('authenticated', 'public.brokerage_preflight_reviews', 'UPDATE')
    or has_table_privilege('anon', 'public.brokerage_preflight_reviews', 'SELECT')
    or has_function_privilege(
      'authenticated',
      'public.persist_regulated_preflight_review(uuid,uuid,bigint,text,text,numeric,numeric,numeric,timestamptz,numeric,text,text,text,text,text,jsonb,jsonb,jsonb,text,timestamptz)',
      'EXECUTE'
    ) then
    raise exception 'A browser role can forge or expose regulated preflight evidence';
  end if;
end;
$$;
