"use client";

import { useRouter } from "next/navigation";
import { AccountForm } from "./AccountForm";

export function AccountPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  return <AccountForm initialMode={mode} onSuccess={() => router.push("/planting/plans")} />;
}
