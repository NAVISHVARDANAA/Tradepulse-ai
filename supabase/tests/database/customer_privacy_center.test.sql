begin;
select plan(20);

select ok(to_regclass('public.customer_privacy_preferences') is not null, 'privacy preferences exist');
select ok(to_regclass('public.customer_privacy_requests') is not null, 'privacy request queue exists');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_privacy_preferences'::regclass), 'preferences use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.customer_privacy_requests'::regclass), 'requests use RLS');
select ok(not has_table_privilege('anon', 'public.customer_privacy_requests', 'SELECT'), 'anonymous users cannot read requests');
select ok(not has_table_privilege('authenticated', 'public.customer_privacy_requests', 'INSERT'), 'browser users cannot forge requests');
select ok(not has_table_privilege('authenticated', 'public.customer_privacy_requests', 'UPDATE'), 'browser users cannot advance request status');
select ok(not has_table_privilege('authenticated', 'public.customer_privacy_preferences', 'UPDATE'), 'browser users cannot forge policy evidence');
select ok(has_function_privilege('authenticated', 'public.set_customer_privacy_preferences(boolean,boolean)', 'EXECUTE'), 'authenticated users can set bounded preferences');
select ok(has_function_privilege('authenticated', 'public.request_customer_privacy_action(text)', 'EXECUTE'), 'authenticated users can use protected request function');
select ok(not has_function_privilege('anon', 'public.request_customer_privacy_action(text)', 'EXECUTE'), 'anonymous users cannot request data actions');
select ok(has_function_privilege('authenticated', 'public.cancel_customer_deletion_request(uuid)', 'EXECUTE'), 'authenticated users can cancel pending deletion');
select ok(not has_function_privilege('anon', 'public.cancel_customer_deletion_request(uuid)', 'EXECUTE'), 'anonymous users cannot cancel requests');
select ok(exists(select 1 from pg_indexes where indexname = 'customer_privacy_requests_one_active_type' and indexdef like '%UNIQUE%'), 'active requests are idempotent');
select ok(not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name like 'customer_privacy%' and column_name ~ '(email|ip|device|token|secret|password)'), 'privacy tables contain no direct identity or credential evidence');
select ok(exists(select 1 from pg_policies where tablename = 'customer_privacy_requests' and policyname = 'Users read their privacy requests'), 'users have isolated request reads');
select ok(exists(select 1 from pg_policies where tablename = 'customer_privacy_preferences' and policyname = 'Users update their privacy preferences'), 'users control their optional preferences');
select ok(to_regclass('public.brokerage_orders') is null, 'privacy work creates no live brokerage order table');
select is((select count(*) from public.broker_provider_registry where live_order_routing_enabled), 0::bigint, 'broker routes remain disabled');
select is((select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'), false, 'global execution remains disabled');

select * from finish();
rollback;
