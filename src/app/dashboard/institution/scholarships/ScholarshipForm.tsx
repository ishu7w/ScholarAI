"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import {
  createScholarshipAction,
  updateScholarshipAction,
} from "@/lib/institution/actions";
import type { InstitutionScholarship } from "@/lib/datasource";

const CATEGORIES = [
  "Government",
  "Private",
  "NGO",
  "University",
  "International",
  "Corporate",
  "Research Grant",
  "Need-based",
  "Merit",
  "Women",
  "Minority",
  "Sports",
];

// Which engine gate each criteria field controls — the same
// explainability contract the student profile editor keeps.
const GATES: Record<string, string> = {
  minCgpa: "Hard gate · CGPA below this is ineligible",
  maxIncome: "Hard gate · blank means no income cap",
  minAttendance: "Hard gate · attendance below this is ineligible",
  locations: "Hard gate · blank means anywhere",
  fields: "Hard gate · blank means any field",
};

export default function ScholarshipForm({
  scholarship,
  readOnly,
}: {
  scholarship: InstitutionScholarship | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const c = scholarship?.criteria;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    // Unchecked checkboxes are absent from FormData.
    for (const k of [
      "requiresResearch",
      "requiresLeadership",
      "womenOnly",
      "minorityOnly",
      "sportsRequired",
      "disabilityPreferred",
    ]) {
      payload[k] = fd.get(k) ? "true" : "";
    }

    const result = scholarship
      ? await updateScholarshipAction({ ...payload, id: scholarship.id })
      : await createScholarshipAction(payload);

    if (result.ok) {
      setSaved(true);
      if (!scholarship && "id" in result && result.id) {
        router.push(`/dashboard/institution/scholarships/${result.id}`);
      } else {
        router.refresh();
      }
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

      <Section title="Program">
        <Field label="Name" name="name" defaultValue={scholarship?.name} required wide />
        <Field label="Provider" name="provider" defaultValue={scholarship?.provider} required />
        <SelectField
          label="Category"
          name="category"
          defaultValue={scholarship?.category ?? "Merit"}
          options={CATEGORIES.map((x) => [x, x] as [string, string])}
        />
        <Field
          label="Award amount"
          name="amount"
          type="number"
          min={0}
          defaultValue={scholarship?.amount ?? 0}
          required
        />
        <Field
          label="Currency (3-letter code)"
          name="currency"
          maxLength={3}
          defaultValue={scholarship?.currency ?? "USD"}
          required
        />
        <Field
          label="Deadline"
          name="deadline"
          type="date"
          defaultValue={scholarship?.deadline}
          required
        />
        <Field
          label="Seats"
          name="seats"
          type="number"
          min={1}
          defaultValue={scholarship?.seats ?? 1}
          required
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={scholarship?.status ?? "active"}
          options={[
            ["draft", "Draft — not visible to students"],
            ["active", "Active — accepting applications"],
            ["closed", "Closed"],
          ]}
        />
        <TextArea
          label="Description"
          name="description"
          defaultValue={scholarship?.description}
          required
        />
        <Field
          label="Tags (comma separated)"
          name="tags"
          defaultValue={scholarship?.tags.join(", ")}
          wide
        />
      </Section>

      <Section title="Eligibility criteria">
        <Field
          label="Minimum CGPA (0–10)"
          name="minCgpa"
          type="number"
          step="0.1"
          min={0}
          max={10}
          defaultValue={c?.minCgpa ?? 0}
          gate="minCgpa"
        />
        <Field
          label="Maximum family income (blank = no cap)"
          name="maxIncome"
          type="number"
          min={0}
          defaultValue={c?.maxIncome ?? ""}
          gate="maxIncome"
        />
        <Field
          label="Minimum attendance %"
          name="minAttendance"
          type="number"
          min={0}
          max={100}
          defaultValue={c?.minAttendance ?? 0}
          gate="minAttendance"
        />
        <Field
          label="Eligible locations (comma separated)"
          name="locations"
          defaultValue={c?.locations.join(", ")}
          gate="locations"
          wide
        />
        <Field
          label="Eligible fields of study (comma separated)"
          name="fields"
          defaultValue={c?.fields.join(", ")}
          gate="fields"
          wide
        />
        <Checkbox
          label="Requires a research publication"
          name="requiresResearch"
          defaultChecked={c?.requiresResearch}
        />
        <Checkbox
          label="Requires demonstrated leadership"
          name="requiresLeadership"
          defaultChecked={c?.requiresLeadership}
        />
        <Checkbox label="Women only" name="womenOnly" defaultChecked={c?.womenOnly} />
        <Checkbox
          label="Minority community only"
          name="minorityOnly"
          defaultChecked={c?.minorityOnly}
        />
        <Checkbox
          label="Competitive sports required"
          name="sportsRequired"
          defaultChecked={c?.sportsRequired}
        />
        <Checkbox
          label="Disability-inclusive preference"
          name="disabilityPreferred"
          defaultChecked={c?.disabilityPreferred}
        />
        <p className="mono-label col-span-full text-muted">
          Restriction fields gate eligibility only for programs that explicitly
          target those groups — the engine never applies them as penalties.
          Every change here is written to the audit log.
        </p>
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
          ) : scholarship ? (
            "Save program"
          ) : (
            "Create program"
          )}
        </button>
        {saved && (
          <span className="mono-label flex items-center gap-2 text-success">
            <Check className="h-4 w-4" /> Saved — criteria change logged
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
  gate,
  wide,
  ...rest
}: {
  label: string;
  name: string;
  gate?: string;
  wide?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hint = GATES[gate ?? ""];
  return (
    <label className={wide ? "sm:col-span-2" : undefined}>
      <span className="mono-label mb-2 flex items-baseline justify-between gap-3">
        {label}
        {hint && <span className="text-muted">→ {hint}</span>}
      </span>
      <input name={name} className="input-premium" {...rest} />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="sm:col-span-2">
      <span className="mono-label mb-2 block">{label}</span>
      <textarea
        name={name}
        rows={4}
        defaultValue={defaultValue}
        required={required}
        className="input-premium resize-y"
      />
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
