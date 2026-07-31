import { redirect } from "next/navigation";
import { computeAIScore, detectFraud } from "@/lib/ai-engine";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import InstitutionDashboardView, {
  NoInstitutionNotice,
  type RankedApplicant,
} from "./InstitutionDashboardView";

export default async function InstitutionDashboardPage() {
  const me = await getSessionProfile();
  if (!me) redirect("/login?next=/dashboard/institution");

  const ds = await getDataSource();
  const institution = await ds.getInstitutionForProfile(me.id);
  if (!institution) return <NoInstitutionNotice name={me.name} />;

  const [applicants, aggregates] = await Promise.all([
    ds.getInstitutionApplicants(institution.id),
    ds.getInstitutionAggregates(institution.id),
  ]);

  // Ranking runs on the FROZEN snapshot whenever one exists — that is the
  // basis the applicant was judged on, and re-scoring it after a profile
  // edit would quietly rewrite history. computeAIScore is the fallback only
  // for rows that carry no snapshot (and for demo mode, which has none).
  const ranked: RankedApplicant[] = applicants
    .map((a) => {
      const snapshot = a.aiSnapshot;
      const live = snapshot ? null : computeAIScore(a.student);
      return {
        applicationId: a.applicationId,
        scholarshipId: a.scholarshipId,
        scholarshipName: a.scholarshipName,
        status: a.status,
        student: a.student,
        aiTotal: snapshot ? snapshot.total : live!.total,
        matchScore: snapshot ? snapshot.matchScore : live!.total,
        frozen: snapshot !== null,
        fraud: detectFraud(a.student),
        documentsVerified: a.documentsVerified,
        documentsTotal: a.documentsTotal,
        rejectionReasons: a.rejectionReasons,
        submittedAt: a.submittedAt,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <InstitutionDashboardView
      orgName={institution.orgName}
      applicants={ranked}
      aggregates={aggregates}
      readOnly={ds.mode === "demo"}
    />
  );
}
