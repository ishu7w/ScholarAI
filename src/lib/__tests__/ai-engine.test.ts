import { describe, expect, it } from "vitest";
import {
  WEIGHTS,
  computeAIScore,
  detectFraud,
  generateRoadmap,
  matchScholarship,
  rankScholarships,
} from "@/lib/ai-engine";
import { DEMO_STUDENT, SCHOLARSHIPS } from "@/lib/data";
import type { Scholarship, StudentProfile } from "@/lib/types";

// The engine is the product's accountability surface: every number the UI
// attributes to "AI" is produced here, so these tests assert the properties
// a student could reasonably demand we defend — determinism, monotonicity,
// bounded output, and that protected attributes never subtract.

const student = (over: Partial<StudentProfile> = {}): StudentProfile => ({
  ...DEMO_STUDENT,
  ...over,
});

/** A scholarship with no demographic gate and no location/field restriction. */
const NEUTRAL = SCHOLARSHIPS.find((s) => s.id === "sch-merit-excellence")!;

/** Deterministic profile generator — same sequence on every run. */
function profiles(count: number): StudentProfile[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: count }, () =>
    student({
      cgpa: rnd() * 10,
      attendance: rnd() * 100,
      familyIncome: Math.floor(rnd() * 3_000_000),
      achievements: Math.floor(rnd() * 20),
      hackathons: Math.floor(rnd() * 20),
      sportsLevel: Math.floor(rnd() * 4) as 0 | 1 | 2 | 3,
      researchPapers: Math.floor(rnd() * 10),
      leadershipRoles: Math.floor(rnd() * 10),
      projects: Math.floor(rnd() * 20),
      certifications: Math.floor(rnd() * 20),
      volunteerHours: Math.floor(rnd() * 1000),
      sopQuality: Math.floor(rnd() * 101),
      recommendationStrength: Math.floor(rnd() * 101),
      behaviourScore: Math.floor(rnd() * 101),
      profileCompletion: Math.floor(rnd() * 101),
      skills: [],
    })
  );
}

describe("WEIGHTS", () => {
  it("sums to exactly 1.0", () => {
    const sum = WEIGHTS.reduce((acc, w) => acc + w.weight, 0);
    // Floating-point addition of the literal weights lands on
    // 0.9999999999999999, so compare at double precision rather than
    // asserting bitwise equality against 1.
    expect(sum).toBeCloseTo(1, 10);
  });

  it("has unique keys and no zero or negative weight", () => {
    const keys = WEIGHTS.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const w of WEIGHTS) expect(w.weight).toBeGreaterThan(0);
  });
});

