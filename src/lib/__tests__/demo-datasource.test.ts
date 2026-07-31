import { describe, expect, it } from "vitest";
import {
  DemoDataSource,
  demoDeleteApplication,
  demoUpsertApplication,
} from "@/lib/datasource/demo";
import { DEMO_STUDENT, SCHOLARSHIPS } from "@/lib/data";
import type { ApplicationRecord, DataSource } from "@/lib/datasource";

// Demo mode is the zero-config path: the app must be fully explorable with
// no env vars, no database and no network. These tests pin that contract —
// if the seed data or the in-memory application store drifts, the demo
// deployment breaks silently.
//
// Typed as DataSource, not DemoDataSource: the demo class omits parameters
// it ignores, and the contract callers code against is the interface.
const ds: DataSource = new DemoDataSource();

const application = (over: Partial<ApplicationRecord> = {}): ApplicationRecord => ({
  id: "app-1",
  scholarshipId: SCHOLARSHIPS[0].id,
  studentId: DEMO_STUDENT.id,
  status: "submitted",
  aiSnapshot: null,
  rejectionReasons: [],
  submittedAt: "2026-01-01T00:00:00.000Z",
  decidedAt: null,
  ...over,
});

describe("DemoDataSource", () => {
  it("reports demo mode", () => {
    expect(ds.mode).toBe("demo");
  });

  it("returns exactly 12 seeded scholarships", async () => {
    const list = await ds.getScholarships();
    expect(list).toHaveLength(12);
  });

  it("gives every scholarship a unique id and a complete criteria block", async () => {
    const list = await ds.getScholarships();
    expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
    for (const s of list) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.seats).toBeGreaterThan(0);
      expect(s.criteria.minCgpa).toBeGreaterThanOrEqual(0);
      expect(s.criteria.minCgpa).toBeLessThanOrEqual(10);
      expect(Array.isArray(s.criteria.locations)).toBe(true);
      expect(Array.isArray(s.criteria.fields)).toBe(true);
      expect(Number.isNaN(Date.parse(s.deadline))).toBe(false);
    }
  });

  it("looks a scholarship up by id, and returns null for an unknown one", async () => {
    const first = SCHOLARSHIPS[0];
    expect(await ds.getScholarship(first.id)).toEqual(first);
    expect(await ds.getScholarship("sch-does-not-exist")).toBeNull();
  });

  it("returns the seeded demo student", async () => {
    const profile = await ds.getStudentProfile();
    expect(profile).toEqual(DEMO_STUDENT);
    expect(profile!.cgpa).toBeGreaterThan(0);
    expect(profile!.name.length).toBeGreaterThan(0);
  });

  it("returns null for an application that was never created", async () => {
    expect(await ds.getApplication("stu-unknown", "sch-unknown")).toBeNull();
    // A real student against a scholarship they have not applied to.
    expect(
      await ds.getApplication(DEMO_STUDENT.id, "sch-never-applied")
    ).toBeNull();
  });

  it("round-trips an application through the in-memory store", async () => {
    const record = application();
    demoUpsertApplication(record);
    try {
      expect(await ds.getApplication(record.studentId, record.scholarshipId)).toEqual(
        record
      );
      // Scoped by student: another student must not see it.
      expect(await ds.getApplication("stu-other", record.scholarshipId)).toBeNull();
    } finally {
      demoDeleteApplication(record.studentId, record.scholarshipId);
    }
    expect(await ds.getApplication(record.studentId, record.scholarshipId)).toBeNull();
  });

  it("lists only the requested student's applications", async () => {
    const mine = application({ id: "app-mine" });
    const theirs = application({
      id: "app-theirs",
      studentId: "stu-other",
      scholarshipId: SCHOLARSHIPS[1].id,
    });
    demoUpsertApplication(mine);
    demoUpsertApplication(theirs);
    try {
      const list = await ds.getApplications(DEMO_STUDENT.id);
      expect(list.map((a) => a.id)).toEqual(["app-mine"]);
    } finally {
      demoDeleteApplication(mine.studentId, mine.scholarshipId);
      demoDeleteApplication(theirs.studentId, theirs.scholarshipId);
    }
  });

  it("returns no documents — demo mode has no storage, and says so honestly", async () => {
    expect(await ds.getDocuments(DEMO_STUDENT.id)).toEqual([]);
  });

  it("exposes every seeded scholarship to the owning institution as active", async () => {
    const list = await ds.getInstitutionScholarships("demo-institution");
    expect(list).toHaveLength(12);
    expect(list.every((s) => s.status === "active")).toBe(true);
    expect(
      await ds.getInstitutionScholarship("demo-institution", "sch-does-not-exist")
    ).toBeNull();
  });

  it("builds a non-empty applicant queue with joined student profiles", async () => {
    const applicants = await ds.getInstitutionApplicants("demo-institution");
    expect(applicants.length).toBeGreaterThan(0);
    for (const a of applicants) {
      expect(a.student).toBeTruthy();
      expect(a.scholarshipName.length).toBeGreaterThan(0);
      expect(a.documentsVerified).toBeLessThanOrEqual(a.documentsTotal);
    }
  });

  it("memoizes the applicant queue so aggregates read the same rows", async () => {
    const a = await ds.getInstitutionApplicants("demo-institution");
    const b = await ds.getInstitutionApplicants("demo-institution");
    expect(a).toBe(b);
  });

  it("derives aggregates from the queue rather than inventing series", async () => {
    const applicants = await ds.getInstitutionApplicants("demo-institution");
    const agg = await ds.getInstitutionAggregates("demo-institution");
    const categoryTotal = agg.categories.reduce((sum, c) => sum + c.value, 0);
    expect(categoryTotal).toBe(applicants.length);
    // Sorted descending, as the charts assume.
    const values = agg.categories.map((c) => c.value);
    expect([...values].sort((x, y) => y - x)).toEqual(values);
  });

  it("is stable across calls — no randomness leaks into the demo", async () => {
    expect(await ds.getScholarships()).toEqual(await ds.getScholarships());
    expect(await ds.getStudentProfile()).toEqual(await ds.getStudentProfile());
    expect(await ds.getInstitutionAggregates("demo-institution")).toEqual(
      await ds.getInstitutionAggregates("demo-institution")
    );
  });
});
