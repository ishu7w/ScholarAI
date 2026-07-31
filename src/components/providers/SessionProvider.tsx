"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarHue: number;
  role: "student" | "institution" | "admin";
}

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** Signed-in user, or null when signed out / not inside a provider. */
export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}
