"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "./LanguageProvider";

type Account = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
};

export function ProfilePage() {
  const { t } = useLanguage();
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (response.status !== 401 && !response.ok) throw Error();
        const user: Account | null = response.ok ? await response.json() : null;
        if (active) {
          setAccount(user);
          setName(user?.name || "");
          setError("");
        }
      } catch {
        if (active) setError("Account service unavailable. Please retry.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error();
      const user: Account = await response.json();
      setAccount(user);
      setName(user.name);
      setSaved(true);
      window.dispatchEvent(new Event("account-changed"));
    } catch {
      setError("Could not save your profile. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <h1>{t("Profile")}</h1>
      </div>
      <section className="account-page-section">
        {loading ? (
          <p role="status">{t("Please wait…")}</p>
        ) : account ? (
          <form className="stack" onSubmit={save} aria-busy={busy}>
            <label className="field-label">
              {t("Name")}
              <input
                className="field"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                autoComplete="name"
                required
                maxLength={120}
                disabled={busy}
              />
            </label>
            <label className="field-label">
              {t("Email")}
              <input
                className="field"
                type="email"
                value={account.email}
                readOnly
              />
            </label>
            <div className="account-page-actions">
              <button
                className="button button-primary"
                disabled={busy || !name.trim()}
              >
                {busy
                  ? t("Saving…", "Inahifadhi…")
                  : t("Save profile", "Hifadhi wasifu")}
              </button>
            </div>
            {account.role === "admin" && (
              <Link className="account-admin-link" href="/disease/admin">
                {t("Information databases")}
              </Link>
            )}
          </form>
        ) : (
          !error && (
            <div className="stack">
              <p>
                {t("Log in to view your profile.", "Ingia kuona wasifu wako.")}
              </p>
              <div className="account-page-actions">
                <Link className="button button-primary" href="/account/login">
                  {t("Log in")}
                </Link>
                <Link
                  className="button button-secondary"
                  href="/account/register"
                >
                  {t("Register")}
                </Link>
              </div>
            </div>
          )
        )}
        {error && (
          <div className="account-page-feedback" role="alert">
            {t(error)}
            {!account && (
              <button
                className="button button-secondary"
                onClick={() => setRetry((value) => value + 1)}
              >
                {t("Retry")}
              </button>
            )}
          </div>
        )}
        {saved && (
          <p className="account-page-feedback" role="status">
            {t("Profile saved.")}
          </p>
        )}
      </section>
    </>
  );
}
