import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import StudentDashboardView from "./StudentDashboardView";
import EmptyProfileNotice from "./EmptyProfileNotice";

export default async function StudentDashboardPage() {
  const me = await getSessionProfile();
  if (!me) redirect("/login?next=/dashboard/student");

  const ds = await getDataSource();
  const [student, scholarships, applications] = await Promise.all([
    ds.getStudentProfile(me.id),
    ds.getScholarships(),
    ds.getApplications(me.id),
  ]);

  // A freshly registered account has no academic data yet — the engine
  // needs inputs before any score is meaningful.
  if (!student) return <EmptyProfileNotice name={me.name} />;

  return (
    <StudentDashboardView
      student={student}
      scholarships={scholarships}
      applications={applications}
    />
  );
}