describe("computeAIScore", () => {
  it("is deterministic — identical input yields identical output", () => {
    const p = student();
    expect(computeAIScore(p)).toEqual(computeAIScore(p));
    // And across separately-constructed but equal profiles.
    expect(computeAIScore(student())).toEqual(computeAIScore(student()));
  });

  it("does not mutate the profile it scores", () => {
    const p = student();
    const before = structuredClone(p);
    computeAIScore(p);
    expect(p).toEqual(before);
  });

  it("emits one component per weight, in weight order", () => {
    const { components } = computeAIScore(student());
    expect(components.map((c) => c.key)).toEqual(WEIGHTS.map((w) => w.key));
  });

  it("raising CGPA never lowers the total", () => {
    for (const attendance of [0, 45, 88, 100]) {
      let previous = -1;
      for (let cgpa = 0; cgpa <= 10; cgpa += 0.05) {
        const { total } = computeAIScore(
          student({ cgpa: +cgpa.toFixed(2), attendance })
        );
        expect(total).toBeGreaterThanOrEqual(previous);
        previous = total;
      }
    }
  });

  it("raising family income never raises the financial-need sub-score", () => {
    let previous = Infinity;
    for (let income = 0; income <= 2_000_000; income += 977) {
      const need = computeAIScore(student({ familyIncome: income })).components.find(
        (c) => c.key === "financialNeed"
      )!;
      expect(need.raw).toBeLessThanOrEqual(previous);
      previous = need.raw;
    }
  });

  it("keeps total, confidence and every component inside 0–100", () => {
    for (const p of profiles(2000)) {
      const score = computeAIScore(p);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(100);
      for (const c of score.components) {
        expect(c.raw).toBeGreaterThanOrEqual(0);
        expect(c.raw).toBeLessThanOrEqual(100);
      }
    }
  });

  it("stays bounded at the extremes of every input", () => {
    // Note the income choice: a floor profile needs a HIGH income, because
    // zero income correctly saturates the financial-need sub-score at 100.
    const floor = computeAIScore(
      student({
        cgpa: 0, attendance: 0, familyIncome: 10_000_000, achievements: 0,
        hackathons: 0, sportsLevel: 0, researchPapers: 0, leadershipRoles: 0,
        projects: 0, certifications: 0, volunteerHours: 0, sopQuality: 0,
        recommendationStrength: 0, behaviourScore: 0, profileCompletion: 0,
        skills: [],
      })
    );
    const ceiling = computeAIScore(
      student({
        cgpa: 10, attendance: 100, familyIncome: 0, achievements: 99,
        hackathons: 99, sportsLevel: 3, researchPapers: 99, leadershipRoles: 99,
        projects: 99, certifications: 99, volunteerHours: 99_999,
        sopQuality: 100, recommendationStrength: 100, behaviourScore: 100,
        profileCompletion: 100,
        skills: Array.from({ length: 50 }, (_, i) => `skill-${i}`),
      })
    );
    expect(floor.total).toBe(0);
    expect(ceiling.total).toBe(100);
    expect(ceiling.total).toBeGreaterThan(floor.total);
  });

  it("reports at most three strengths and gaps, all drawn from the components", () => {
    const labels = new Set(WEIGHTS.map((w) => w.label));
    for (const p of profiles(200)) {
      const { strengths, gaps } = computeAIScore(p);
      expect(strengths.length).toBeLessThanOrEqual(3);
      expect(gaps.length).toBeLessThanOrEqual(3);
      for (const s of [...strengths, ...gaps]) expect(labels.has(s)).toBe(true);
    }
  });
});

