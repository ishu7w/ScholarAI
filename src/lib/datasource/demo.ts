import type { Scholarship, StudentProfile } from "@/lib/types";
import { DEMO_STUDENT, SCHOLARSHIPS, generateApplicants } from "@/lib/data";
import type {
  ApplicationRecord,
  DataSource,
  DocumentSummary,
  InstitutionAggregates,
  InstitutionApplicant,
  InstitutionRecord,
  InstitutionScholarship,
} from "./index";

// Wraps the deterministic seed data — byte-for-byte the current demo
// behavior. Zero env vars, zero network. Applications live in module
// memory so the demo can still exercise the apply flow end to end.
const demoApplications = new Map<string, ApplicationRecord>();

// The demo persona's institution. One org that owns every seeded program,
// which is what the current institution dashboard implicitly assumes.
const DEMO_INSTITUTION: InstitutionRecord = {
  id: "demo-institution",
  profileId: "demo-institution-profile",
  orgName: "State University",
  verified: true,
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The seeded applicant queue, shaped like the live join. Snapshots are
 *  null in demo mode so the view falls back to computeAIScore — exactly
 *  the ranking the demo dashboard has always shown. Memoized so the queue
 *  and the aggregates read the identical array, not two equal ones. */
let _demoApplicants: InstitutionApplicant[] | null = null;

function demoApplicants(): InstitutionApplicant[] {
  if (_demoApplicants) return _demoApplicants;
  _demoApplicants = generateApplicants(60).map((a, i) => {
    const sch = SCHOLARSHIPS.find((s) => s.id === a.scholarshipId);
    return {
      applicationId: `demo-app-${i}`,
      scholarshipId: a.scholarshipId,
      scholarshipName: sch?.name ?? a.scholarshipId,
      scholarshipCategory: sch?.category ?? "",
      status:
        a.status === "approved"
          ? ("approved" as const)
          : a.status === "rejected"
            ? ("rejected" as const)
            : a.status === "pending"
              ? ("submitted" as const)
              : ("under_review" as const),
      aiSnapshot: null,
      rejectionReasons: [],
      submittedAt: a.appliedOn,
      decidedAt: null,
      student: a.student,
      documentsVerified: a.documentsVerified,
      documentsTotal: a.documentsTotal,
    };
  });
  return _demoApplicants;
}

/** Aggregates derived from the very rows the queue renders, so the charts
 *  and the queue can never disagree. */
function aggregateApplicants(rows: InstitutionApplicant[]): InstitutionAggregates {
  const monthly = new Map<string, { applications: number; approvals: number }>();
  const categories = new Map<string, number>();
  const regions = new Map<string, { students: number; funded: number }>();

  for (const r of rows) {
    if (r.submittedAt) {
      const d = new Date(r.submittedAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const m = monthly.get(key) ?? { applications: 0, approvals: 0 };
      m.applications += 1;
      if (r.status === "approved") m.approvals += 1;
      monthly.set(key, m);
    }
    if (r.scholarshipCategory) {
      categories.set(r.scholarshipCategory, (categories.get(r.scholarshipCategory) ?? 0) + 1);
    }
    const loc = r.student.location;
    if (loc) {
      const g = regions.get(loc) ?? { students: 0, funded: 0 };
      g.students += 1;
      if (r.status === "approved") g.funded += 1;
      regions.set(loc, g);
    }
  }

  return {
    monthly: [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, v]) => ({
        month: `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`,
        ...v,
      })),
    categories: [...categories.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    regions: [...regions.entries()]
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.students - a.students),
  };
}

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

  async getApplications(studentId: string): Promise<ApplicationRecord[]> {
    return [...demoApplications.values()].filter((a) => a.studentId === studentId);
  }

  async getApplication(
    studentId: string,
    scholarshipId: string
  ): Promise<ApplicationRecord | null> {
    return demoApplications.get(`${studentId}:${scholarshipId}`) ?? null;
  }

  async getSavedScholarshipIds(): Promise<string[]> {
    return [];
  }

  async getInstitutionForProfile(profileId: string): Promise<InstitutionRecord | null> {
    return { ...DEMO_INSTITUTION, profileId };
  }

  async getInstitutionApplicants(): Promise<InstitutionApplicant[]> {
    return demoApplicants();
  }

  async getInstitutionScholarships(): Promise<InstitutionScholarship[]> {
    return SCHOLARSHIPS.map((s) => ({ ...s, status: "active" as const }));
  }

  async getInstitutionScholarship(
    _institutionId: string,
    scholarshipId: string
  ): Promise<InstitutionScholarship | null> {
    const s = SCHOLARSHIPS.find((x) => x.id === scholarshipId);
    return s ? { ...s, status: "active" } : null;
  }

  async getInstitutionAggregates(): Promise<InstitutionAggregates> {
    return aggregateApplicants(demoApplicants());
  }

  // Demo mode has no storage bucket, so there is nothing to have
  // verified. An empty list is the honest answer — the UI shows the
  // "connect storage" notice rather than invented verification results.
  async getDocuments(): Promise<DocumentSummary[]> {
    return [];
  }
}

/** Demo-mode write path used by the apply action. */
export function demoUpsertApplication(record: ApplicationRecord) {
  demoApplications.set(`${record.studentId}:${record.scholarshipId}`, record);
}

export function demoDeleteApplication(studentId: string, scholarshipId: string) {
  demoApplications.delete(`${studentId}:${scholarshipId}`);
}
