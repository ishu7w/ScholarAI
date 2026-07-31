"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { StudentProfile } from "@/lib/types";
import { saveProfileAction } from "@/lib/profile/actions";
import { WEIGHTS } from "@/lib/ai-engine";

// Which published weight each field feeds — shown inline so the
// explainability claim holds on the editing surface too.
const FEEDS: Record<string, string> = {
  cgpa: "academic",
  attendance: "academic",
  familyIncome: "financialNeed",
  achievements: "achievements",
  hackathons: "achievements",
  researchPapers: "research",
  projects: "projects",
  certifications: "projects",
  skills: "projects",
  leadershipRoles: "leadership",
  volunteerHours: "community",
  sopQuality: "sop",
  recommendationStrength: "recommendations",
};

function weightLabel(key?: string) {
  if (!key) return null;
  const w = WEIGHTS.find((x) => x.key === key);
  return w ? `${w.label} · ${Math.round(w.weight * 100)}%` : null;
}

export default function ProfileForm({
  profile,
  name,
  currentScore,
  readOnly,
}: {
  profile: StudentProfile | null;
  name: string;
  currentScore: number | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    // Unchecked checkboxes are absent from FormData.
    for (const k of ["minority", "disability", "firstGeneration"]) {
      payload[k] = fd.get(k) ? "true" : "";
    }
    const result = await saveProfileAction(payload);
    if (result.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl"
    >
      {readOnly && (
        <div className="hairline mb-8 flex items-center gap-3 px-4 py-3">
          <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
          <span className="mono-label text-muted">
            Demo mode — edits are not persisted. Connect a database to save.
          </span>
        </div>
      )}

      {currentScore !== null && (
        <div className="hairline mb-8 flex items-center justify-between px-5 py-4">
          <span className="mono-label text-muted">Current AI profile score</span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold">
            {currentScore}
            <span className="text-muted">/100</span>
          </span>
        </div>
      )}

      <Section title="Identity">
        <Field label="Full name" name="name" defaultValue={name} required />
        <Field label="Field of study" name="field" defaultValue={profile?.field} required />
        <Field label="Degree" name="degree" defaultValue={profile?.degree} />
        <Field
          label="Year of study"
          name="year"
          type="number"
          min={1}
          max={8}
          defaultValue={profile?.year ?? 1}
        />
        <Field label="Location" name="location" defaultValue={profile?.location} />
      </Section>

      <Section title="Academic">
        <Field
          label="CGPA (0–10)"
          name="cgpa"
          type="number"
          step="0.01"
          min={0}
          max={10}
          defaultValue={profile?.cgpa ?? 0}
          feeds="cgpa"
        />
        <Field
          label="Attendance %"
          name="attendance"
          type="number"
          min={0}
          max={100}
          defaultValue={profile?.attendance ?? 0}
          feeds="attendance"
        />
      </Section>

      <Section title="Financial">
        <Field
          label="Annual family income (USD)"
          name="familyIncome"
          type="number"
          min={0}
          defaultValue={profile?.familyIncome ?? 0}
          feeds="familyIncome"
        />
        <SelectField
          label="Gender"
          name="gender"
          defaultValue={profile?.gender ?? "other"}
          options={[
            ["female", "Female"],
            ["male", "Male"],
            ["other", "Other / prefer not to say"],
          ]}
        />
        <Checkbox label="Minority community" name="minority" defaultChecked={profile?.minority} />
        <Checkbox label="Disability" name="disability" defaultChecked={profile?.disability} />
        <Checkbox
          label="First-generation student"
          name="firstGeneration"
          defaultChecked={profile?.firstGeneration}
        />
        <p className="mono-label col-span-full text-muted">
          Demographic fields are used only for inclusion preferences on programs
          that explicitly target those groups — never as penalties.
        </p>
      </Section>

      <Section title="Merit signals">
        <Field label="Awards / achievements" name="achievements" type="number" min={0} defaultValue={profile?.achievements ?? 0} feeds="achievements" />
        <Field label="Hackathons" name="hackathons" type="number" min={0} defaultValue={profile?.hackathons ?? 0} feeds="hackathons" />
        <Field label="Research papers" name="researchPapers" type="number" min={0} defaultValue={profile?.researchPapers ?? 0} feeds="researchPapers" />
        <Field label="Projects" name="projects" type="number" min={0} defaultValue={profile?.projects ?? 0} feeds="projects" />
        <Field label="Certifications" name="certifications" type="number" min={0} defaultValue={profile?.certifications ?? 0} feeds="certifications" />
        <SelectField
          label="Sports level"
          name="sportsLevel"
          defaultValue={String(profile?.sportsLevel ?? 0)}
          options={[
            ["0", "None"],
            ["1", "District"],
            ["2", "State"],
            ["3", "National"],
          ]}
        />
        <Field label="Leadership roles" name="leadershipRoles" type="number" min={0} defaultValue={profile?.leadershipRoles ?? 0} feeds="leadershipRoles" />
        <Field label="Volunteer hours" name="volunteerHours" type="number" min={0} defaultValue={profile?.volunteerHours ?? 0} feeds="volunteerHours" />
        <Field label="Previous scholarships" name="previousScholarships" type="number" min={0} defaultValue={profile?.previousScholarships ?? 0} />
        <Field
          label="Skills (comma separated)"
          name="skills"
          defaultValue={profile?.skills.join(", ")}
          feeds="skills"
          wide
        />
      </Section>

      <Section title="Application quality">
        <Field label="Statement of purpose score (0–100)" name="sopQuality" type="number" min={0} max={100} defaultValue={profile?.sopQuality ?? 0} feeds="sopQuality" />
        <Field label="Recommendation strength (0–100)" name="recommendationStrength" type="number" min={0} max={100} defaultValue={profile?.recommendationStrength ?? 0} feeds="recommendationStrength" />
      </Section>

      {error && (
        <div role="alert" className="hairline mt-6 flex items-center gap-3 border-primary px-4 py-3">
          <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
          <span className="mono-label text-primary">{error}</span>
        </div>
      )}

      <div className="mt-10 flex items-center gap-4 border-t border-[rgba(21,21,21,0.16)] pt-8">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save profile"
          )}
        </button>
        {saved && (
          <span className="mono-label flex items-center gap-2 text-success">
            <Check className="h-4 w-4" /> Saved — score recalculated
          </span>
        )}
      </div>
    </motion.form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-10">
      <legend className="mono-label mb-4 w-full border-b border-[rgba(21,21,21,0.16)] pb-3 text-primary">
        {title}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  feeds,
  wide,
  ...rest
}: {
  label: string;
  name: string;
  feeds?: string;
  wide?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const w = weightLabel(FEEDS[feeds ?? ""]);
  return (
    <label className={wide ? "sm:col-span-2" : undefined}>
      <span className="mono-label mb-2 flex items-baseline justify-between gap-3">
        {label}
        {w && <span className="text-muted">→ {w}</span>}
      </span>
      <input name={name} className="input-premium" {...rest} />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: [string, string][];
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="mono-label mb-2 block">{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-premium appearance-none">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--foreground)]"
      />
      <span className="mono-label">{label}</span>
    </label>
  );
}
