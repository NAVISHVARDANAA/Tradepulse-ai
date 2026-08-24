begin;

select plan(12);

select ok(to_regclass('public.api_rate_limit_buckets') is not null, 'rate-limit bucket table exists');
select ok(
  to_regprocedure('public.consume_user_api_rate_limit(uuid,text,integer,integer)') is not null,
  'atomic rate-limit function exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.api_rate_limit_buckets'::regclass),
  'rate-limit evidence has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.api_rate_limit_buckets', 'SELECT'),
  'anonymous clients cannot inspect rate-limit evidence'
);
select ok(
  not has_table_privilege('authenticated', 'public.api_rate_limit_buckets', 'SELECT'),
  'signed-in clients cannot inspect rate-limit evidence'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_user_api_rate_limit(uuid,text,integer,integer)',
    'EXECUTE'
  ),
  'browser clients cannot consume or reset allowances directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.consume_user_api_rate_limit(uuid,text,integer,integer)',
    'EXECUTE'
  ),
  'trusted API service can consume allowances'
);

select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select public.consume_user_api_rate_limit('00000000-0000-4000-8000-000000000021', 'paper-order', 2, 60)$$,
  'P0001',
  'This operation requires the trusted API service',
  'anonymous callers are rejected even if database privileges are bypassed'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  public.consume_user_api_rate_limit('00000000-0000-4000-8000-000000000021', 'paper-order', 2, 60) ->> 'allowed',
  'true',
  'first authenticated API request is allowed'
);
select is(
  public.consume_user_api_rate_limit('00000000-0000-4000-8000-000000000021', 'paper-order', 2, 60) ->> 'remaining',
  '0',
  'second request consumes the final allowance'
);
select is(
  public.consume_user_api_rate_limit('00000000-0000-4000-8000-000000000021', 'paper-order', 2, 60) ->> 'allowed',
  'false',
  'request above the allowance is blocked'
);
select is(
  (
    select request_count
    from public.api_rate_limit_buckets
    where user_id = '00000000-0000-4000-8000-000000000021'
      and route_key = 'paper-order'
  ),
  3,
  'concurrent-safe counter records every attempt'
);

select * from finish();

rollback;
