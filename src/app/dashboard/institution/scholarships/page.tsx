import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InstitutionScholarshipsPage() {
  const me = await getSessionProfile();
  if (!me) redirect("/login?next=/dashboard/institution/scholarships");

  const ds = await getDataSource();
  const institution = await ds.getInstitutionForProfile(me.id);
  if (!institution) redirect("/dashboard/institution");

  const scholarships = await ds.getInstitutionScholarships(institution.id);

  return (
    <DashboardShell
      title="Your programs"
      subtitle={`${institution.orgName} · ${scholarships.length} program${scholarships.length === 1 ? "" : "s"}`}
    >
      <div className="max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="mono-label text-muted">
            Criteria here are the eligibility gates the scoring engine enforces
          </p>
          <Link href="/dashboard/institution/scholarships/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New program
          </Link>
        </div>

        {scholarships.length === 0 ? (
          <div className="hairline p-8">
            <p className="mono-label text-primary">No programs yet</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Your institution has not published a scholarship. Create one and it
              becomes visible to students, with its criteria enforced by the
              engine on every application.
            </p>
          </div>
        ) : (
          <ul className="border-t border-[rgba(21,21,21,0.16)]">
            {scholarships.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-4 border-b border-[rgba(21,21,21,0.16)] px-1 py-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <Link
                      href={`/dashboard/institution/scholarships/${s.id}`}
                      className="font-medium transition-colors hover:text-primary"
                    >
                      {s.name}
                    </Link>
                    <span className="mono-label text-muted">{s.category}</span>
                    <span className="mono-label text-muted">{s.status}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {formatCurrency(s.amount, s.currency)} · {s.seats} seats ·{" "}
                    {s.applicants} applicants · closes {formatDate(s.deadline)}
                  </p>
                  <p className="mt-1.5 text-xs text-muted">
                    Min CGPA {s.criteria.minCgpa.toFixed(1)} · min attendance{" "}
                    {s.criteria.minAttendance}% ·{" "}
                    {s.criteria.maxIncome === null
                      ? "no income cap"
                      : `income cap ${formatCurrency(s.criteria.maxIncome, s.currency)}`}
                  </p>
                </div>
                <Link
                  href={`/dashboard/institution/scholarships/${s.id}`}
                  className="btn-ghost !px-3 !py-1.5 text-xs"
                  aria-label={`Edit ${s.name}`}
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
