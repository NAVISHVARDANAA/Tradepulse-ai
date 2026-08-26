begin;
select plan(30);

select ok(to_regclass('public.data_quality_policies') is not null, 'data-quality policies exist');
select ok(to_regclass('public.data_quality_evaluations') is not null, 'append-only data-quality evidence exists');
select ok(to_regclass('public.data_trust_current') is not null, 'current data-trust view exists');
select ok(to_regclass('public.notification_preferences') is not null, 'notification preferences exist');
select ok(to_regclass('public.notification_consent_events') is not null, 'notification consent history exists');
select is((select count(*) from public.data_quality_policies), 3::bigint, 'three initial datasets are governed');
select ok((select relrowsecurity from pg_class where oid = 'public.data_quality_evaluations'::regclass), 'quality evidence uses RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.notification_preferences'::regclass), 'preferences use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.notification_consent_events'::regclass), 'consent history uses RLS');
select ok(not has_table_privilege('authenticated', 'public.data_quality_evaluations', 'INSERT'), 'browser clients cannot forge quality evidence');
select ok(not has_table_privilege('authenticated', 'public.notification_preferences', 'UPDATE'), 'browser clients cannot bypass preference writer');
select ok(not has_table_privilege('authenticated', 'public.notification_consent_events', 'INSERT'), 'browser clients cannot forge consent history');
select ok(not has_function_privilege('authenticated', 'public.evaluate_data_quality()', 'EXECUTE'), 'browser clients cannot evaluate data quality');
select ok(has_function_privilege('service_role', 'public.evaluate_data_quality()', 'EXECUTE'), 'trusted service can evaluate data quality');
select ok(not has_function_privilege('service_role', 'public.run_data_quality_cron()', 'EXECUTE'), 'service clients cannot impersonate the scheduler');
select is((select count(*) from cron.job where jobname = 'tradepulse-data-quality'), 1::bigint, 'hourly data-quality evaluation is scheduled once');
select ok(has_function_privilege('authenticated', 'public.set_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean)', 'EXECUTE'), 'customers can use bounded preference writer');
select ok(not has_function_privilege('anon', 'public.set_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean)', 'EXECUTE'), 'anonymous users cannot change notifications');
select ok(exists(select 1 from pg_trigger where tgname = 'data_quality_evaluations_append_only' and not tgisinternal), 'quality evidence is append-only');
select ok(exists(select 1 from pg_trigger where tgname = 'notification_consent_events_append_only' and not tgisinternal), 'consent evidence is append-only');
select ok(not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name in ('data_quality_evaluations','notification_consent_events') and column_name ~ '(email|ip|device|token|secret|password|payload)'), 'control evidence stores no direct identity or credentials');
select is((select count(*) from public.notification_preferences where external_delivery_enabled), 0::bigint, 'external delivery is disabled');

select set_config('request.jwt.claim.role', 'service_role', true);
select is(jsonb_array_length(public.evaluate_data_quality() -> 'datasets'), 3, 'service evaluates all governed datasets');
select is((select count(*) from public.data_quality_evaluations), 3::bigint, 'one immutable result is recorded per dataset');
select is((select count(*) from public.data_trust_current), 3::bigint, 'current view exposes one result per dataset');
select ok((select bool_and(status in ('healthy','warning','critical','not_run')) from public.data_trust_current), 'all statuses are bounded');

select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$select public.evaluate_data_quality()$$, 'P0001', 'This operation requires the data-trust service', 'authenticated evaluation fails closed');
select ok(to_regclass('public.brokerage_orders') is null, 'data trust creates no live-order table');
select is((select count(*) from public.broker_provider_registry where live_order_routing_enabled), 0::bigint, 'all broker routes remain disabled');
select is((select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'), false, 'global live execution remains disabled');

select * from finish();
rollback;
