import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import ScholarshipForm from "../ScholarshipForm";

export default async function NewScholarshipPage() {
  const me = await getSessionProfile();
  if (!me) redirect("/login?next=/dashboard/institution/scholarships/new");

  const ds = await getDataSource();
  const institution = await ds.getInstitutionForProfile(me.id);
  if (!institution) redirect("/dashboard/institution");

  return (
    <DashboardShell
      title="New program"
      subtitle={`${institution.orgName} · criteria become live eligibility gates`}
    >
      <ScholarshipForm scholarship={null} readOnly={ds.mode === "demo"} />
    </DashboardShell>
  );
}
