"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/advisory";
import type { AnimalCase } from "@/lib/animal";
import { AnimalResultCard } from "./AnimalHealth";
import { useLanguage } from "./LanguageProvider";
export function AnimalCases() {
  const { t } = useLanguage();
  const [cases, setCases] = useState<AnimalCase[]>([]);
  const [selected, setSelected] = useState<AnimalCase | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<AnimalCase[]>("/animal-health/cases")
      .then((data) => {
        if (active) {
          setCases(data);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>{t("Animal case history", "Historia ya afya ya mifugo")}</h1>
          <p>
            {t(
              "Your private observations. No veterinary review has been booked.",
              "Uchunguzi wako binafsi. Hakuna miadi ya daktari iliyowekwa.",
            )}
          </p>
        </div>
      </div>
      {error && (
        <div role="alert" className="error-message">
          {t(
            "Sign in to load your animal cases, or retry if the service is unavailable.",
            "Ingia kuona rekodi zako au jaribu tena ikiwa huduma haipatikani.",
          )}{" "}
          <Link className="underline" href="/account/login">
            {t("Log in")}
          </Link>
          <button className="button" onClick={() => setRetry((x) => x + 1)}>
            {t("Retry")}
          </button>
        </div>
      )}
      <div className="workspace-grid">
        <div className="panel stack">
          {loading ? (
            <p>{t("Please wait…")}</p>
          ) : !cases.length && !error ? (
            <p>
              {t(
                "No saved animal cases yet.",
                "Hakuna rekodi za mifugo zilizohifadhiwa.",
              )}
            </p>
          ) : (
            cases.map((item) => (
              <button
                key={item.id}
                className="button button-secondary text-left"
                onClick={() => setSelected(item)}
                aria-pressed={selected?.id === item.id}
              >
                {item.observation.group_name ||
                  item.observation.species ||
                  t("Animal", "Mnyama")}{" "}
                · {new Date(item.created_at).toLocaleDateString()} · #{item.id}
              </button>
            ))
          )}
          <Link className="button button-primary" href="/animal-health">
            {t("Check animal health", "Kagua afya ya mifugo")}
          </Link>
        </div>
        {selected && (
          <div className="stack">
            <div className="panel">
              <h2>
                {selected.observation.group_name ||
                  t("Saved observation", "Uchunguzi uliohifadhiwa")}
              </h2>
              <p>{selected.observation.observations}</p>
              <p>
                {t("Affected / group size", "Walioathirika / jumla")}:{" "}
                {selected.observation.affected} /{" "}
                {selected.observation.herd_size}
              </p>
              <p>
                {t("Days since onset", "Siku tangu kuanza")}:{" "}
                {selected.observation.duration_days ??
                  t("Unknown", "Haijulikani")}
              </p>
              <p>{selected.observation.vaccination}</p>
              <p>{selected.observation.feeding_changes}</p>
              <p>{selected.observation.introductions}</p>
              <p className="provenance">
                {t(
                  "Saved results retain their original language and simulated evidence.",
                  "Matokeo yaliyohifadhiwa hubaki na lugha na ushahidi wa majaribio wa awali.",
                )}
              </p>
            </div>
            <AnimalResultCard result={selected.result} />
          </div>
        )}
      </div>
    </>
  );
}
