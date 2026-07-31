# Deploying ScholarAI

Target: **Vercel** (Next.js 16 App Router) + **Supabase** (Postgres, Auth, Storage, Realtime).

Demo mode needs none of this — it deploys as a static-ish Next app with zero environment variables and works immediately. Everything below is for **live mode**.

Estimated time for a first run: 20–30 minutes, most of it waiting on Supabase provisioning.

---

## 1. Create the Supabase project

1. At [supabase.com/dashboard](https://supabase.com/dashboard), **New project**.
2. Pick a region close to your Vercel deployment region — every server action makes a round trip, and a cross-continent pairing is felt on every page.
3. Set a database password and **save it somewhere immediately**. You need it for `DATABASE_URL`, and Supabase will not show it again. If you lose it, see [Resetting the database password](#resetting-the-database-password).
4. Wait for provisioning to finish before continuing. A project that is still spinning up will refuse connections in a way that looks like a credentials error.

### Collect the four values

**Project Settings → API**

- `NEXT_PUBLIC_SUPABASE_URL` — the Project URL, e.g. `https://abcdefgh.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — see the warning below about which key this is
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` / secret key

**Project Settings → Database → Connection string → URI**, and choose the **pooled** connection (Transaction mode, port `6543`):

- `DATABASE_URL` — e.g. `postgresql://postgres.abcdefgh:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`

> **New Supabase projects hand you a `sb_publishable_...` key, not a JWT.** Supabase's newer API-key scheme replaced the legacy `eyJ...` anon JWT with keys shaped `sb_publishable_...` (public) and `sb_secret_...` (server). The publishable key is what belongs in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. It looks nothing like the JWT in most tutorials, and it is easy to conclude you are on the wrong screen and go hunting for a legacy key that a new project may not expose at all. Use the publishable key; `@supabase/ssr` accepts it exactly where the anon key used to go.

> **URL-encode special characters in the database password.** `DATABASE_URL` is a URI, so a password containing `@`, `#`, `/`, `?`, `:` or `%` breaks parsing. `@` in particular splits the userinfo from the host, and the failure surfaces as a hostname or authentication error that points nowhere near the real cause. Encode it: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `?` → `%3F`, `:` → `%3A`, `%` → `%25`. A password of `p@ss/word` becomes `p%40ss%2Fword`. `npm run verify:deploy` reports `DATABASE_URL format: unparseable` when this is wrong.

### Local `.env.local`

```bash
cp .env.example .env.local
```

Fill in the four values. `.env*` is gitignored — keep it that way.

---

## 2. Migrate the schema

```bash
set -a && source .env.local && set +a

npm run db:generate   # ONLY if you changed src/lib/db/schema.ts
npm run db:migrate
```

`db:generate` writes a new SQL migration into `drizzle/` from `src/lib/db/schema.ts`. The repo already ships `drizzle/0000_quick_wind_dancer.sql`, so on a clean checkout you skip straight to `db:migrate`. Running `db:generate` unnecessarily creates an empty migration that clutters history.

`db:migrate` applies everything in `drizzle/` and creates nine tables: `profiles`, `student_profiles`, `institutions`, `scholarships`, `applications`, `documents`, `notifications`, `audit_log`, `saved_scholarships`.

`drizzle.config.ts` reads `DATABASE_URL` from the environment, which is why the `source` line above matters — drizzle-kit does not read `.env.local` on its own.

---

## 3. Apply Row Level Security

Migrations create tables. They do **not** enable RLS. Until you run this step every table is wide open to anyone holding the publishable key, which ships to the browser.

```bash
psql "$DATABASE_URL" -f supabase/rls.sql
```

No `psql`? Paste the contents of `supabase/rls.sql` into the Supabase dashboard **SQL Editor** and run it.

This enables `row level security` on all nine tables and installs the policies: students reach only their own rows, institutions reach only applications to scholarships they own, admins read broadly, and `anon` gets nothing but active scholarships.

Verify the boundaries actually hold:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rls-test.sql
```

That script creates throwaway fixtures, impersonates the `anon` and `authenticated` roles, asserts each boundary, and rolls back. It raises an exception on the first violation, so a silent pass is a real pass.

### Optional: realtime

```bash
psql "$DATABASE_URL" -f supabase/realtime.sql
```

Adds `notifications` and `applications` to the `supabase_realtime` publication so the notification bell and the institution queue update without a refresh. Skip it and the app still works — the bell falls back to a 30-second poll. The script is guarded and safe to re-run.

---

## 4. Seed

```bash
npm run db:seed
```

Inserts the 12 scholarships from `src/lib/data.ts` (upsert by slug id, so re-running is safe) and, when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both present, creates three pre-confirmed demo accounts:

| Email | Role |
|---|---|
| `student@demo.scholarai.app` | student |
| `institution@demo.scholarai.app` | institution |
| `admin@demo.scholarai.app` | admin |

Password for all three: `scholarai-demo`

Without the service-role key the script seeds scholarships only and prints that it skipped the accounts. Creating auth users is not an anon-key operation.

**These are publicly documented credentials.** Delete or re-password them before any deployment that real users can reach.

---

## 5. Verify before you deploy

```bash
npm run verify:deploy
```

Checks env vars are present, the connection string is the pooler, the database is reachable, all nine tables exist, `pg_tables.rowsecurity` is true on each, at least 12 scholarships are seeded, and at least one profile exists. Exits non-zero on any failure.

A green run looks like this:

```
ScholarAI — deployment readiness

  PASS  env NEXT_PUBLIC_SUPABASE_URL       set (public)
  PASS  env NEXT_PUBLIC_SUPABASE_ANON_KEY  set (public)
  PASS  env SUPABASE_SERVICE_ROLE_KEY      set (server-only)
  PASS  env DATABASE_URL                   set (server-only)
  PASS  env ANTHROPIC_API_KEY              set (server-only)
  PASS  DATABASE_URL format                pooler aws-1-ap-south-1.pooler.supabase.com:6543
  PASS  database reachable                 connected
  PASS  schema: 9 tables                   all present (9/9)
  PASS  RLS enabled on all tables          rowsecurity = true everywhere
  PASS  scholarships seeded                12 rows (expected at least 12)
  PASS  profiles exist                     4 profile row(s)

All 11 required check(s) passed. Ready to deploy.
```

`ANTHROPIC_API_KEY` is advisory — `WARN` there is a supported configuration, not a failure.

---

## 6. Import to Vercel

1. Push the repo to GitHub/GitLab/Bitbucket.
2. [vercel.com/new](https://vercel.com/new) → import the repository.
3. Framework preset is detected as Next.js. Build command, output directory and install command all stay at their defaults — this project needs no overrides.
4. **Do not deploy yet.** Add the environment variables first (next step), otherwise the first build produces a demo-mode deployment and you will need to redeploy anyway.

---

## 7. Set environment variables on Vercel

**Project Settings → Environment Variables.** Add each to Production, Preview and Development unless you deliberately want previews on a separate database.

| Variable | Exposure | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **public** — ships to the browser | required for live mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **public** — ships to the browser | the `sb_publishable_...` key; safe to expose only because RLS is on |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | bypasses RLS entirely |
| `DATABASE_URL` | **server-only** | pooled URI, port 6543, password URL-encoded |
| `ANTHROPIC_API_KEY` | **server-only** | optional |

Anything prefixed `NEXT_PUBLIC_` is inlined into the client bundle at build time and is readable by anyone who loads the page. The bottom three must never carry that prefix. `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix would publish a key that ignores every RLS policy in `supabase/rls.sql`.

Environment variables are read at build time for client bundles. After changing any `NEXT_PUBLIC_` value you must **redeploy** — restarting is not enough.

Then deploy.

---

## 8. Post-deploy smoke checklist

Work through this against the deployed URL, not localhost.

**Mode**
- [ ] The landing page loads and the notification bell renders in the dashboard shell.
- [ ] `/login` shows the sign-in form. If credentials are silently accepted without a Supabase round trip, you are in demo mode — the env vars did not reach the build.

**Auth and role routing**
- [ ] Sign in as `student@demo.scholarai.app` → lands on `/dashboard/student`.
- [ ] Sign in as `institution@demo.scholarai.app` → lands on `/dashboard/institution`.
- [ ] Sign in as `admin@demo.scholarai.app` → lands on `/dashboard/admin`.
- [ ] While signed in as the student, visiting `/dashboard/admin` redirects back to `/dashboard/student`.
- [ ] Signed out, visiting `/dashboard/student` redirects to `/login?next=/dashboard/student`.
- [ ] Sign out works and the session does not survive a reload.

**Student flow**
- [ ] `/scholarships` lists 12 programs with match scores and eligibility explanations.
- [ ] Opening a program shows why-selected / why-rejected / how-to-improve and the fairness note.
- [ ] Editing the profile at `/dashboard/student/profile` saves and the dashboard score moves.
- [ ] Applying to a program succeeds, and re-applying is refused.
- [ ] `/dashboard/student/documents` accepts a small text-based PDF and returns a verification status. A 503 with a storage message means the service-role key is missing.

**Institution flow**
- [ ] The applicant queue shows the student's application with a **frozen** snapshot score.
- [ ] Approve or reject writes the decision and it survives a reload.
- [ ] Creating a scholarship works and it appears in `/scholarships`.

**Notification loop**
- [ ] After the institution decides, the student's bell shows the notification (instantly with `realtime.sql` applied, within 30s otherwise).

**Admin**
- [ ] `/dashboard/admin` aggregates are non-zero and consistent with what you just did.
- [ ] `/dashboard/admin/audit` shows rows for the submit and the decision.
- [ ] The scoring registry lists the ten weights.

**Isolation** (the one worth doing manually)
- [ ] Register a second student, apply to a different program, and confirm neither student's dashboard shows any trace of the other.

**Housekeeping**
- [ ] Demo accounts deleted or re-passworded if the deployment is public.
- [ ] `npm run verify:deploy` still green against the production `DATABASE_URL`.

---

## Troubleshooting

These are the problems actually hit while building and deploying this project, not a generic list.

### `DATABASE_URL` password with special characters

**Symptom:** `getaddrinfo ENOTFOUND`, a hostname that is clearly a fragment of your password, `SASL: SCRAM-SERVER-FIRST-MESSAGE`, or `verify:deploy` reporting `DATABASE_URL format: unparseable`.

**Cause:** `DATABASE_URL` is a URI. An unencoded `@` in the password terminates the userinfo section early, so the parser reads the rest of the password as the hostname.

**Fix:** percent-encode the password. `@` → `%40`, `#` → `%23`, `/` → `%2F`, `?` → `%3F`, `:` → `%3A`, `%` → `%25`.

```
postgresql://postgres.abcdefgh:p%40ssw0rd@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

Encode only the password, never the `@` that separates it from the host. Simplest way to sidestep this entirely: reset the password to an alphanumeric one.

### The anon key is `sb_publishable_...`, not a JWT

**Symptom:** you cannot find a key starting `eyJ` on the API settings page, or you paste a legacy key from an older project and auth fails with `Invalid API key`.

**Cause:** new Supabase projects issue `sb_publishable_...` (client) and `sb_secret_...` (server) keys instead of the legacy anon/service JWTs.

**Fix:** put the `sb_publishable_...` key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the secret key in `SUPABASE_SERVICE_ROLE_KEY`. The variable names are historical; `@supabase/ssr` and `@supabase/supabase-js` handle the new format transparently. Do not mix keys from two different projects — the URL and the key must belong to the same one.

### Resetting the database password

**Symptom:** right after resetting the password in the dashboard, connections still fail with `password authentication failed` — including with the new password, which makes it look like the reset silently failed.

**Cause:** the reset propagates to the connection pooler asynchronously. It takes roughly **30–60 seconds** before the pooler accepts the new credentials.

**Fix:** wait a minute, then retry `npm run verify:deploy`. Do not reset a second time — that restarts the clock and compounds the confusion. If it still fails after ~2 minutes, check that you URL-encoded the new password.

### Pooled connections and `prepare: false`

**Symptom:** without it, intermittent `prepared statement "s1" already exists` or `prepared statement "s1" does not exist` under any concurrency.

**Cause:** Supabase's transaction-mode pooler on port 6543 multiplexes many client connections onto fewer Postgres backends, handing a different backend to each transaction. `postgres.js` uses the extended query protocol and by default caches prepared statements per connection — but the connection it thinks it owns is a pooler session, not a backend. A statement prepared on one backend is then referenced against another that has never seen it.

**Already handled** in `src/lib/db/client.ts`:

```ts
const client = postgres(url, { prepare: false });
```

`scripts/seed.ts` and `scripts/verify-deploy.ts` pass the same option. If you add a script that opens its own `postgres()` connection, it needs `prepare: false` too.

The alternative is the session-mode connection on port 5432, which supports prepared statements — but it holds a backend per connection, and serverless functions scaling out will exhaust the connection limit. Use the pooler with `prepare: false`. `verify:deploy` warns when `DATABASE_URL` is not the pooler on 6543.

### `DATABASE_URL is not set — live data source requires a Postgres connection`

Thrown by `src/lib/db/client.ts` when a live-mode code path runs without a database. Usually the Supabase URL and anon key are set but `DATABASE_URL` is not: the app is in live **auth** mode with no live **data**. Set all four, or none.

### Deployment behaves like demo mode

`isLiveMode()` in `src/lib/env.ts` requires both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If either is missing or empty at build time the app serves demo mode with no error. Check the variables are set for the environment you deployed to (Production vs Preview are separate scopes), then redeploy — `NEXT_PUBLIC_` values are baked into the client bundle at build time.

### Uploads return 503

`storage unavailable` means `canUpload()` found no service-role key or no database. Uploads need `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL`. The private `documents` bucket is created automatically on first upload.

### A document stays `pending` forever

Expected for scanned or photographed documents. The verification pipeline reads a PDF text layer and does no OCR, so an image-only file yields no text and is marked `pending` with a flag saying so — deliberately, because a document that could not be read is never reported as verified. Re-upload a text-based PDF.

### Realtime updates do not arrive

Confirm `supabase/realtime.sql` was applied:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
```

You want `applications` and `notifications`. Realtime also authorises every row against the subscriber's JWT using the RLS SELECT policies, so if `supabase/rls.sql` was never applied, subscriptions may deliver nothing.
