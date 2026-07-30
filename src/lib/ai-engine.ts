// ─────────────────────────────────────────────────────────────
// ScholarAI — deterministic explainable AI engine
//
// A transparent weighted scoring model. Every number the UI
// shows can be traced back to a component in this file — that
// is the "explainable" part of Explainable AI.
// ─────────────────────────────────────────────────────────────

import type {
  AIScore,
  FraudReport,
  FraudSignal,
  MatchResult,
  Scholarship,
  ScoreComponent,
  StudentProfile,
} from "./types";

const clamp = (v: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, v));

// ---------- weighted scoring model ----------

interface WeightSpec {
  key: string;
  label: string;
  weight: number;
  score: (s: StudentProfile) => { raw: number; detail: string };
}

export const WEIGHTS: WeightSpec[] = [
  {
    key: "academic",
    label: "Academic Performance",
    weight: 0.22,
    score: (s) => ({
      raw: clamp(s.cgpa * 10 * 0.8 + s.attendance * 0.2),
      detail: `CGPA ${s.cgpa.toFixed(2)}/10 (80%) + attendance ${s.attendance}% (20%)`,
    }),
  },
  {
    key: "financialNeed",
    label: "Financial Need",
    weight: 0.18,
    score: (s) => {
      // lower income → higher need; log curve so need saturates gracefully
      const raw = clamp(100 - (Math.log10(Math.max(s.familyIncome, 1000)) - 3) * 45);
      return {
        raw,
        detail: `Annual family income $${s.familyIncome.toLocaleString()} mapped on log-need curve${s.firstGeneration ? " · first-generation student" : ""}`,
      };
    },
  },
  {
    key: "achievements",
    label: "Achievements",
    weight: 0.12,
    score: (s) => ({
      raw: clamp(s.achievements * 14 + s.hackathons * 8 + s.sportsLevel * 10),
      detail: `${s.achievements} awards, ${s.hackathons} hackathons, sports level ${s.sportsLevel}/3`,
    }),
  },
  {
    key: "research",
    label: "Research Output",
    weight: 0.1,
    score: (s) => ({
      raw: clamp(s.researchPapers * 25),
      detail: `${s.researchPapers} peer-reviewed publications`,
    }),
  },
  {
    key: "leadership",
    label: "Leadership",
    weight: 0.08,
    score: (s) => ({
      raw: clamp(s.leadershipRoles * 28),
      detail: `${s.leadershipRoles} verified leadership roles`,
    }),
  },
  {
    key: "projects",
    label: "Projects & Skills",
    weight: 0.08,
    score: (s) => ({
      raw: clamp(s.projects * 12 + s.certifications * 8 + s.skills.length * 4),
      detail: `${s.projects} projects, ${s.certifications} certifications, ${s.skills.length} skills`,
    }),
  },
  {
    key: "community",
    label: "Community Service",
    weight: 0.07,
    score: (s) => ({
      raw: clamp(s.volunteerHours / 3),
      detail: `${s.volunteerHours} volunteer hours logged`,
    }),
  },
  {
    key: "sop",
    label: "Statement of Purpose",
    weight: 0.08,
    score: (s) => ({
      raw: s.sopQuality,
      detail: `NLP quality score ${s.sopQuality}/100 (clarity, specificity, intent)`,
    }),
  },
  {
    key: "recommendation",
    label: "Recommendations",
    weight: 0.04,
    score: (s) => ({
      raw: s.recommendationStrength,
      detail: `Aggregate recommender strength ${s.recommendationStrength}/100`,
    }),
  },
  {
    key: "behaviour",
    label: "Behaviour & Integrity",
    weight: 0.03,
    score: (s) => ({
      raw: s.behaviourScore,
      detail: `Conduct score ${s.behaviourScore}/100 from institution records`,
    }),
  },
];

