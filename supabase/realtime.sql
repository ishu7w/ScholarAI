-- ─────────────────────────────────────────────────────────────
-- ScholarAI — Phase 6: enable Postgres CDC (Supabase Realtime).
-- Run AFTER drizzle migrations and AFTER supabase/rls.sql, in the
-- Supabase SQL editor (or psql "$DATABASE_URL" -f supabase/realtime.sql).
--
-- Safe to re-run: every statement is guarded, so applying this on a
-- project that is already streaming is a no-op rather than an error
-- ("relation is already member of publication").
--
-- ── RLS still governs what each subscriber receives ──────────
-- Adding a table to the `supabase_realtime` publication only makes its
-- changes *available* on the wire. It does NOT bypass Row Level Security.
-- Realtime authorises every change against the subscriber's JWT using the
-- SELECT policies in supabase/rls.sql, per row, before delivering it:
--
--   * notifications → "own notifications" (profile_id = auth.uid()), so a
--     student's bell can only ever be told about their own rows.
--   * applications  → "student reads own apps" (student_id = auth.uid()),
--     "institution reads apps" (application is against one of the
--     caller's scholarships and status <> 'draft'), "admin reads apps".
--     An institution therefore never sees another institution's queue,
--     and nobody sees anyone's drafts.
--
-- The client-side `filter:` strings (profile_id=eq.…, student_id=eq.…) are
-- a bandwidth optimisation on top of that, not the security boundary. If a
-- client asked for an unscoped stream it would still receive only the rows
-- its policies allow. Consequence to keep in mind: loosening an RLS SELECT
-- policy also widens what realtime broadcasts.
-- ─────────────────────────────────────────────────────────────

-- The publication ships with Supabase projects; create it if this is a
-- plain Postgres/self-hosted target so the adds below have a target.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end
$$;

-- notifications — drives the header bell (unread count + feed).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- applications — drives the institution approval queue (new submissions
-- appear live) and the student dashboard (decisions land live).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;
end
$$;

-- UPDATE/DELETE events carry only the primary key in `old` by default.
-- REPLICA IDENTITY FULL ships the whole previous row, which is what lets a
-- subscriber tell a status transition (submitted → approved) from an
-- unrelated column edit. Both tables are low-volume, so the extra WAL is
-- cheap; idempotent because setting the same identity twice is harmless.
alter table public.notifications replica identity full;
alter table public.applications  replica identity full;

-- Verify what is being published:
--   select schemaname, tablename
--   from pg_publication_tables
--   where pubname = 'supabase_realtime'
--   order by tablename;