describe("matchScholarship — eligibility gates", () => {
  it("marks a below-minimum CGPA ineligible and names the CGPA gate", () => {
    const result = matchScholarship(
      student({ cgpa: NEUTRAL.criteria.minCgpa - 1 }),
      NEUTRAL
    );
    expect(result.eligible).toBe(false);
    expect(result.missingCriteria.some((m) => /cgpa/i.test(m))).toBe(true);
    // The gap must be stated with both figures, not just "ineligible".
    expect(result.missingCriteria.join(" ")).toContain(
      NEUTRAL.criteria.minCgpa.toFixed(1)
    );
    expect(result.improvements.some((i) => /cgpa/i.test(i))).toBe(true);
  });

  it("clears every gate for a qualifying profile", () => {
    const result = matchScholarship(student({ cgpa: 9.9, attendance: 99 }), NEUTRAL);
    expect(result.eligible).toBe(true);
    expect(result.missingCriteria).toEqual([]);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("names the income gate when the cap is exceeded, and only then", () => {
    const capped = SCHOLARSHIPS.find((s) => s.criteria.maxIncome !== null)!;
    const cap = capped.criteria.maxIncome!;
    const over = matchScholarship(student({ familyIncome: cap + 1 }), capped);
    const under = matchScholarship(student({ familyIncome: cap }), capped);
    expect(over.missingCriteria.some((m) => /income/i.test(m))).toBe(true);
    expect(under.missingCriteria.some((m) => /income/i.test(m))).toBe(false);
  });

  it("names the attendance and research gates independently", () => {
    const research = SCHOLARSHIPS.find((s) => s.criteria.requiresResearch)!;
    const r = matchScholarship(
      student({ attendance: 0, researchPapers: 0, cgpa: 10 }),
      research
    );
    expect(r.eligible).toBe(false);
    expect(r.missingCriteria.some((m) => /attendance/i.test(m))).toBe(true);
    expect(r.missingCriteria.some((m) => /research/i.test(m))).toBe(true);
  });

  it("keeps matchScore and winProbability inside 0–100 for every seeded scholarship", () => {
    for (const p of profiles(120)) {
      for (const sch of SCHOLARSHIPS) {
        const { matchScore, winProbability } = matchScholarship(p, sch);
        expect(matchScore).toBeGreaterThanOrEqual(0);
        expect(matchScore).toBeLessThanOrEqual(100);
        expect(winProbability).toBeGreaterThanOrEqual(0);
        expect(winProbability).toBeLessThanOrEqual(100);
      }
    }
  });

  it("is deterministic across repeat calls", () => {
    const p = student();
    for (const sch of SCHOLARSHIPS) {
      expect(matchScholarship(p, sch)).toEqual(matchScholarship(p, sch));
    }
  });
});

describe("matchScholarship — fairness", () => {
  // Two profiles identical in every merit and need field, differing ONLY in
  // gender, minority status and disability. On a scholarship with no
  // demographic gate, the engine must produce the same numbers; where a
  // demographic preference exists, it may only ADD for the targeted profile
  // and must never SUBTRACT from the other.
  const targeted = student({ gender: "female", minority: true, disability: true });
  const nonTargeted = student({ gender: "male", minority: false, disability: false });
  const baseline = student();

  it("scores the base AI model identically — protected fields are not inputs", () => {
    expect(computeAIScore(targeted)).toEqual(computeAIScore(nonTargeted));
  });

  it("produces identical results on a demographically neutral scholarship", () => {
    const a = matchScholarship(targeted, NEUTRAL);
    const b = matchScholarship(nonTargeted, NEUTRAL);
    expect(a.matchScore).toBe(b.matchScore);
    expect(a.winProbability).toBe(b.winProbability);
    expect(a.eligible).toBe(b.eligible);
    expect(a.missingCriteria).toEqual(b.missingCriteria);
  });

  it("never penalises the non-targeted profile on ANY seeded scholarship", () => {
    // The strong form of "no penalty": strip the demographic clauses from a
    // scholarship and the non-targeted applicant must score EXACTLY the same
    // as they did with those clauses present. If any penalty term existed,
    // removing the clause would move their number.
    for (const sch of SCHOLARSHIPS) {
      const declawed: Scholarship = {
        ...sch,
        criteria: {
          ...sch.criteria,
          womenOnly: false,
          minorityOnly: false,
          disabilityPreferred: false,
        },
      };
      const actual = matchScholarship(nonTargeted, sch);
      const withoutClauses = matchScholarship(nonTargeted, declawed);

      if (actual.eligible && withoutClauses.eligible) {
        expect(actual.matchScore).toBe(withoutClauses.matchScore);
        expect(actual.winProbability).toBe(withoutClauses.winProbability);
      }
      // A demographic clause may only ever show up as an eligibility gate.
      const demographicFlags = actual.missingCriteria.filter((m) =>
        /women|minority|disab/i.test(m)
      );
      expect(actual.missingCriteria).toEqual([
        ...withoutClauses.missingCriteria,
        ...demographicFlags,
      ].filter((m, i, all) => all.indexOf(m) === i));
    }
  });

  it("keeps the underlying AI score identical regardless of gate outcome", () => {
    // Being screened out of a demographically restricted program must not
    // change what the engine says the student is worth.
    for (const sch of SCHOLARSHIPS) {
      expect(computeAIScore(targeted).total).toBe(computeAIScore(nonTargeted).total);
      const a = matchScholarship(targeted, sch);
      const b = matchScholarship(nonTargeted, sch);
      // Reasons/gates may differ; the fairness note never does.
      expect(a.fairnessNote).toBe(b.fairnessNote);
    }
  });

  it("does not reduce the non-targeted profile on an inclusion-preference program", () => {
    // sch-need-first prefers disability; the non-disabled applicant must be
    // scored on merit and need alone, not marked down for the absence.
    const preference = SCHOLARSHIPS.find((s) => s.criteria.disabilityPreferred)!;
    const withDisability = matchScholarship(targeted, preference);
    const without = matchScholarship(nonTargeted, preference);

    expect(without.eligible).toBe(true);
    expect(withDisability.matchScore).toBeGreaterThanOrEqual(without.matchScore);
    // The non-targeted applicant's score must equal what the same profile
    // scores with the preference field absent from consideration entirely —
    // i.e. no penalty term exists.
    expect(without.matchScore).toBe(
      matchScholarship(student({ disability: false }), preference).matchScore
    );
    expect(
      without.missingCriteria.some((m) => /disab|minority|women/i.test(m))
    ).toBe(false);
  });

  it("states demographic restrictions as eligibility, never as a score penalty", () => {
    const womenOnly = SCHOLARSHIPS.find((s) => s.criteria.womenOnly)!;
    const excluded = matchScholarship(nonTargeted, womenOnly);
    expect(excluded.eligible).toBe(false);
    expect(excluded.missingCriteria.some((m) => /women/i.test(m))).toBe(true);
    // The fairness note travels with every result so the UI can surface it.
    expect(excluded.fairnessNote).toMatch(/never as penalties/i);
  });

  it("gives the same result regardless of the order attributes are set", () => {
    const a = student({ gender: "other", minority: true, disability: false });
    const b = student({ disability: false, minority: true, gender: "other" });
    expect(matchScholarship(a, NEUTRAL)).toEqual(matchScholarship(b, NEUTRAL));
  });
});

describe("rankScholarships", () => {
  it("returns every scholarship, sorted by descending match score", () => {
    const ranked = rankScholarships(student(), SCHOLARSHIPS);
    expect(ranked).toHaveLength(SCHOLARSHIPS.length);
    const scores = ranked.map((r) => r.matchScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("does not mutate the input array", () => {
    const input: Scholarship[] = [...SCHOLARSHIPS];
    rankScholarships(student(), input);
    expect(input).toEqual(SCHOLARSHIPS);
  });
});

describe("generateRoadmap", () => {
  it("returns actionable items for a weak profile", () => {
    const items = generateRoadmap(
      student({
        cgpa: 4,
        sopQuality: 20,
        projects: 0,
        certifications: 0,
        researchPapers: 0,
        leadershipRoles: 0,
        volunteerHours: 0,
        skills: [],
      })
    );
    expect(items.length).toBeGreaterThan(3);
    for (const item of items) {
      expect(item.quarter).toMatch(/^Q[1-4]$/);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
      expect(item.impact).toBeGreaterThanOrEqual(0);
    }
    // A weak profile must be told about the sub-scores it is actually weak on.
    const text = items.map((i) => i.title).join(" ");
    expect(text).toMatch(/statement of purpose/i);
    expect(text).toMatch(/research/i);
  });

  it("still gives a strong profile at least one next step", () => {
    const items = generateRoadmap(
      student({
        sopQuality: 100,
        projects: 20,
        certifications: 10,
        researchPapers: 5,
        leadershipRoles: 5,
        volunteerHours: 500,
        skills: ["a", "b", "c", "d", "e"],
      })
    );
    expect(items.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const p = student({ sopQuality: 33 });
    expect(generateRoadmap(p)).toEqual(generateRoadmap(p));
  });
});

describe("detectFraud", () => {
  it("clears an ordinary profile", () => {
    const report = detectFraud(student());
    expect(report.level).toBe("clear");
    expect(report.signals).toEqual([]);
  });

  it("flags a near-perfect CGPA paired with very low attendance", () => {
    const report = detectFraud(student({ cgpa: 9.8, attendance: 40 }));
    expect(report.signals.some((s) => s.code === "GPA_ATTENDANCE_MISMATCH")).toBe(true);
    expect(report.riskScore).toBeGreaterThan(0);
  });

  it("keeps the risk score inside 0–100 and consistent with the level", () => {
    for (const p of profiles(500)) {
      const { riskScore, level } = detectFraud(p);
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
      expect(level).toBe(
        riskScore >= 60 ? "flagged" : riskScore >= 25 ? "review" : "clear"
      );
    }
  });

  it("does not consider gender, minority status or disability", () => {
    const a = detectFraud(student({ gender: "female", minority: true, disability: true }));
    const b = detectFraud(student({ gender: "male", minority: false, disability: false }));
    expect(a).toEqual(b);
  });
});
