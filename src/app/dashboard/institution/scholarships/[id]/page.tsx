import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import ScholarshipForm from "../ScholarshipForm";

export default async function EditScholarshipPage({
  params,
}: PageProps<"/dashboard/institution/scholarships/[id]">) {
  const { id } = await params;
  const me = await getSessionProfile();
  if (!me) redirect(`/login?next=/dashboard/institution/scholarships/${id}`);

  const ds = await getDataSource();
  const institution = await ds.getInstitutionForProfile(me.id);
  if (!institution) redirect("/dashboard/institution");

  // Scoped by institution id: a program another org owns is simply absent.
  const scholarship = await ds.getInstitutionScholarship(institution.id, id);
  if (!scholarship) notFound();

  return (
    <DashboardShell
      title="Edit program"
      subtitle={`${scholarship.name} · ${scholarship.applicants} applications received`}
    >
      <ScholarshipForm scholarship={scholarship} readOnly={ds.mode === "demo"} />
    </DashboardShell>
  );
}
