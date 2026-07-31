import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import ExplorerView from "./ExplorerView";

export default async function ScholarshipsPage() {
  const me = await getSessionProfile();
  const ds = await getDataSource();

  const [scholarships, student, applications] = await Promise.all([
    ds.getScholarships(),
    me?.role === "student" ? ds.getStudentProfile(me.id) : Promise.resolve(null),
    me ? ds.getApplications(me.id) : Promise.resolve([]),
  ]);

  return (
    <ExplorerView
      student={student}
      scholarships={scholarships}
      appliedIds={applications.map((a) => a.scholarshipId)}
    />
  );
}
