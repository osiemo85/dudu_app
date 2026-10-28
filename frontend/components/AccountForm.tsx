"use client";

import { useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/api";

export function AccountForm({ onSuccess, initialMode = "login" }: { onSuccess: () => void; initialMode?: "login" | "register" }) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/api/v1/auth/${mode}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(typeof payload.detail === "string" ? payload.detail : "Check your email and password (at least 8 characters).");
      }
      window.dispatchEvent(new Event("account-changed"));
      onSuccess();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-2xl border border-emerald-100 bg-white p-4">
    <h3 className="font-semibold text-slate-950">{mode === "login" ? "Log in" : "Create an account"}</h3>
    <p className="mt-1 text-sm text-slate-600">Your account keeps your saved plans and notes together on this demo server.</p>
    <form onSubmit={submit} className="mt-3 space-y-3">
      <label className="block text-sm font-semibold">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className="field mt-1" /></label>
      <label className="block text-sm font-semibold">Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} className="field mt-1" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Register"}</button>
    </form>
    <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="mt-3 text-sm font-semibold text-emerald-700 underline">{mode === "login" ? "Need an account? Register" : "Already registered? Log in"}</button>
  </div>;
}
