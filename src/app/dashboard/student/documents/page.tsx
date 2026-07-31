import DashboardShell from "@/components/layout/DashboardShell";
import { requireRole } from "@/lib/auth/guard";
import { getDataSource } from "@/lib/datasource";
import { canUpload } from "@/lib/documents/actions";
import DocumentsView from "./DocumentsView";

export default async function DocumentsPage() {
  const me = await requireRole(["student"], "/dashboard/student/documents");

  const ds = await getDataSource();
  const [documents, uploadEnabled] = await Promise.all([
    ds.getDocuments(me.id),
    canUpload(),
  ]);

  return (
    <DashboardShell
      title="Documents"
      subtitle="Uploads are checked against the figures on your profile"
    >
      <DocumentsView documents={documents} uploadEnabled={uploadEnabled} />
    </DashboardShell>
  );
}