export function computeAIScore(s: StudentProfile): AIScore {
  const components: ScoreComponent[] = WEIGHTS.map((w) => {
    const { raw, detail } = w.score(s);
    return {
      key: w.key,
      label: w.label,
      weight: w.weight,
      raw: Math.round(raw),
      weighted: +(raw * w.weight).toFixed(1),
      detail,
    };
  });

  const total = Math.round(components.reduce((acc, c) => acc + c.weighted, 0));
  // confidence grows with profile completion and data density
  const confidence = Math.round(
    clamp(s.profileCompletion * 0.7 + Math.min(s.projects + s.certifications + s.achievements, 15) * 2)
  );

  const sorted = [...components].sort((a, b) => b.raw - a.raw);
  const strengths = sorted.slice(0, 3).map((c) => c.label);
  const gaps = sorted
    .filter((c) => c.raw < 50)
    .slice(-3)
    .map((c) => c.label);

  return { total, confidence, components, strengths, gaps };
}

// ---------- eligibility + matching ----------

export function matchScholarship(
  s: StudentProfile,
  sch: Scholarship
): MatchResult {
  const c = sch.criteria;
  const missing: string[] = [];
  const reasons: string[] = [];
  const improvements: string[] = [];

  // hard eligibility gates
  if (s.cgpa < c.minCgpa) {
    missing.push(`CGPA ${s.cgpa.toFixed(1)} below required ${c.minCgpa.toFixed(1)}`);
    improvements.push(`Raise CGPA to ${c.minCgpa.toFixed(1)}+ — currently ${(c.minCgpa - s.cgpa).toFixed(1)} points short`);
  } else {
    reasons.push(`CGPA ${s.cgpa.toFixed(1)} clears the ${c.minCgpa.toFixed(1)} requirement`);
  }

  if (c.maxIncome !== null) {
    if (s.familyIncome > c.maxIncome) {
      missing.push(`Family income exceeds cap of $${c.maxIncome.toLocaleString()}`);
    } else {
      reasons.push(`Income within need-based cap ($${c.maxIncome.toLocaleString()})`);
    }
  }

  if (s.attendance < c.minAttendance) {
    missing.push(`Attendance ${s.attendance}% below required ${c.minAttendance}%`);
    improvements.push(`Improve attendance to ${c.minAttendance}%+`);
  }

  if (c.requiresResearch && s.researchPapers === 0) {
    missing.push("Requires at least one research publication");
    improvements.push("Publish or co-author a research paper — even a workshop paper counts");
  } else if (c.requiresResearch) {
    reasons.push(`${s.researchPapers} publications satisfy the research requirement`);
  }

  if (c.requiresLeadership && s.leadershipRoles === 0) {
    missing.push("Requires demonstrated leadership");
    improvements.push("Take a club, team, or project leadership role this semester");
  } else if (c.requiresLeadership) {
    reasons.push("Leadership requirement met");
  }

  if (c.womenOnly && s.gender !== "female") {
    missing.push("Restricted to women applicants");
  }
  if (c.minorityOnly && !s.minority) {
    missing.push("Restricted to minority-community applicants");
  }
  if (c.sportsRequired && s.sportsLevel === 0) {
    missing.push("Requires competitive sports participation");
  } else if (c.sportsRequired) {
    reasons.push(`Sports level ${s.sportsLevel}/3 qualifies`);
  }
  if (c.locations.length > 0 && !c.locations.includes(s.location)) {
    missing.push(`Limited to: ${c.locations.join(", ")}`);
  }
  if (c.fields.length > 0 && !c.fields.includes(s.field)) {
    missing.push(`Limited to fields: ${c.fields.join(", ")}`);
  } else if (c.fields.length > 0) {
    reasons.push(`Field of study (${s.field}) is an exact match`);
  }

  const eligible = missing.length === 0;

  // soft matching score — semantic-style affinity between profile and scholarship
  const ai = computeAIScore(s);
  let affinity = ai.total * 0.55;
  if (c.disabilityPreferred && s.disability) {
    affinity += 8;
    reasons.push("Disability-inclusive preference applies to your profile");
  }
  if (sch.category === "Research Grant") affinity += Math.min(s.researchPapers * 6, 18);
  if (sch.category === "Sports") affinity += s.sportsLevel * 8;
  if (sch.category === "Need-based") {
    const needComp = ai.components.find((x) => x.key === "financialNeed");
    affinity += (needComp ? needComp.raw : 0) * 0.25;
  }
  if (sch.category === "Merit") affinity += s.cgpa * 2.5;
  if (s.skills.some((sk) => sch.tags.includes(sk.toLowerCase()))) {
    affinity += 6;
    reasons.push("Skill tags overlap with scholarship focus areas");
  }

  const matchScore = Math.round(clamp(eligible ? affinity + 12 : affinity * 0.5));

  // winning probability factors in competition
  const competition = sch.applicants / Math.max(sch.seats, 1);
  const winProbability = Math.round(
    clamp(eligible ? matchScore * (1 / (1 + Math.log10(Math.max(competition, 1)))) : matchScore * 0.15)
  );

  if (eligible && improvements.length === 0) {
    if (s.sopQuality < 75) improvements.push("Strengthen your SOP — specificity about goals raises reviewer scores");
    if (s.certifications < 3) improvements.push(`Add ${3 - s.certifications} recognized certification(s) in ${s.field}`);
    if (s.volunteerHours < 100) improvements.push("Log more community service hours to stand out on holistic review");
  }

  return {
    scholarship: sch,
    eligible,
    matchScore,
    winProbability,
    missingCriteria: missing,
    reasons,
    improvements,
    fairnessNote:
      "Score computed from a fixed, auditable weight model. Gender, category and disability fields are used only for inclusion preferences, never as penalties.",
  };
}

