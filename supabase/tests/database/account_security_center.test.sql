begin;

select plan(40);

select ok(to_regclass('public.account_security_posture') is not null, 'account security posture exists');
select ok(to_regclass('public.account_security_events') is not null, 'account security event history exists');
select ok(
  to_regprocedure('public.sync_account_security_posture(uuid,integer,text[],text,text)') is not null,
  'service-only posture synchronization exists'
);
select ok(
  to_regprocedure('public.record_account_session_action(uuid,text)') is not null,
  'service-only session action recorder exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.account_security_posture'::regclass),
  'account security posture has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.account_security_events'::regclass),
  'account security history has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.account_security_posture', 'SELECT'),
  'anonymous clients cannot read account posture'
);
select ok(
  not has_table_privilege('anon', 'public.account_security_events', 'SELECT'),
  'anonymous clients cannot read security history'
);
select ok(
  has_table_privilege('authenticated', 'public.account_security_posture', 'SELECT'),
  'signed-in customers can read their RLS-scoped posture'
);
select ok(
  has_table_privilege('authenticated', 'public.account_security_events', 'SELECT'),
  'signed-in customers can read their RLS-scoped history'
);
select ok(
  not has_table_privilege('authenticated', 'public.account_security_posture', 'INSERT'),
  'browser clients cannot forge account posture'
);
select ok(
  not has_table_privilege('authenticated', 'public.account_security_events', 'INSERT'),
  'browser clients cannot forge security events'
);
select ok(
  not has_table_privilege('authenticated', 'public.account_security_posture', 'UPDATE'),
  'browser clients cannot downgrade account posture'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.sync_account_security_posture(uuid,integer,text[],text,text)',
    'EXECUTE'
  ),
  'browser clients cannot invoke posture synchronization'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_account_session_action(uuid,text)',
    'EXECUTE'
  ),
  'browser clients cannot record session actions'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.sync_account_security_posture(uuid,integer,text[],text,text)',
    'EXECUTE'
  ),
  'trusted security service can synchronize posture'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_account_session_action(uuid,text)',
    'EXECUTE'
  ),
  'trusted security service can record completed session actions'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.account_security_events'::regclass
      and tgname = 'account_security_events_append_only'
      and not tgisinternal
  ),
  'security history has an append-only trigger'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000004b',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'phase4k@example.test',
  '',
  now(),
  now(),
  now(),
  '{}'::jsonb,
  '{"display_name":"Phase 4K Test"}'::jsonb
);

select ok(
  exists (
    select 1 from public.account_security_posture
    where user_id = '00000000-0000-4000-8000-00000000004b'
  ),
  'new customer receives a default account security posture'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.sync_account_security_posture(
    '00000000-0000-4000-8000-00000000004b', 1, array['totp'], 'aal1', 'aal2'
  )$$,
  'P0001',
  'This operation requires the trusted account security service',
  'browser callers are rejected even if privileges are bypassed'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  public.sync_account_security_posture(
    '00000000-0000-4000-8000-00000000004b', 1, array['totp'], 'aal1', 'aal2'
  ) ->> 'securityState',
  'step_up_required',
  'enrolled aal1 session is marked for step-up'
);
select is(
  (select verified_factor_count from public.account_security_posture where user_id = '00000000-0000-4000-8000-00000000004b'),
  1::smallint,
  'verified factor count is synchronized'
);
select is(
  (select verified_factor_types from public.account_security_posture where user_id = '00000000-0000-4000-8000-00000000004b'),
  array['totp']::text[],
  'only the verified factor type is retained'
);
select is(
  (select posture_revision from public.account_security_posture where user_id = '00000000-0000-4000-8000-00000000004b'),
  2::bigint,
  'material posture change advances the revision'
);
select is(
  (select count(*) from public.account_security_events where user_id = '00000000-0000-4000-8000-00000000004b'),
  3::bigint,
  'initialization, MFA enrollment and required step-up create separate evidence'
);

select is(
  public.sync_account_security_posture(
    '00000000-0000-4000-8000-00000000004b', 1, array['totp'], 'aal2', 'aal2'
  ) ->> 'securityState',
  'verified',
  'successful step-up produces verified posture'
);
select is(
  (select posture_revision from public.account_security_posture where user_id = '00000000-0000-4000-8000-00000000004b'),
  3::bigint,
  'verified step-up advances the posture revision'
);
select ok(
  (select last_step_up_at is not null from public.account_security_posture where user_id = '00000000-0000-4000-8000-00000000004b'),
  'verified step-up records its time'
);
select ok(
  exists (
    select 1 from public.account_security_events
    where user_id = '00000000-0000-4000-8000-00000000004b'
      and event_type = 'step_up_verified'
  ),
  'verified step-up creates append-only evidence'
);
select is(
  public.record_account_session_action(
    '00000000-0000-4000-8000-00000000004b', 'other_sessions_revoked'
  ) ->> 'recorded',
  'true',
  'successful other-session revocation is recorded'
);
select ok(
  exists (
    select 1 from public.account_security_events
    where user_id = '00000000-0000-4000-8000-00000000004b'
      and event_type = 'other_sessions_revoked'
  ),
  'session revocation appears in customer security history'
);
select ok(
  not exists (
    select 1 from public.account_security_events
    where lower(evidence::text) ~ 'token|secret|code|email|ip|device'
  ),
  'security evidence excludes identity, credential and device material'
);
select throws_ok(
  $$select public.sync_account_security_posture(
    '00000000-0000-4000-8000-00000000004b', 1, array['webauthn'], 'aal1', 'aal2'
  )$$,
  'P0001',
  'Invalid account security posture',
  'unknown factor types are rejected'
);
select throws_ok(
  $$update public.account_security_events set summary = 'changed' where user_id = '00000000-0000-4000-8000-00000000004b'$$,
  'P0001',
  'Account security evidence is append-only',
  'security evidence cannot be edited'
);
select throws_ok(
  $$delete from public.account_security_events where user_id = '00000000-0000-4000-8000-00000000004b'$$,
  'P0001',
  'Account security evidence is append-only',
  'security evidence cannot be directly deleted'
);
select is(
  (select count(*) from public.investment_instruments where live_execution_enabled),
  0::bigint,
  'live instrument execution remains disabled'
);
select is(
  (select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'),
  false,
  'live broker order routing remains disabled'
);
select lives_ok(
  $$delete from auth.users where id = '00000000-0000-4000-8000-00000000004b'$$,
  'account deletion can cascade through private security evidence'
);
select is(
  (select count(*) from public.account_security_posture where user_id = '00000000-0000-4000-8000-00000000004b'),
  0::bigint,
  'account deletion removes private posture'
);
select is(
  (select count(*) from public.account_security_events where user_id = '00000000-0000-4000-8000-00000000004b'),
  0::bigint,
  'account deletion removes private security history'
);

select * from finish();

rollback;
