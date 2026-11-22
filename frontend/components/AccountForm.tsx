"use client";
import { useLanguage, T } from "@/components/LanguageProvider";

import { useState } from "react";
import { PUBLIC_API_BASE_URL, readApiJson } from "@/lib/api";

export function AccountForm({
  onSuccess,
  initialMode = "login",
}: {
  onSuccess: () => void;
  initialMode?: "login" | "register";
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `${PUBLIC_API_BASE_URL}/api/v1/auth/${mode}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            password_confirmation: form.get("password_confirmation"),
          }),
        },
      );
      await readApiJson(response, "Check your email and password (at least 8 characters).");
      window.dispatchEvent(new Event("account-changed"));
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
      <h3 className="font-semibold text-slate-950">
        {mode === "login" ? t("Log in") : t("Create an account")}
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        <T>
          Use a demo account to save growing plans and crop health cases.
          Administrator accounts are created by the server script.
        </T>
      </p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        {mode === "register" && (
          <label className="block text-sm font-semibold">
            <T>Name</T>
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={120}
              className="field mt-1"
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          <T>Email</T>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="field mt-1"
          />
        </label>
        <label className="block text-sm font-semibold">
          <T>Password</T>
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
            maxLength={128}
            className="field mt-1"
          />
        </label>
        {mode === "register" && (
          <label className="block text-sm font-semibold">
            <T>Confirm password</T>
            <input
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className="field mt-1"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {t(error)}
          </p>
        )}
        <button
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy
            ? t("Please wait…")
            : mode === "login"
              ? t("Log in")
              : t("Register")}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError("");
        }}
        className="mt-3 text-sm font-semibold text-emerald-700 underline"
      >
        {mode === "login"
          ? t("Need an account? Register")
          : t("Already registered? Log in")}
      </button>
    </div>
  );
}
