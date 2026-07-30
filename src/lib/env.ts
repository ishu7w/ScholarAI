// Central env contract. The app MUST work with zero env vars (demo mode);
// live mode activates only when Supabase is fully configured.

export function isLiveMode(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
