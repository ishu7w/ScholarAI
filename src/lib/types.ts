// ─────────────────────────────────────────────────────────────
// ScholarAI — core domain types
// ─────────────────────────────────────────────────────────────

export type ScholarshipCategory =
  | "Government"
  | "Private"
  | "NGO"
  | "University"
  | "International"
  | "Corporate"
  | "Research Grant"
  | "Need-based"
  | "Merit"
  | "Women"
  | "Minority"
  | "Sports";

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  category: ScholarshipCategory;
  amount: number;
  currency: string;
  deadline: string; // ISO date
  seats: number;
  applicants: number;
  description: string;
  criteria: {
    minCgpa: number;
    maxIncome: number | null; // annual, USD-equivalent; null = no cap
    minAttendance: number; // percent
    requiresResearch: boolean;
    requiresLeadership: boolean;
    womenOnly: boolean;
    minorityOnly: boolean;
    sportsRequired: boolean;
    disabilityPreferred: boolean;
    locations: string[]; // empty = anywhere
    fields: string[]; // empty = any field
  };
  tags: string[];
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarHue: number;
  field: string;
  degree: string;
  year: number;
  location: string;
  cgpa: number; // 0–10
  attendance: number; // percent
  familyIncome: number; // annual USD
  gender: "female" | "male" | "other";
  minority: boolean;
  disability: boolean;
  firstGeneration: boolean;
  achievements: number; // count of significant awards
  researchPapers: number;
  hackathons: number;
  sportsLevel: 0 | 1 | 2 | 3; // none / district / state / national
  certifications: number;
  leadershipRoles: number;
  volunteerHours: number;
  projects: number;
  skills: string[];
  previousScholarships: number;
  behaviourScore: number; // 0–100
  sopQuality: number; // 0–100 (NLP-scored)
  recommendationStrength: number; // 0–100
  profileCompletion: number; // percent
}

export interface ScoreComponent {
  key: string;
  label: string;
  weight: number; // 0–1, weights sum to 1
  raw: number; // 0–100 normalized sub-score
  weighted: number; // raw * weight
  detail: string;
}

export interface AIScore {
  total: number; // 0–100
  confidence: number; // 0–100
  components: ScoreComponent[];
  strengths: string[];
  gaps: string[];
}

export interface MatchResult {
  scholarship: Scholarship;
  eligible: boolean;
  matchScore: number; // 0–100
  winProbability: number; // 0–100
  missingCriteria: string[];
  reasons: string[]; // why selected
  improvements: string[]; // what to improve
  fairnessNote: string;
}

export interface FraudSignal {
  code: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface FraudReport {
  riskScore: number; // 0–100
  level: "clear" | "review" | "flagged";
  signals: FraudSignal[];
}

export interface Applicant {
  student: StudentProfile;
  scholarshipId: string;
  appliedOn: string;
  status: "pending" | "shortlisted" | "approved" | "rejected" | "review";
  documentsVerified: number; // out of documentsTotal
  documentsTotal: number;
}
