begin;
select plan(25);

select ok(to_regclass('public.customer_experience_events') is not null,'private experience history exists');
select ok((select relrowsecurity from pg_class where oid='public.customer_experience_events'::regclass),'experience history uses RLS');
select ok(exists(select 1 from pg_trigger where tgname='customer_experience_events_append_only' and not tgisinternal),'experience history is append-only');
select ok(not has_table_privilege('authenticated','public.customer_experience_events','INSERT'),'browser cannot forge experience evidence');
select ok(not has_table_privilege('authenticated','public.customer_experience_events','UPDATE'),'browser cannot rewrite experience evidence');
select ok(has_function_privilege('authenticated','public.set_customer_experience_preferences(text,text,text,text,text,boolean,boolean)','EXECUTE'),'authenticated customer may save preferences');
select ok(not has_function_privilege('anon','public.set_customer_experience_preferences(text,text,text,text,text,boolean,boolean)','EXECUTE'),'anonymous preference writes are blocked');
select ok(has_function_privilege('authenticated','public.save_customer_onboarding(integer,text,text)','EXECUTE'),'authenticated customer may save onboarding');
select ok(not has_function_privilege('anon','public.save_customer_onboarding(integer,text,text)','EXECUTE'),'anonymous onboarding writes are blocked');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='locale'),'profile has locale');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='time_zone'),'profile has time zone');
select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='academy_onboarding_state' and column_name='status'),'onboarding has durable status');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)
values('00000000-0000-4000-8000-00000000004f','00000000-0000-0000-0000-000000000000','authenticated','authenticated','phase4o@example.test','',now(),now(),now(),'{}'::jsonb,'{"display_name":"Phase 4O Test"}'::jsonb);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000004f',true);

select is((public.set_customer_experience_preferences('Customer','en-GB','Europe/London','light','compact',true,true)).locale,'en-GB','preferences RPC returns saved locale');
select is((select display_name from public.profiles where id=auth.uid()),'Customer','display name is saved');
select is((select time_zone from public.profiles where id=auth.uid()),'Europe/London','time zone is saved');
select is((select theme_preference from public.profiles where id=auth.uid()),'light','theme is saved');
select ok((select reduced_motion and high_contrast from public.profiles where id=auth.uid()),'accessibility preferences are saved');
select is((select count(*) from public.customer_experience_events where user_id=auth.uid() and event_type='preferences_saved'),1::bigint,'sanitized preference evidence is recorded');
select is((public.save_customer_onboarding(2,'in_progress','product-tour-v3')).status,'in_progress','onboarding progress is saved');
select is((public.save_customer_onboarding(8,'completed','product-tour-v3')).status,'completed','onboarding completion is saved');
select is((select completion_version from public.academy_onboarding_state where user_id=auth.uid()),'product-tour-v3','completion version is durable');
select throws_ok($$select public.save_customer_onboarding(99,'completed','product-tour-v3')$$,'P0001','Invalid onboarding state','invalid onboarding state is rejected');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='customer_experience_events' and column_name ~ '(fingerprint|ip_address|user_agent|device_id|payload)'),'experience history avoids tracking identifiers and raw payloads');
select is((select count(*) from public.broker_provider_registry where live_order_routing_enabled),0::bigint,'live broker routes remain disabled');
select is((select execution_enabled from public.brokerage_execution_controls where control_key='global-live-orders'),false,'global execution remains disabled');

select * from finish();
rollback;
