import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import ScholarshipDetail from "./detail";

export default async function ScholarshipPage({
  params,
}: PageProps<"/scholarships/[id]">) {
  const { id } = await params;
  const ds = await getDataSource();
  const scholarship = await ds.getScholarship(id);
  if (!scholarship) notFound();

  const me = await getSessionProfile();
  const [student, application] = await Promise.all([
    me?.role === "student" ? ds.getStudentProfile(me.id) : Promise.resolve(null),
    me ? ds.getApplication(me.id, id) : Promise.resolve(null),
  ]);

  return (
    <ScholarshipDetail
      scholarship={scholarship}
      student={student}
      application={application}
      canApply={me?.role === "student"}
    />
  );
}
