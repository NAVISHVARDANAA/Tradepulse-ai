begin;

select plan(35);

select ok(to_regclass('public.academy_courses') is not null, 'academy course catalog exists');
select ok(to_regclass('public.academy_lessons') is not null, 'academy lessons exist');
select ok(to_regclass('public.academy_quiz_questions') is not null, 'academy quiz bank exists');
select ok(to_regclass('public.academy_lesson_progress') is not null, 'private lesson progress exists');
select ok(to_regclass('public.academy_onboarding_state') is not null, 'guided onboarding state exists');
select ok(to_regclass('public.academy_course_completions') is not null, 'certificate-ready completions exist');
select ok(to_regclass('public.academy_catalog') is not null, 'public academy catalog view exists');
select ok(to_regclass('public.academy_quiz_questions_public') is not null, 'safe public quiz view exists');

select ok(
  to_regprocedure('public.grade_academy_quiz(text,jsonb)') is not null,
  'server-side quiz grading function exists'
);

select cmp_ok((select count(*) from public.academy_courses where published), '>=', 5::bigint, 'at least five launch courses are published');
select cmp_ok((select count(*) from public.academy_lessons where published), '>=', 15::bigint, 'at least fifteen launch lessons are published');
select cmp_ok((select count(*) from public.academy_quiz_questions), '>=', 15::bigint, 'every launch phase contributes knowledge checks');
select is(
  (select count(*) from public.academy_courses where access_tier <> 'free'),
  0::bigint,
  'all essential launch courses are free'
);

select is(
  (
    select min(lesson_count)
    from (
      select course_slug, count(*) as lesson_count
      from public.academy_lessons
      where published
      group by course_slug
    ) counts
  ),
  3::bigint,
  'every launch course has three lessons'
);

select ok(
  not exists (
    select 1 from public.academy_courses
    where jsonb_typeof(learning_objectives) <> 'array'
  ),
  'course objectives use a structured array'
);

select ok(
  not exists (
    select 1 from public.academy_lessons
    where jsonb_typeof(content) <> 'array' or jsonb_array_length(content) = 0
  ),
  'every lesson has structured learning content'
);

select ok(
  not exists (
    select 1
    from public.academy_quiz_questions
    where correct_option >= jsonb_array_length(options)
  ),
  'every quiz answer index resolves to an option'
);

select ok((select relrowsecurity from pg_class where oid = 'public.academy_courses'::regclass), 'courses have row-level security');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_lessons'::regclass), 'lessons have row-level security');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_quiz_questions'::regclass), 'quiz answers have row-level security');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_lesson_progress'::regclass), 'lesson progress has row-level security');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_onboarding_state'::regclass), 'onboarding state has row-level security');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_course_completions'::regclass), 'course completions have row-level security');

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academy_courses' and policyname = 'Everyone reads published academy courses'),
  'only published courses are publicly readable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academy_lessons' and policyname = 'Everyone reads published academy lessons'),
  'only published lessons are publicly readable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academy_lesson_progress' and policyname = 'Users read their academy progress'),
  'users read only their progress'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academy_onboarding_state' and policyname = 'Users manage their onboarding state'),
  'users manage only their onboarding state'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academy_course_completions' and policyname = 'Users read their course completions'),
  'users can read only their issued completions'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academy_quiz_questions_public'
      and column_name in ('correct_option', 'explanation')
  ),
  'the public quiz view does not reveal answers or explanations'
);

select ok(
  not has_table_privilege('authenticated', 'public.academy_course_completions', 'INSERT'),
  'browser clients cannot issue course completions'
);

select ok(
  has_table_privilege('anon', 'public.academy_catalog', 'SELECT'),
  'guests can read the Academy catalog'
);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'academy_lesson_progress'
  ),
  'signed-in progress can update through realtime'
);

select ok(
  coalesce(
    (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.academy_catalog'::regclass),
    false
  ),
  'catalog view preserves published-content policies'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'academy_course_completions'
      and indexdef like '%verification_code%'
      and indexdef like '%UNIQUE%'
  ),
  'future certificate verification codes are unique'
);

select ok(
  not has_table_privilege('anon', 'public.academy_quiz_questions', 'SELECT'),
  'guests cannot read the protected answer bank directly'
);

select * from finish();

rollback;
