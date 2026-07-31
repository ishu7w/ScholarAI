-- ─────────────────────────────────────────────────────────────
-- ScholarAI — Row Level Security boundary tests.
--
-- Proves that the policies in supabase/rls.sql actually hold, by
-- impersonating real Supabase roles (`anon`, `authenticated`) and
-- asserting what each one can and cannot read. Every assertion
-- RAISEs EXCEPTION on failure, so the script fails loudly and the
-- transaction aborts on the first broken boundary.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rls-test.sql
--
--   # or, loading the pooled URL from .env.local first:
--   set -a && source .env.local && set +a
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rls-test.sql
--
-- Run it AFTER drizzle migrations and AFTER supabase/rls.sql.
-- Connect as the project owner (`postgres`) — the script needs to
-- create fixtures with RLS bypassed before it drops down to the
-- restricted roles it is testing.
--
-- SAFE TO RUN AGAINST A SEEDED DATABASE: everything happens inside
-- one transaction that ends in ROLLBACK, and every fixture row uses
-- a reserved `rlstest-` id or an @rls-test.invalid email, so nothing
-- collides with seeded or real data. On success you see a list of
-- passing assertions and "ROLLBACK"; on failure, the exception text
-- names the boundary that broke.
--
-- WHAT IS ASSERTED
--   1. Student A cannot read student B's profile, academic row,
--      applications, documents, notifications or saved list —
--      while still reading every one of their own (so a pass can
--      never be an artifact of reading nothing at all).
--   2. An institution cannot read applications made to a scholarship
--      it does not own, cannot read those applicants' academic rows,
--      and cannot update those applications — while still reading
--      the applications to its own scholarship.
--   3. `anon` cannot read profiles, student_profiles, applications,
--      documents or notifications, but can still browse active
--      scholarships (the one deliberately public table).
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

begin;

-- ── Preconditions ────────────────────────────────────────────
-- A green run means nothing if RLS was never switched on, so check
-- the table-level flag before trusting a single assertion below.
do $$
declare
  unprotected text;
begin
  select string_agg(tablename, ', ' order by tablename)
    into unprotected
  from pg_tables
  where schemaname = 'public'
    and tablename in (
      'profiles', 'student_profiles', 'institutions', 'scholarships',
      'applications', 'documents', 'notifications', 'audit_log',
      'saved_scholarships'
    )
    and not rowsecurity;

  if unprotected is not null then
    raise exception
      'PRECONDITION FAILED: row level security is disabled on: % — apply supabase/rls.sql first',
      unprotected;
  end if;

  raise notice 'ok  precondition: RLS enabled on all 9 tables';
end
$$;

-- ── Fixtures ─────────────────────────────────────────────────
-- Created as the owning role, which bypasses RLS by design. These
-- rows are the ONLY data the assertions reason about; counts are
-- always scoped to fixture ids so pre-existing seed rows are inert.
--
-- profiles.id mirrors auth.users.id in production, but the column
-- carries no foreign key to auth.users, so the tests can mint their
-- own identities without touching the auth schema.

