// ─────────────────────────────────────────────────────────────
// ScholarAI — seed data (deterministic, demo-ready)
// ─────────────────────────────────────────────────────────────

import type { Applicant, Scholarship, StudentProfile } from "./types";

export const SCHOLARSHIPS: Scholarship[] = [
  {
    id: "sch-merit-excellence",
    name: "National Merit Excellence Award",
    provider: "Ministry of Education",
    category: "Government",
    amount: 12000,
    currency: "USD",
    deadline: "2026-10-15",
    seats: 500,
    applicants: 8420,
    description:
      "Flagship national scholarship rewarding top academic performers with full tuition support and a research stipend.",
    criteria: {
      minCgpa: 8.5, maxIncome: null, minAttendance: 85,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: [], fields: [],
    },
    tags: ["merit", "tuition", "national"],
  },
  {
    id: "sch-stem-women",
    name: "Women in STEM Leadership Grant",
    provider: "Futura Foundation",
    category: "Women",
    amount: 8000,
    currency: "USD",
    deadline: "2026-09-30",
    seats: 200,
    applicants: 3150,
    description:
      "Supports women pursuing STEM degrees who show leadership potential, with mentorship from industry leaders.",
    criteria: {
      minCgpa: 7.5, maxIncome: null, minAttendance: 75,
      requiresResearch: false, requiresLeadership: true,
      womenOnly: true, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: [],
      fields: ["Computer Science", "Engineering", "Mathematics", "Physics", "Biology"],
    },
    tags: ["stem", "leadership", "mentorship", "python", "research"],
  },
  {
    id: "sch-need-first",
    name: "First Horizon Need-Based Fund",
    provider: "Horizon Trust NGO",
    category: "Need-based",
    amount: 6500,
    currency: "USD",
    deadline: "2026-08-20",
    seats: 800,
    applicants: 12600,
    description:
      "Covers tuition and living costs for students from low-income households, with priority for first-generation students.",
    criteria: {
      minCgpa: 6.0, maxIncome: 15000, minAttendance: 70,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: true, locations: [], fields: [],
    },
    tags: ["need-based", "living-costs", "first-generation"],
  },
  {
    id: "sch-research-grant",
    name: "Emerging Researcher Grant",
    provider: "Global Science Council",
    category: "Research Grant",
    amount: 15000,
    currency: "USD",
    deadline: "2026-11-30",
    seats: 120,
    applicants: 1900,
    description:
      "Funds undergraduate and graduate research with publication support, conference travel, and lab access.",
    criteria: {
      minCgpa: 8.0, maxIncome: null, minAttendance: 80,
      requiresResearch: true, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: [],
      fields: ["Computer Science", "Engineering", "Physics", "Biology", "Chemistry"],
    },
    tags: ["research", "publication", "conference", "machine learning"],
  },
  {
    id: "sch-corporate-tech",
    name: "TechForward Scholars Program",
    provider: "NovaTech Corp",
    category: "Corporate",
    amount: 10000,
    currency: "USD",
    deadline: "2026-09-10",
    seats: 300,
    applicants: 7800,
    description:
      "Corporate scholarship with guaranteed internship interviews for high-performing tech students.",
    criteria: {
      minCgpa: 7.0, maxIncome: null, minAttendance: 75,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: [],
      fields: ["Computer Science", "Engineering"],
    },
    tags: ["internship", "tech", "javascript", "python", "react"],
  },
  {
    id: "sch-minority-access",
    name: "Equal Access Minority Scholarship",
    provider: "Unity Education Fund",
    category: "Minority",
    amount: 7000,
    currency: "USD",
    deadline: "2026-10-01",
    seats: 400,
    applicants: 5200,
    description:
      "Dedicated to students from minority communities, covering tuition and providing career counselling.",
    criteria: {
      minCgpa: 6.5, maxIncome: 40000, minAttendance: 70,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: true, sportsRequired: false,
      disabilityPreferred: false, locations: [], fields: [],
    },
    tags: ["minority", "inclusion", "counselling"],
  },
  {
    id: "sch-sports-champion",
    name: "Champion Athlete Scholarship",
    provider: "National Sports Authority",
    category: "Sports",
    amount: 9000,
    currency: "USD",
    deadline: "2026-08-31",
    seats: 150,
    applicants: 2100,
    description:
      "For state and national level athletes balancing competitive sports with academics.",
    criteria: {
      minCgpa: 6.0, maxIncome: null, minAttendance: 60,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: true,
      disabilityPreferred: false, locations: [], fields: [],
    },
    tags: ["sports", "athletics", "national"],
  },
  {
    id: "sch-intl-mobility",
    name: "Global Mobility Exchange Award",
    provider: "World Education Alliance",
    category: "International",
    amount: 20000,
    currency: "USD",
    deadline: "2026-12-15",
    seats: 80,
    applicants: 4600,
    description:
      "Full funding for one exchange year abroad, including travel, tuition, and living allowance.",
    criteria: {
      minCgpa: 8.8, maxIncome: null, minAttendance: 90,
      requiresResearch: true, requiresLeadership: true,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: [], fields: [],
    },
    tags: ["international", "exchange", "travel", "research"],
  },
  {
    id: "sch-university-dean",
    name: "Dean's Distinction Scholarship",
    provider: "State University",
    category: "University",
    amount: 5000,
    currency: "USD",
    deadline: "2026-09-05",
    seats: 250,
    applicants: 3900,
    description:
      "University merit award for students in the top decile of their cohort with strong conduct records.",
    criteria: {
      minCgpa: 8.2, maxIncome: null, minAttendance: 85,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: ["Delhi", "Mumbai", "Bengaluru"], fields: [],
    },
    tags: ["merit", "university", "dean"],
  },
  {
    id: "sch-ngo-uplift",
    name: "Uplift Rural Talent Program",
    provider: "Sahara NGO",
    category: "NGO",
    amount: 4000,
    currency: "USD",
    deadline: "2026-08-25",
    seats: 600,
    applicants: 9100,
    description:
      "Targets talented students from rural and semi-urban regions with financial need and strong community involvement.",
    criteria: {
      minCgpa: 6.0, maxIncome: 12000, minAttendance: 65,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: true, locations: [], fields: [],
    },
    tags: ["rural", "need-based", "community"],
  },
  {
    id: "sch-private-innovators",
    name: "Young Innovators Fellowship",
    provider: "Vertex Capital",
    category: "Private",
    amount: 11000,
    currency: "USD",
    deadline: "2026-10-20",
    seats: 100,
    applicants: 2700,
    description:
      "Backs student builders with shipped projects — hackathon winners and open-source contributors preferred.",
    criteria: {
      minCgpa: 7.0, maxIncome: null, minAttendance: 70,
      requiresResearch: false, requiresLeadership: true,
      womenOnly: false, minorityOnly: false, sportsRequired: false,
      disabilityPreferred: false, locations: [],
      fields: ["Computer Science", "Engineering", "Design"],
    },
    tags: ["innovation", "hackathon", "projects", "javascript", "react"],
  },
  {
    id: "sch-merit-stem-minority",
    name: "Bright Path STEM Minority Award",
    provider: "Lumen Foundation",
    category: "Minority",
    amount: 8500,
    currency: "USD",
    deadline: "2026-11-10",
    seats: 180,
    applicants: 2400,
    description:
      "Merit-plus-inclusion award for minority students excelling in STEM disciplines.",
    criteria: {
      minCgpa: 7.8, maxIncome: 60000, minAttendance: 80,
      requiresResearch: false, requiresLeadership: false,
      womenOnly: false, minorityOnly: true, sportsRequired: false,
      disabilityPreferred: false, locations: [],
      fields: ["Computer Science", "Engineering", "Mathematics", "Physics"],
    },
    tags: ["stem", "minority", "merit", "python"],
  },
];

