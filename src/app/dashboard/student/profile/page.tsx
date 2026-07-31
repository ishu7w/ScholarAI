import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import { computeAIScore } from "@/lib/ai-engine";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const me = await getSessionProfile();
  if (!me) redirect("/login?next=/dashboard/student/profile");

  const ds = await getDataSource();
  const profile = await ds.getStudentProfile(me.id);
  const score = profile ? computeAIScore(profile) : null;

  return (
    <DashboardShell
      title="Academic profile"
      subtitle="Every field here feeds a published weight in the scoring engine"
    >
      <ProfileForm
        profile={profile}
        name={me.name}
        currentScore={score?.total ?? null}
        readOnly={ds.mode === "demo"}
      />
    </DashboardShell>
  );
}
