// ─────────────────────────────────────────────────────────────
// DataSource — the single seam between the UI and where data
// lives. `demo` reproduces today's in-memory behavior exactly;
// `live` reads Postgres via Drizzle. Pages/route handlers call
// getDataSource() and never import data.ts or db directly.
// Extended phase by phase (applications, documents, …).
// ─────────────────────────────────────────────────────────────

import "server-only";
import type { Scholarship, StudentProfile } from "@/lib/types";
import { hasDatabase } from "@/lib/env";

export interface DataSource {
  readonly mode: "demo" | "live";
  getScholarships(): Promise<Scholarship[]>;
  getScholarship(id: string): Promise<Scholarship | null>;
  /** Demo mode: the seeded demo student. Live mode: the given profile id. */
  getStudentProfile(profileId?: string): Promise<StudentProfile | null>;
}

let _ds: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (_ds) return _ds;
  if (hasDatabase()) {
    const { LiveDataSource } = await import("./live");
    _ds = new LiveDataSource();
  } else {
    const { DemoDataSource } = await import("./demo");
    _ds = new DemoDataSource();
  }
  return _ds;
}