export const DEMO_STUDENT: StudentProfile = {
  id: "stu-aarya",
  name: "Aarya Sharma",
  email: "aarya@university.edu",
  avatarHue: 258,
  field: "Computer Science",
  degree: "B.Tech",
  year: 3,
  location: "Delhi",
  cgpa: 8.7,
  attendance: 88,
  familyIncome: 11000,
  gender: "female",
  minority: false,
  disability: false,
  firstGeneration: true,
  achievements: 4,
  researchPapers: 1,
  hackathons: 5,
  sportsLevel: 1,
  certifications: 2,
  leadershipRoles: 2,
  volunteerHours: 120,
  projects: 6,
  skills: ["Python", "Machine Learning", "React", "SQL", "Research"],
  previousScholarships: 1,
  behaviourScore: 92,
  sopQuality: 71,
  recommendationStrength: 84,
  profileCompletion: 86,
};

// deterministic pseudo-random from a seed — stable across renders/builds
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const FIRST = ["Ishaan", "Meera", "Rohan", "Ananya", "Kabir", "Diya", "Arjun", "Zara", "Vivaan", "Sana", "Aditya", "Priya", "Neil", "Tara", "Dev", "Rhea", "Kian", "Nyra", "Om", "Ira"];
const LAST = ["Patel", "Reddy", "Khan", "Iyer", "Das", "Mehta", "Singh", "Nair", "Bose", "Kaur", "Rao", "Joshi", "Verma", "Shah", "Gupta", "Menon", "Chopra", "Pillai", "Sinha", "Roy"];
const FIELDS = ["Computer Science", "Engineering", "Mathematics", "Physics", "Biology", "Economics", "Design"];
const LOCATIONS = ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Jaipur"];

