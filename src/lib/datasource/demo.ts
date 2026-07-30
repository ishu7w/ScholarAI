import type { Scholarship, StudentProfile } from "@/lib/types";
import { DEMO_STUDENT, SCHOLARSHIPS } from "@/lib/data";
import type { DataSource } from "./index";

// Wraps the deterministic seed data — byte-for-byte the current demo
// behavior. Zero env vars, zero network.
export class DemoDataSource implements DataSource {
  readonly mode = "demo" as const;

  async getScholarships(): Promise<Scholarship[]> {
    return SCHOLARSHIPS;
  }

  async getScholarship(id: string): Promise<Scholarship | null> {
    return SCHOLARSHIPS.find((s) => s.id === id) ?? null;
  }

  async getStudentProfile(): Promise<StudentProfile | null> {
    return DEMO_STUDENT;
  }
}
