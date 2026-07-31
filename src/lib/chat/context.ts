import "server-only";
import type { SessionProfile } from "@/lib/auth/session";
import { getDataSource, type ApplicationStatus } from "@/lib/datasource";
import { computeAIScore, generateRoadmap, rankScholarships } from "@/lib/ai-engine";
import { daysUntil } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// The copilot's grounding. Every figure an answer may state is
// assembled here from the CALLER'S OWN rows — engine output,
// their matches, their applications. Nothing in this file reads
// another profile's data, and nothing in it invents a number.
// ─────────────────────────────────────────────────────────────

export interface CopilotContext {
  mode: "demo" | "live";
  /** The signed-in caller. Answers address this person and no one else. */
  viewer: { id: string; name: string; role: SessionProfile["role"] };
  student: {
    name: string;
    field: string;
    degree: string;
    year: number;
    location: string;
    cgpa: number;
    attendance: number;
    sopQuality: number;
    recommendationStrength: number;
    profileCompletion: number;
    researchPapers: number;
    leadershipRoles: number;
    certifications: number;
    volunteerHours: number;
    skills: string[];
  } | null;
  score: {
    total: number;
    confidence: number;
    strengths: string[];
    gaps: string[];
    components: {
      label: string;
      weightPercent: number;
      raw: number;
      weighted: number;
      detail: string;
    }[];
  } | null;
  matches: {
    scholarshipId: string;
    name: string;
    provider: string;
    category: string;
    amount: number;
    currency: string;
    deadline: string;
    eligible: boolean;
    matchScore: number;
    winProbability: number;
    missingCriteria: string[];
    reasons: string[];
    improvements: string[];
  }[];
  eligibility: { eligibleCount: number; trackedCount: number };
  applications: {
    scholarshipId: string;
    scholarshipName: string;
    status: ApplicationStatus;
    /** Engine output frozen at submit time. Never recomputed. */
    aiSnapshot: {
      total: number;
      confidence: number;
      matchScore: number;
      winProbability: number;
      reasons: string[];
    } | null;
    rejectionReasons: string[];
    submittedAt: string | null;
    decidedAt: string | null;
  }[];
  deadlines: {
    scholarshipId: string;
    name: string;
    deadline: string;
    daysRemaining: number;
    applied: boolean;
  }[];
  roadmap: { quarter: string; title: string; detail: string; impact: number }[];
}

const MAX_MATCHES = 8;
const MAX_DEADLINES = 6;

/** Build the grounded context for ONE caller. The student id is taken from
 *  the session, never from request input, so a caller can only ever be
 *  described by their own rows. */
export async function buildCopilotContext(
  me: SessionProfile
): Promise<CopilotContext> {
  const ds = await getDataSource();

  const [profile, scholarships, applications] = await Promise.all([
    ds.getStudentProfile(me.id),
    ds.getScholarships(),
    ds.getApplications(me.id),
  ]);

  const base: CopilotContext = {
    mode: ds.mode,
    viewer: { id: me.id, name: me.name, role: me.role },
    student: null,
    score: null,
    matches: [],
    eligibility: { eligibleCount: 0, trackedCount: scholarships.length },
    applications: [],
    deadlines: [],
    roadmap: [],
  };

  const nameById = new Map(scholarships.map((s) => [s.id, s.name]));
  const appliedIds = new Set(applications.map((a) => a.scholarshipId));

  base.applications = applications.map((a) => ({
    scholarshipId: a.scholarshipId,
    scholarshipName: nameById.get(a.scholarshipId) ?? a.scholarshipId,
    status: a.status,
    aiSnapshot: a.aiSnapshot
      ? {
          total: a.aiSnapshot.total,
          confidence: a.aiSnapshot.confidence,
          matchScore: a.aiSnapshot.matchScore,
          winProbability: a.aiSnapshot.winProbability,
          reasons: a.aiSnapshot.reasons,
        }
      : null,
    rejectionReasons: a.rejectionReasons,
    submittedAt: a.submittedAt,
    decidedAt: a.decidedAt,
  }));

  base.deadlines = [...scholarships]
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, MAX_DEADLINES)
    .map((s) => ({
      scholarshipId: s.id,
      name: s.name,
      deadline: s.deadline,
      daysRemaining: daysUntil(s.deadline),
      applied: appliedIds.has(s.id),
    }));

  // Institution and admin callers have no academic profile; the score,
  // match and roadmap sections stay empty rather than being faked.
  if (!profile) return base;

  const ai = computeAIScore(profile);
  const ranked = rankScholarships(profile, scholarships);

  base.student = {
    name: profile.name,
    field: profile.field,
    degree: profile.degree,
    year: profile.year,
    location: profile.location,
    cgpa: profile.cgpa,
    attendance: profile.attendance,
    sopQuality: profile.sopQuality,
    recommendationStrength: profile.recommendationStrength,
    profileCompletion: profile.profileCompletion,
    researchPapers: profile.researchPapers,
    leadershipRoles: profile.leadershipRoles,
    certifications: profile.certifications,
    volunteerHours: profile.volunteerHours,
    skills: profile.skills,
  };

  base.score = {
    total: ai.total,
    confidence: ai.confidence,
    strengths: ai.strengths,
    gaps: ai.gaps,
    components: ai.components.map((c) => ({
      label: c.label,
      weightPercent: Math.round(c.weight * 100),
      raw: c.raw,
      weighted: c.weighted,
      detail: c.detail,
    })),
  };

  base.eligibility = {
    eligibleCount: ranked.filter((r) => r.eligible).length,
    trackedCount: scholarships.length,
  };

  // Keep the top matches plus the best blocked one, so "why am I not
  // eligible" has a real row to quote instead of a guess.
  const top = ranked.slice(0, MAX_MATCHES);
  const firstBlocked = ranked.find((r) => !r.eligible);
  const selected =
    firstBlocked && !top.includes(firstBlocked) ? [...top, firstBlocked] : top;

  base.matches = selected.map((r) => ({
    scholarshipId: r.scholarship.id,
    name: r.scholarship.name,
    provider: r.scholarship.provider,
    category: r.scholarship.category,
    amount: r.scholarship.amount,
    currency: r.scholarship.currency,
    deadline: r.scholarship.deadline,
    eligible: r.eligible,
    matchScore: r.matchScore,
    winProbability: r.winProbability,
    missingCriteria: r.missingCriteria,
    reasons: r.reasons,
    improvements: r.improvements,
  }));

  base.roadmap = generateRoadmap(profile).map((r) => ({
    quarter: r.quarter,
    title: r.title,
    detail: r.detail,
    impact: r.impact,
  }));

  return base;
}
