// ─────────────────────────────────────────────────────────────
// Pre-deploy readiness check.
//   npm run verify:deploy
//
// Verifies that a LIVE deployment target is actually ready: env
// contract satisfied, database reachable, schema migrated, RLS on
// every table, and seed data present. Prints a pass/fail table and
// exits non-zero if anything fails.
//
// This checks live mode only. Demo mode needs no verification —
// it has no env, no database, and nothing to get wrong.
// ─────────────────────────────────────────────────────────────

import postgres from "postgres";

type Status = "pass" | "fail" | "warn";

interface Check {
  name: string;
  status: Status;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, status: Status, detail: string) {
  checks.push({ name, status, detail });
}

/** Tables the Drizzle schema defines — all nine must exist and have RLS. */
const EXPECTED_TABLES = [
  "applications",
  "audit_log",
  "documents",
  "institutions",
  "notifications",
  "profiles",
  "saved_scholarships",
  "scholarships",
  "student_profiles",
] as const;

/** scripts/seed.ts ports exactly the 12 scholarships from src/lib/data.ts. */
const EXPECTED_SCHOLARSHIPS = 12;

/** Server-only secrets — must never be prefixed NEXT_PUBLIC_. */
const REQUIRED_ENV = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", serverOnly: false },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", serverOnly: false },
  { key: "SUPABASE_SERVICE_ROLE_KEY", serverOnly: true },
  { key: "DATABASE_URL", serverOnly: true },
] as const;

function checkEnv(): void {
  for (const { key, serverOnly } of REQUIRED_ENV) {
    const value = process.env[key];
    if (!value) {
      record(`env ${key}`, "fail", "not set");
      continue;
    }
    record(
      `env ${key}`,
      "pass",
      serverOnly ? "set (server-only)" : "set (public)"
    );
  }

  // Optional — its absence is a documented, supported configuration.
  record(
    "env ANTHROPIC_API_KEY",
    process.env.ANTHROPIC_API_KEY ? "pass" : "warn",
    process.env.ANTHROPIC_API_KEY
      ? "set (server-only)"
      : "not set (optional; deterministic engine is used)"
  );
}

/**
 * Supabase's pooled connection string. Session-mode/direct connections
 * (port 5432) work locally but exhaust connections on serverless, so
 * flag anything that is not the pooler.
 */
function checkConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    record(
      "DATABASE_URL format",
      "fail",
      "unparseable — a password with special characters must be URL-encoded"
    );
    return;
  }

  const isPooler = parsed.hostname.includes("pooler.supabase.com");
  const isTransactionPort = parsed.port === "6543";

  if (isPooler && isTransactionPort) {
    record("DATABASE_URL format", "pass", `pooler ${parsed.hostname}:6543`);
  } else if (isPooler) {
    record(
      "DATABASE_URL format",
      "warn",
      `pooler on port ${parsed.port || "(default)"} — expected 6543 for serverless`
    );
  } else {
    record(
      "DATABASE_URL format",
      "warn",
      `${parsed.hostname} is not the Supabase pooler — serverless will exhaust connections`
    );
  }
}

async function main() {
  // Missing vars are recorded as FAIL rows, so report() already exits
  // non-zero on them — no separate return value needed.
  checkEnv();
  checkConnectionString();

  const url = process.env.DATABASE_URL;
  if (!url) {
    report();
    return;
  }

  // prepare:false — the transaction-mode pooler does not support the
  // extended-protocol prepared statements postgres.js uses by default.
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });

  try {
    await sql`select 1`;
    record("database reachable", "pass", "connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record("database reachable", "fail", message);
    await sql.end({ timeout: 5 }).catch(() => {});
    report();
    return;
  }

  try {
    // rowsecurity is the authoritative RLS flag; a policy without the
    // table-level toggle enforces nothing.
    const rows = await sql<{ tablename: string; rowsecurity: boolean }[]>`
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
    `;

    const found = new Map(rows.map((r) => [r.tablename, r.rowsecurity]));
    const missing = EXPECTED_TABLES.filter((t) => !found.has(t));

    if (missing.length === 0) {
      record(
        "schema: 9 tables",
        "pass",
        `all present (${EXPECTED_TABLES.length}/${EXPECTED_TABLES.length})`
      );
    } else {
      record(
        "schema: 9 tables",
        "fail",
        `missing: ${missing.join(", ")} — run npm run db:migrate`
      );
    }

    const rlsOff = EXPECTED_TABLES.filter((t) => found.has(t) && !found.get(t));
    if (rlsOff.length === 0 && missing.length === 0) {
      record("RLS enabled on all tables", "pass", "rowsecurity = true everywhere");
    } else if (rlsOff.length > 0) {
      record(
        "RLS enabled on all tables",
        "fail",
        `disabled on: ${rlsOff.join(", ")} — apply supabase/rls.sql`
      );
    } else {
      record("RLS enabled on all tables", "fail", "cannot verify: tables missing");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record("schema: 9 tables", "fail", message);
  }

  // Seed data — only meaningful once the tables exist.
  const tablesReady = checks.some(
    (c) => c.name === "schema: 9 tables" && c.status === "pass"
  );

  if (tablesReady) {
    try {
      const [{ count }] = await sql<{ count: string }[]>`
        select count(*)::text as count from scholarships
      `;
      const n = Number(count);
      if (n >= EXPECTED_SCHOLARSHIPS) {
        record(
          "scholarships seeded",
          "pass",
          `${n} rows (expected at least ${EXPECTED_SCHOLARSHIPS})`
        );
      } else {
        record(
          "scholarships seeded",
          "fail",
          `${n} rows, expected ${EXPECTED_SCHOLARSHIPS} — run npm run db:seed`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      record("scholarships seeded", "fail", message);
    }

    try {
      const [{ count }] = await sql<{ count: string }[]>`
        select count(*)::text as count from profiles
      `;
      const n = Number(count);
      if (n > 0) {
        record("profiles exist", "pass", `${n} profile row(s)`);
      } else {
        record(
          "profiles exist",
          "fail",
          "no profiles — run npm run db:seed with SUPABASE_SERVICE_ROLE_KEY set"
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      record("profiles exist", "fail", message);
    }
  }

  await sql.end({ timeout: 5 }).catch(() => {});
  report();
}

function report() {
  const symbol: Record<Status, string> = { pass: "PASS", fail: "FAIL", warn: "WARN" };
  const width = Math.max(...checks.map((c) => c.name.length), 10);

  console.log("\nScholarAI — deployment readiness\n");
  for (const c of checks) {
    console.log(`  ${symbol[c.status].padEnd(5)} ${c.name.padEnd(width)}  ${c.detail}`);
  }

  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const passed = checks.filter((c) => c.status === "pass").length;
  // Advisories are counted separately from passes — folding them in would
  // overstate how much actually succeeded.
  const advisory = warned ? `, ${warned} advisory` : "";

  console.log("");
  if (failed > 0) {
    console.log(
      `${failed} check(s) failed, ${passed} passed${advisory}. Not ready to deploy.\n`
    );
    process.exit(1);
  }
  console.log(`All ${passed} required check(s) passed${advisory}. Ready to deploy.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
