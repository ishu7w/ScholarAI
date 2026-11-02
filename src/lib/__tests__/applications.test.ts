import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCHOLARSHIPS, DEMO_STUDENT } from "@/lib/data";
import type { DataSource } from "@/lib/datasource";
import { applyAction } from "@/lib/applications/actions";

const mocks = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  getDataSource: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionProfile: mocks.getSessionProfile,
}));
vi.mock("@/lib/datasource", () => ({
  getDataSource: mocks.getDataSource,
}));
vi.mock("@/lib/env", () => ({ hasDatabase: () => false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("applyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionProfile.mockResolvedValue({
      id: DEMO_STUDENT.id,
      role: "student",
      name: DEMO_STUDENT.name,
      email: DEMO_STUDENT.email,
      avatarHue: DEMO_STUDENT.avatarHue,
    });
  });

  it("enforces institution eligibility gates on the server", async () => {
    const scholarship = {
      ...SCHOLARSHIPS[0],
      deadline: "2099-12-31",
      criteria: { ...SCHOLARSHIPS[0].criteria, minCgpa: 10 },
    };
    const getApplication = vi.fn().mockResolvedValue(null);
    const dataSource = {
      getScholarships: vi.fn().mockResolvedValue([scholarship]),
      getStudentProfile: vi.fn().mockResolvedValue(DEMO_STUDENT),
      getApplication,
    } as unknown as DataSource;
    mocks.getDataSource.mockResolvedValue(dataSource);

    const result = await applyAction(scholarship.id);

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("CGPA"),
    });
    expect(getApplication).toHaveBeenCalledWith(DEMO_STUDENT.id, scholarship.id);
  });

  it("refuses applications to a program that is not active in the student catalogue", async () => {
    const dataSource = {
      getScholarships: vi.fn().mockResolvedValue([]),
      getStudentProfile: vi.fn().mockResolvedValue(DEMO_STUDENT),
      getApplication: vi.fn().mockResolvedValue(null),
    } as unknown as DataSource;
    mocks.getDataSource.mockResolvedValue(dataSource);

    const result = await applyAction(SCHOLARSHIPS[0].id);

    expect(result).toEqual({ ok: false, error: "Scholarship not found" });
  });
});