export function generateStudents(count: number, seed = 42): StudentProfile[] {
  const rnd = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const gender = rnd() < 0.48 ? "female" : rnd() < 0.96 ? "male" : "other";
    return {
      id: `stu-${i + 100}`,
      name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      email: `student${i + 100}@university.edu`,
      avatarHue: Math.floor(rnd() * 360),
      field: FIELDS[Math.floor(rnd() * FIELDS.length)],
      degree: rnd() < 0.7 ? "B.Tech" : rnd() < 0.5 ? "B.Sc" : "M.Tech",
      year: 1 + Math.floor(rnd() * 4),
      location: LOCATIONS[Math.floor(rnd() * LOCATIONS.length)],
      cgpa: +(5.5 + rnd() * 4.4).toFixed(2),
      attendance: Math.floor(55 + rnd() * 45),
      familyIncome: Math.floor(4000 + rnd() * rnd() * 90000),
      gender: gender as StudentProfile["gender"],
      minority: rnd() < 0.28,
      disability: rnd() < 0.07,
      firstGeneration: rnd() < 0.35,
      achievements: Math.floor(rnd() * 6),
      researchPapers: rnd() < 0.7 ? 0 : Math.floor(rnd() * 4),
      hackathons: Math.floor(rnd() * 7),
      sportsLevel: (rnd() < 0.6 ? 0 : Math.ceil(rnd() * 3)) as StudentProfile["sportsLevel"],
      certifications: Math.floor(rnd() * 6),
      leadershipRoles: Math.floor(rnd() * 4),
      volunteerHours: Math.floor(rnd() * 300),
      projects: Math.floor(rnd() * 10),
      skills: ["Python", "React", "SQL", "Machine Learning", "Java", "Communication", "Statistics"].filter(() => rnd() < 0.4),
      previousScholarships: rnd() < 0.75 ? 0 : Math.floor(rnd() * 5),
      behaviourScore: Math.floor(35 + rnd() * 65),
      sopQuality: Math.floor(30 + rnd() * 70),
      recommendationStrength: Math.floor(40 + rnd() * 60),
      profileCompletion: Math.floor(50 + rnd() * 50),
    };
  });
}

export function generateApplicants(count = 60): Applicant[] {
  const students = generateStudents(count, 77);
  const rnd = seeded(1234);
  const statuses: Applicant["status"][] = ["pending", "shortlisted", "approved", "rejected", "review"];
  return students.map((student) => {
    const total = 3 + Math.floor(rnd() * 4);
    return {
      student,
      scholarshipId: SCHOLARSHIPS[Math.floor(rnd() * SCHOLARSHIPS.length)].id,
      appliedOn: new Date(2026, 5 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 27)).toISOString(),
      status: statuses[Math.floor(rnd() * statuses.length)],
      documentsVerified: Math.floor(rnd() * (total + 1)),
      documentsTotal: total,
    };
  });
}

// ---------- analytics series (deterministic) ----------

export const MONTHLY_APPLICATIONS = [
  { month: "Feb", applications: 3200, approvals: 410, ai: 2100 },
  { month: "Mar", applications: 4100, approvals: 520, ai: 2900 },
  { month: "Apr", applications: 3800, approvals: 490, ai: 3100 },
  { month: "May", applications: 5200, approvals: 640, ai: 4400 },
  { month: "Jun", applications: 6900, approvals: 810, ai: 6100 },
  { month: "Jul", applications: 8400, approvals: 1020, ai: 7900 },
];

export const CATEGORY_DISTRIBUTION = [
  { name: "Merit", value: 28 },
  { name: "Need-based", value: 24 },
  { name: "Research", value: 14 },
  { name: "Corporate", value: 12 },
  { name: "Women", value: 10 },
  { name: "Sports", value: 7 },
  { name: "Other", value: 5 },
];

export const REGION_HEAT = [
  { region: "Delhi", students: 2140, funded: 480 },
  { region: "Mumbai", students: 1890, funded: 410 },
  { region: "Bengaluru", students: 2320, funded: 560 },
  { region: "Chennai", students: 1450, funded: 300 },
  { region: "Kolkata", students: 1210, funded: 260 },
  { region: "Hyderabad", students: 1680, funded: 390 },
  { region: "Pune", students: 1330, funded: 310 },
  { region: "Jaipur", students: 890, funded: 170 },
];
