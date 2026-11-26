"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "./LanguageProvider";

type Account = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  county: string | null;
  area: string | null;
};

export function ProfilePage() {
  const { t } = useLanguage();
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [area, setArea] = useState("");
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
          setCounty(user?.county || "");
          setArea(user?.area || "");
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
        body: JSON.stringify({ name: name.trim(), county: county.trim() || null, area: area.trim() || null }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error();
      const user: Account = await response.json();
      setAccount(user);
      setName(user.name);
      setCounty(user.county || "");
      setArea(user.area || "");
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
            <fieldset className="profile-location-fields">
              <legend>{t("Location (optional)", "Eneo (si lazima)")}</legend>
              <p className="page-description">{t("Manually entered. Shared with your chat participants; expert locations also appear in the expert directory. Confirm location separately when requesting advice.", "Limeingizwa mwenyewe. Litaonekana kwa watu unaozungumza nao; maeneo ya wataalamu pia yataonekana kwenye orodha yao. Thibitisha eneo unapohitaji ushauri.")}</p>
              <div className="form-grid">
                <label className="field-label">{t("County")}
                  <input className="field" value={county} autoComplete="address-level1" maxLength={100} disabled={busy}
                    onChange={(event) => { setCounty(event.target.value); setSaved(false); }} />
                </label>
                <label className="field-label">{t("Area")}
                  <input className="field" value={area} autoComplete="address-level2" maxLength={100} disabled={busy}
                    onChange={(event) => { setArea(event.target.value); setSaved(false); }} />
                </label>
              </div>
            </fieldset>
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
              <Link className="account-admin-link" href="/disease/admin/disease_cases">
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
