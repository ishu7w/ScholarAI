-- ─────────────────────────────────────────────────────────────
-- ScholarAI — Row Level Security policies.
-- Run AFTER drizzle migrations, in the Supabase SQL editor
-- (or psql "$DATABASE_URL" -f supabase/rls.sql).
-- Server-side code using the service role bypasses RLS by design.
-- ─────────────────────────────────────────────────────────────

alter table profiles            enable row level security;
alter table student_profiles    enable row level security;
alter table institutions        enable row level security;
alter table scholarships        enable row level security;
alter table applications        enable row level security;
alter table documents           enable row level security;
alter table notifications       enable row level security;
alter table audit_log           enable row level security;
alter table saved_scholarships  enable row level security;

-- Helpers -----------------------------------------------------
create or replace function auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role::text from profiles where id = auth.uid()
$$;

create or replace function my_institution_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from institutions where profile_id = auth.uid()
$$;

-- profiles ----------------------------------------------------
create policy "read own profile"    on profiles for select using (id = auth.uid());
create policy "admin reads all"     on profiles for select using (auth_role() = 'admin');
create policy "update own profile"  on profiles for update using (id = auth.uid());
create policy "insert own profile"  on profiles for insert with check (id = auth.uid());

-- student_profiles -------------------------------------------
create policy "student reads own"   on student_profiles for select using (profile_id = auth.uid());
create policy "student updates own" on student_profiles for update using (profile_id = auth.uid());
create policy "student inserts own" on student_profiles for insert with check (profile_id = auth.uid());
create policy "admin reads students" on student_profiles for select using (auth_role() = 'admin');
-- Institutions may read profiles of students who applied to their scholarships
create policy "institution reads applicants" on student_profiles for select using (
  exists (
    select 1 from applications a
    join scholarships s on s.id = a.scholarship_id
    where a.student_id = student_profiles.profile_id
      and s.institution_id in (select my_institution_ids())
      and a.status <> 'draft'
  )
);

-- institutions ------------------------------------------------
create policy "own institution"     on institutions for select using (profile_id = auth.uid());
create policy "admin reads inst"    on institutions for select using (auth_role() = 'admin');
create policy "insert own inst"     on institutions for insert with check (profile_id = auth.uid());

-- scholarships ------------------------------------------------
create policy "anyone reads active" on scholarships for select using (status = 'active');
create policy "owner reads own"     on scholarships for select using (institution_id in (select my_institution_ids()));
create policy "admin reads all sch" on scholarships for select using (auth_role() = 'admin');
create policy "owner writes own"    on scholarships for insert with check (institution_id in (select my_institution_ids()));
create policy "owner updates own"   on scholarships for update using (institution_id in (select my_institution_ids()));

-- applications ------------------------------------------------
create policy "student reads own apps"  on applications for select using (student_id = auth.uid());
create policy "student creates own app" on applications for insert with check (student_id = auth.uid());
create policy "student updates draft"   on applications for update using (student_id = auth.uid() and status = 'draft');
create policy "institution reads apps"  on applications for select using (
  scholarship_id in (select id from scholarships where institution_id in (select my_institution_ids()))
  and status <> 'draft'
);
create policy "institution decides"     on applications for update using (
  scholarship_id in (select id from scholarships where institution_id in (select my_institution_ids()))
  and status <> 'draft'
);
create policy "admin reads apps"        on applications for select using (auth_role() = 'admin');

-- documents ---------------------------------------------------
create policy "student owns docs"   on documents for select using (student_id = auth.uid());
create policy "student adds docs"   on documents for insert with check (student_id = auth.uid());
-- Institutions see verification results for applicants' docs, not raw files
create policy "institution reads doc status" on documents for select using (
  application_id in (
    select a.id from applications a
    join scholarships s on s.id = a.scholarship_id
    where s.institution_id in (select my_institution_ids()) and a.status <> 'draft'
  )
);
create policy "admin reads docs"    on documents for select using (auth_role() = 'admin');

-- notifications ----------------------------------------------
create policy "own notifications"     on notifications for select using (profile_id = auth.uid());
create policy "mark own read"         on notifications for update using (profile_id = auth.uid());

-- audit_log ---------------------------------------------------
create policy "admin reads audit"   on audit_log for select using (auth_role() = 'admin');
create policy "institution reads own audit" on audit_log for select using (actor_id = auth.uid());

-- saved_scholarships -----------------------------------------
create policy "own saved"           on saved_scholarships for select using (student_id = auth.uid());
create policy "save own"            on saved_scholarships for insert with check (student_id = auth.uid());
create policy "unsave own"          on saved_scholarships for delete using (student_id = auth.uid());
