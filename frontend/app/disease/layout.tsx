import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const instant = false;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/$/, "");

async function hasAuthenticatedSession(): Promise<boolean> {
  const session = (await cookies()).get("shamba_session")?.value;
  if (!session || !BACKEND_URL) return false;

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      cache: "no-store",
      headers: { cookie: `shamba_session=${encodeURIComponent(session)}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function DiseaseLayout({ children }: { children: ReactNode }) {
  if (!(await hasAuthenticatedSession())) redirect("/");
  return children;
}