export function rankScholarships(
  s: StudentProfile,
  scholarships: Scholarship[]
): MatchResult[] {
  return scholarships
    .map((sch) => matchScholarship(s, sch))
    .sort((a, b) => b.matchScore - a.matchScore);
}

// ---------- fraud detection heuristics ----------

export function detectFraud(s: StudentProfile): FraudReport {
  const signals: FraudSignal[] = [];

  if (s.cgpa > 9.5 && s.attendance < 60) {
    signals.push({
      code: "GPA_ATTENDANCE_MISMATCH",
      severity: "high",
      message: "Near-perfect CGPA with very low attendance is statistically anomalous",
    });
  }
  if (s.familyIncome < 8000 && s.certifications > 8) {
    signals.push({
      code: "INCOME_SPEND_MISMATCH",
      severity: "medium",
      message: "Declared income unusually low relative to paid certification volume",
    });
  }
  if (s.researchPapers > 4 && s.year <= 2) {
    signals.push({
      code: "EARLY_RESEARCH_VOLUME",
      severity: "medium",
      message: "Publication count is atypical for academic year — verify authorship",
    });
  }
  if (s.previousScholarships > 3) {
    signals.push({
      code: "STACKED_AWARDS",
      severity: "low",
      message: "Multiple concurrent scholarships — check double-funding rules",
    });
  }
  if (s.behaviourScore < 40) {
    signals.push({
      code: "CONDUCT_FLAG",
      severity: "medium",
      message: "Institution conduct score below review threshold",
    });
  }

  const riskScore = Math.round(
    clamp(
      signals.reduce(
        (acc, sig) =>
          acc + (sig.severity === "high" ? 45 : sig.severity === "medium" ? 25 : 10),
        0
      )
    )
  );

  return {
    riskScore,
    level: riskScore >= 60 ? "flagged" : riskScore >= 25 ? "review" : "clear",
    signals,
  };
}

// ---------- personalized roadmap ----------

export interface RoadmapItem {
  quarter: string;
  title: string;
  detail: string;
  impact: number; // projected score gain
}

export function generateRoadmap(s: StudentProfile): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const ai = computeAIScore(s);
  const byKey = Object.fromEntries(ai.components.map((c) => [c.key, c.raw]));

  if (byKey.sop < 80)
    items.push({
      quarter: "Q1",
      title: "Rewrite your Statement of Purpose",
      detail: "Add measurable outcomes and a specific 5-year goal. SOP drives 8% of your total score.",
      impact: Math.round((80 - byKey.sop) * 0.08),
    });
  if (byKey.projects < 70)
    items.push({
      quarter: "Q1",
      title: `Ship 2 portfolio projects in ${s.field}`,
      detail: "Public, documented projects raise both Projects and Skills sub-scores.",
      impact: 4,
    });
  if (s.certifications < 3)
    items.push({
      quarter: "Q2",
      title: "Earn an industry certification",
      detail: `Recognized ${s.field} certifications strengthen merit and corporate scholarship matches.`,
      impact: 3,
    });
  if (byKey.research < 50)
    items.push({
      quarter: "Q2",
      title: "Join a research group",
      detail: "Even one workshop paper unlocks research-gated scholarships worth 10% of scoring weight.",
      impact: 5,
    });
  if (byKey.leadership < 60)
    items.push({
      quarter: "Q3",
      title: "Take a leadership role",
      detail: "Lead a student club, hackathon team, or volunteer drive — verified roles compound quickly.",
      impact: 3,
    });
  if (s.volunteerHours < 150)
    items.push({
      quarter: "Q3",
      title: `Log ${150 - s.volunteerHours} more volunteer hours`,
      detail: "Community service is weighted at 7% and heavily reviewed by need-based committees.",
      impact: 2,
    });
  items.push({
    quarter: "Q4",
    title: "Apply early to top-5 matches",
    detail: "Applications submitted in the first 20% of the window have historically higher approval odds.",
    impact: 4,
  });

  return items;
}

