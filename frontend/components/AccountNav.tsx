"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";

type Account = { id: number; email: string };

export function AccountNav() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    function refresh() {
      fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
        .then(async (response) => {
          if (response.status === 401) return null;
          if (!response.ok) throw new Error("Account unavailable");
          return response.json() as Promise<Account>;
        })
        .then((user) => { if (active) { setAccount(user); setError(""); setLoading(false); } })
        .catch(() => { if (active) { setAccount(null); setError("Account service unavailable"); setLoading(false); } });
    }
    refresh();
    window.addEventListener("account-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("account-changed", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  async function logout() {
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error();
      setAccount(null);
      window.dispatchEvent(new Event("account-changed"));
      router.push("/planting");
      router.refresh();
    } catch { setError("Could not log out. Please try again."); }
  }
  return <div className="flex flex-wrap items-center justify-end gap-3 border-b border-emerald-100 bg-white px-5 py-3 text-sm sm:px-8">
    {loading ? <span className="text-slate-500">Checking account…</span> : account ? <>
      <span className="max-w-48 truncate text-slate-600">{account.email}</span>
      <Link href="/planting/plans" className="font-semibold text-emerald-700 underline">My plans</Link>
      <button type="button" onClick={logout} className="rounded-full border border-emerald-700 px-4 py-2 font-semibold text-emerald-800">Log out</button>
    </> : <>
      <Link href="/planting/account/login" className="rounded-full border border-emerald-700 px-4 py-2 font-semibold text-emerald-800">Log in</Link>
      <Link href="/planting/account/register" className="rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white">Register</Link>
    </>}
    {error && <span role="alert" className="text-red-700">{error}</span>}
  </div>;
}
