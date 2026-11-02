import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { isLiveMode, hasDatabase } from "@/lib/env";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const allowDemo = !isLiveMode() && !hasDatabase();

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your latest matches and deadlines."
      footer={
        <>
          New to ScholarAI?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <LoginForm allowDemo={allowDemo} />
      </Suspense>
    </AuthShell>
  );
}
