import DashboardShell from "@/components/layout/DashboardShell";
import ChatAssistant from "@/components/chat/ChatAssistant";
import { canUpload } from "@/lib/documents/actions";
import ResumeAnalyzerView from "./ResumeAnalyzerView";

export default async function ResumeAnalyzerPage() {
  // Demo mode has no bucket — the view drops the file control and keeps
  // the paste / sample paths, which work without any env vars.
  const uploadEnabled = await canUpload();

  return (
    <DashboardShell
      title="Resume Analyzer"
      subtitle="ATS scoring + skill extraction tuned for scholarship review"
    >
      <ResumeAnalyzerView uploadEnabled={uploadEnabled} />
      <ChatAssistant />
    </DashboardShell>
  );
}