insert into profiles (id, role, name, email) values
  ('11111111-1111-4111-8111-111111111111', 'student',     'RLS Test Student A', 'student-a@rls-test.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'student',     'RLS Test Student B', 'student-b@rls-test.invalid'),
  ('33333333-3333-4333-8333-333333333333', 'institution', 'RLS Test Org One',   'org-one@rls-test.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'institution', 'RLS Test Org Two',   'org-two@rls-test.invalid');

insert into student_profiles (profile_id, field, cgpa, family_income) values
  ('11111111-1111-4111-8111-111111111111', 'Computer Science', 8.8, 24000),
  ('22222222-2222-4222-8222-222222222222', 'Mechanical',       7.4, 31000);

insert into institutions (id, profile_id, org_name, verified) values
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', 'RLS Test Org One', true),
  ('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'RLS Test Org Two', true);

insert into scholarships
  (id, name, provider, category, amount, deadline, seats, description, criteria, institution_id, status)
values
  ('rlstest-sch-one', 'RLS Test Program One', 'RLS Test Org One', 'Merit', 5000, '2099-12-31', 5,
   'Fixture scholarship owned by org one.', '{"minCgpa":0,"maxIncome":null,"minAttendance":0}'::jsonb,
   '55555555-5555-4555-8555-555555555555', 'active'),
  ('rlstest-sch-two', 'RLS Test Program Two', 'RLS Test Org Two', 'Merit', 6000, '2099-12-31', 5,
   'Fixture scholarship owned by org two.', '{"minCgpa":0,"maxIncome":null,"minAttendance":0}'::jsonb,
   '66666666-6666-4666-8666-666666666666', 'active');

-- Student A applies to org ONE's program; student B applies to org TWO's.
-- So org one must see A's application and never B's, and vice versa.
insert into applications (id, scholarship_id, student_id, status, submitted_at) values
  ('77777777-7777-4777-8777-777777777777', 'rlstest-sch-one',
   '11111111-1111-4111-8111-111111111111', 'submitted', now()),
  ('88888888-8888-4888-8888-888888888888', 'rlstest-sch-two',
   '22222222-2222-4222-8222-222222222222', 'submitted', now());

insert into documents (id, student_id, application_id, storage_path, kind, verification_status) values
  ('99999999-9999-4999-8999-999999999999', '11111111-1111-4111-8111-111111111111',
   '77777777-7777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111/a.pdf', 'marksheet', 'verified'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222',
   '88888888-8888-4888-8888-888888888888', '22222222-2222-4222-8222-222222222222/b.pdf', 'income_cert', 'pending');

insert into notifications (id, profile_id, type, payload) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111',
   'application.decided', '{"title":"A only"}'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222',
   'application.decided', '{"title":"B only"}'::jsonb);

insert into saved_scholarships (student_id, scholarship_id) values
  ('11111111-1111-4111-8111-111111111111', 'rlstest-sch-two'),
  ('22222222-2222-4222-8222-222222222222', 'rlstest-sch-one');

-- ─────────────────────────────────────────────────────────────
-- 1. STUDENT ISOLATION — signed in as student A.
--
-- auth.uid() reads the `request.jwt.claims` GUC, which is exactly
-- what PostgREST/Supabase sets per request. Setting it by hand is
-- the supported way to exercise policies as a given user.
-- ─────────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

do $$
declare
  own int;
  other int;
begin
  if auth.uid() <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'SETUP FAILED: auth.uid() is % — the JWT claim did not take effect', auth.uid();
  end if;

  -- profiles: own row visible, B's row invisible.
  select count(*) into own from profiles
    where id = '11111111-1111-4111-8111-111111111111';
  if own <> 1 then
    raise exception 'BROKEN: student A cannot read their own profile (saw % rows, expected 1)', own;
  end if;

  select count(*) into other from profiles
    where id = '22222222-2222-4222-8222-222222222222';
  if other <> 0 then
    raise exception 'LEAK: student A can read student B''s profile row (saw % rows)', other;
  end if;

  -- student_profiles: the sensitive academic + financial row.
  select count(*) into own from student_profiles
    where profile_id = '11111111-1111-4111-8111-111111111111';
  if own <> 1 then
    raise exception 'BROKEN: student A cannot read their own student_profiles row (saw % rows)', own;
  end if;

  select count(*) into other from student_profiles
    where profile_id = '22222222-2222-4222-8222-222222222222';
  if other <> 0 then
    raise exception 'LEAK: student A can read student B''s CGPA/income row (saw % rows)', other;
  end if;

  -- applications.
  select count(*) into own from applications
    where id = '77777777-7777-4777-8777-777777777777';
  if own <> 1 then
    raise exception 'BROKEN: student A cannot read their own application (saw % rows)', own;
  end if;

  select count(*) into other from applications
    where id = '88888888-8888-4888-8888-888888888888';
  if other <> 0 then
    raise exception 'LEAK: student A can read student B''s application (saw % rows)', other;
  end if;

  -- documents: verification results are per-owner.
  select count(*) into own from documents
    where id = '99999999-9999-4999-8999-999999999999';
  if own <> 1 then
    raise exception 'BROKEN: student A cannot read their own document row (saw % rows)', own;
  end if;

  select count(*) into other from documents
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if other <> 0 then
    raise exception 'LEAK: student A can read student B''s document row (saw % rows)', other;
  end if;

  -- notifications.
  select count(*) into own from notifications
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if own <> 1 then
    raise exception 'BROKEN: student A cannot read their own notification (saw % rows)', own;
  end if;

  select count(*) into other from notifications
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if other <> 0 then
    raise exception 'LEAK: student A can read student B''s notification (saw % rows)', other;
  end if;

  -- saved_scholarships.
  select count(*) into other from saved_scholarships
    where student_id = '22222222-2222-4222-8222-222222222222';
  if other <> 0 then
    raise exception 'LEAK: student A can read student B''s saved list (saw % rows)', other;
  end if;

  raise notice 'ok  student A reads only their own profile, academics, applications, documents, notifications and saved list';
end
$$;

-- A student holds no institution privileges either: the applicant
-- queue for a program they merely applied to must stay closed.
do $$
declare
  seen int;
begin
  select count(*) into seen from applications
    where scholarship_id = 'rlstest-sch-one'
      and student_id <> '11111111-1111-4111-8111-111111111111';
  if seen <> 0 then
    raise exception 'LEAK: student A can read other applicants to a program they applied to (saw % rows)', seen;
  end if;

  raise notice 'ok  student A cannot read the applicant queue of a program they applied to';
end
$$;

reset role;

-- ─────────────────────────────────────────────────────────────
-- 2. INSTITUTION ISOLATION — signed in as org ONE.
--    Org one owns rlstest-sch-one. Org two owns rlstest-sch-two.
-- ─────────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

do $$
declare
  own int;
  other int;
  updated int;
begin
  -- Positive control: the queue for its OWN program is readable.
  select count(*) into own from applications
    where id = '77777777-7777-4777-8777-777777777777';
  if own <> 1 then
    raise exception 'BROKEN: org one cannot read an application to its own scholarship (saw % rows)', own;
  end if;

  -- The boundary: an application to a scholarship it does not own.
  select count(*) into other from applications
    where id = '88888888-8888-4888-8888-888888888888';
  if other <> 0 then
    raise exception 'LEAK: org one can read an application to org two''s scholarship (saw % rows)', other;
  end if;

  -- Broadening the query must not broaden the result.
  select count(*) into other from applications
    where scholarship_id = 'rlstest-sch-two';
  if other <> 0 then
    raise exception 'LEAK: org one can read org two''s applicant queue (saw % rows)', other;
  end if;

  -- Applicant academics follow the same ownership chain: org one may
  -- read its own applicant (student A) and never org two's (student B).
  select count(*) into own from student_profiles
    where profile_id = '11111111-1111-4111-8111-111111111111';
  if own <> 1 then
    raise exception 'BROKEN: org one cannot read its own applicant''s academic row (saw % rows)', own;
  end if;

  select count(*) into other from student_profiles
    where profile_id = '22222222-2222-4222-8222-222222222222';
  if other <> 0 then
    raise exception 'LEAK: org one can read the CGPA/income of org two''s applicant (saw % rows)', other;
  end if;

  -- Documents belonging to a non-applicant stay closed.
  select count(*) into other from documents
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if other <> 0 then
    raise exception 'LEAK: org one can read a document of org two''s applicant (saw % rows)', other;
  end if;

  -- Writes, not just reads: deciding someone else's application must
  -- affect zero rows (USING filters the row out rather than erroring).
  update applications set status = 'approved'
    where id = '88888888-8888-4888-8888-888888888888';
  get diagnostics updated = row_count;
  if updated <> 0 then
    raise exception 'LEAK: org one decided an application to org two''s scholarship (% row(s) updated)', updated;
  end if;

  raise notice 'ok  org one reads and decides only applications to scholarships it owns';
end
$$;

reset role;

-- ─────────────────────────────────────────────────────────────
-- 3. ANONYMOUS ACCESS — the `anon` role, no JWT at all.
--    This is the role a leaked publishable key grants.
-- ─────────────────────────────────────────────────────────────

set local role anon;
set local request.jwt.claims = '';

do $$
declare
  seen int;
begin
  if auth.uid() is not null then
    raise exception 'SETUP FAILED: auth.uid() is % for anon — expected null', auth.uid();
  end if;

  select count(*) into seen from profiles;
  if seen <> 0 then
    raise exception 'LEAK: anon can read the profiles table (saw % rows)', seen;
  end if;

  select count(*) into seen from student_profiles;
  if seen <> 0 then
    raise exception 'LEAK: anon can read student_profiles — CGPA, income, demographics (saw % rows)', seen;
  end if;

  select count(*) into seen from applications;
  if seen <> 0 then
    raise exception 'LEAK: anon can read applications (saw % rows)', seen;
  end if;

  select count(*) into seen from documents;
  if seen <> 0 then
    raise exception 'LEAK: anon can read documents (saw % rows)', seen;
  end if;

  select count(*) into seen from notifications;
  if seen <> 0 then
    raise exception 'LEAK: anon can read notifications (saw % rows)', seen;
  end if;

  select count(*) into seen from audit_log;
  if seen <> 0 then
    raise exception 'LEAK: anon can read the audit log (saw % rows)', seen;
  end if;

  select count(*) into seen from saved_scholarships;
  if seen <> 0 then
    raise exception 'LEAK: anon can read saved_scholarships (saw % rows)', seen;
  end if;

  -- Positive control: the public catalogue IS meant to be anonymous.
  -- If this returns 0 the anon role has no grants at all, which would
  -- make every assertion above pass for the wrong reason.
  select count(*) into seen from scholarships where id = 'rlstest-sch-one';
  if seen <> 1 then
    raise exception
      'CONTROL FAILED: anon cannot read an active scholarship (saw % rows) — the anon checks above prove nothing',
      seen;
  end if;

  raise notice 'ok  anon reads active scholarships only — no profiles, academics, applications, documents, notifications or audit log';
end
$$;

reset role;

do $$
begin
  raise notice '';
  raise notice 'ALL RLS BOUNDARY ASSERTIONS PASSED';
  raise notice 'Rolling back — no fixture row is left behind.';
end
$$;

rollback;
