-- TradePulse AI
-- Migration 030: use one timestamp for the complete introductory-trial window

create or replace function public.start_pro_trial()
returns public.customer_subscriptions language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_user uuid := auth.uid();
  v_existing public.customer_subscriptions;
  v_result public.customer_subscriptions;
  v_started_at timestamptz := clock_timestamp();
begin
  if v_user is null or auth.role() <> 'authenticated' then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':commercial-trial', 0));
  select * into v_existing from public.customer_subscriptions where user_id = v_user for update;
  if found and (v_existing.trial_started_at is not null or v_existing.status in ('trialing','active')) then
    raise exception 'The introductory trial is unavailable for this account';
  end if;
  insert into public.customer_subscriptions(user_id, plan_code, status, trial_started_at, trial_ends_at, current_period_ends_at)
  values (v_user, 'pro', 'trialing', v_started_at, v_started_at + interval '14 days', v_started_at + interval '14 days')
  on conflict (user_id) do update set plan_code='pro', status='trialing', trial_started_at=v_started_at,
    trial_ends_at=v_started_at+interval '14 days', current_period_ends_at=v_started_at+interval '14 days',
    subscription_revision=public.customer_subscriptions.subscription_revision+1, updated_at=v_started_at
  returning * into v_result;
  update public.profiles set plan='pro', updated_at=v_started_at where id=v_user;
  insert into public.subscription_events(subscription_id,user_id,event_type,from_plan,to_plan,evidence)
  values(v_result.id,v_user,'trial_started',coalesce(v_existing.plan_code,'free'),'pro',jsonb_build_object('trialDays',14,'checkoutEnabled',false,'chargeCollectionEnabled',false));
  return v_result;
end;
$$;
revoke all on function public.start_pro_trial() from public;
grant execute on function public.start_pro_trial() to authenticated;