// ---------- resume analysis ----------

export interface ResumeAnalysis {
  atsScore: number;
  resumeScore: number;
  extracted: {
    education: string[];
    skills: string[];
    projects: string[];
    experience: string[];
    achievements: string[];
    certifications: string[];
  };
  suggestions: string[];
}

const SKILL_BANK = [
  "python", "javascript", "typescript", "react", "next.js", "node", "sql",
  "machine learning", "deep learning", "data analysis", "tensorflow", "pytorch",
  "aws", "docker", "kubernetes", "figma", "java", "c++", "research", "leadership",
  "communication", "excel", "tableau", "power bi", "nlp", "statistics",
];

const SECTION_HINTS: Record<string, string[]> = {
  education: ["b.tech", "bachelor", "master", "phd", "university", "college", "gpa", "cgpa", "school"],
  projects: ["project", "built", "developed", "created", "implemented", "designed"],
  experience: ["intern", "engineer", "analyst", "assistant", "worked", "experience"],
  achievements: ["award", "winner", "rank", "medal", "scholarship", "finalist", "hackathon"],
  certifications: ["certified", "certification", "certificate", "course", "credential"],
};

export function analyzeResume(text: string): ResumeAnalysis {
  const lower = text.toLowerCase();
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8);

  const skills = SKILL_BANK.filter((sk) => lower.includes(sk));

  const pick = (keys: string[]) =>
    lines.filter((l) => keys.some((k) => l.toLowerCase().includes(k))).slice(0, 5);

  const extracted = {
    education: pick(SECTION_HINTS.education),
    skills: skills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    projects: pick(SECTION_HINTS.projects),
    experience: pick(SECTION_HINTS.experience),
    achievements: pick(SECTION_HINTS.achievements),
    certifications: pick(SECTION_HINTS.certifications),
  };

  const hasNumbers = /\d+%|\d+x|\d+ (users|students|projects|people|hours)/i.test(text);
  const wordCount = text.split(/\s+/).length;

  let ats = 40;
  ats += Math.min(skills.length * 4, 24);
  ats += extracted.education.length > 0 ? 8 : 0;
  ats += extracted.experience.length > 0 ? 8 : 0;
  ats += extracted.projects.length > 0 ? 6 : 0;
  ats += hasNumbers ? 8 : 0;
  ats += wordCount > 150 && wordCount < 900 ? 6 : 0;
  const atsScore = clamp(Math.round(ats));

  let rs = atsScore * 0.6;
  rs += extracted.achievements.length * 5;
  rs += extracted.certifications.length * 4;
  const resumeScore = clamp(Math.round(rs));

  const suggestions: string[] = [];
  if (!hasNumbers)
    suggestions.push("Quantify impact — add metrics like “improved X by 30%” or “used by 500 students”.");
  if (skills.length < 6)
    suggestions.push("List more concrete, searchable skills — ATS systems match on exact keywords.");
  if (extracted.achievements.length === 0)
    suggestions.push("Add an Achievements section — awards and ranks materially raise scholarship scores.");
  if (extracted.certifications.length === 0)
    suggestions.push("Include certifications with issuing body and year.");
  if (wordCount > 900)
    suggestions.push("Trim to one page — reviewers spend under 60 seconds on first pass.");
  if (wordCount < 150)
    suggestions.push("Resume is too sparse — expand project and experience descriptions with action verbs.");
  if (suggestions.length === 0)
    suggestions.push("Strong resume. Tailor the top third to each scholarship's focus area before applying.");

  return { atsScore, resumeScore, extracted, suggestions };
}
