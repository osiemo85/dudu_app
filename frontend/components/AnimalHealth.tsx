"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "./LanguageProvider";
import { api } from "@/lib/advisory";
import { Evidence } from "./Evidence";
import {
  speciesOptions,
  symptomOptions,
  warningOptions,
  type AnimalRequest,
  type AnimalResult,
  type AnimalCase,
} from "@/lib/animal";
const initial: AnimalRequest = {
  language: "en",
  species: null,
  group_name: "",
  age_group: "unknown",
  symptoms: [],
  observations: "",
  duration_days: null,
  affected: 1,
  herd_size: 1,
  county: null,
  area: null,
  warning_signs: [],
  warning_check: false,
  vaccination: "",
  feeding_changes: "",
  introductions: "",
  photo_attached: false,
};
export function AnimalResultCard({ result }: { result: AnimalResult }) {
  const { t } = useLanguage();
  return (
    <section className="panel stack">
      <span className="demo-tag">{t("SIMULATED ADVICE")}</span>
      <h2>
        {result.status === "urgent_referral"
          ? t(
              "Contact a veterinarian now",
              "Wasiliana na daktari wa mifugo sasa",
            )
          : result.status === "needs_clarification"
            ? t("A little more information", "Taarifa zaidi zinahitajika")
            : t(
                "Possible symptom groups",
                "Vikundi vya dalili vinavyowezekana",
              )}
      </h2>
      {result.clarification && (
        <p className="status-message">{result.clarification}</p>
      )}
      {result.possibilities.map((item) => (
        <article key={item.id}>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm">
            {t("Observed signs", "Dalili zilizoonekana")}:{" "}
            {item.matched_symptoms
              .map((id) => {
                const option = symptomOptions.find((x) => x[0] === id);
                return option ? t(option[1], option[2]) : id;
              })
              .join(", ")}
          </p>
        </article>
      ))}
      <ul className="result-list list-disc">
        {result.next_actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
      <p className="text-sm">{result.photo_analysis}</p>
      <Evidence result={result} />
    </section>
  );
}
export function AnimalHealth() {
  const { language, t } = useLanguage();
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState<AnimalResult | null>(null);
  const [submitted, setSubmitted] = useState<AnimalRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  function update<K extends keyof AnimalRequest>(
    key: K,
    value: AnimalRequest[K],
  ) {
    setForm((old) => ({ ...old, [key]: value }));
    setResult(null);
    setSaved(false);
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSaved(false);
    if (form.affected > form.herd_size) {
      setError(
        t(
          "Affected animals cannot exceed the group size.",
          "Wanyama walioathirika hawawezi kuzidi idadi ya kundi.",
        ),
      );
      return;
    }
    setBusy(true);
    const request = { ...form, language, photo_attached: !!photo };
    try {
      setResult(
        await api<AnimalResult>("/animal-health/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        }),
      );
      setSubmitted(request);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setError(
        t(
          "Could not assess this observation. Your entries are kept; please retry.",
          "Uchunguzi haujakamilika. Taarifa zako zimebaki; jaribu tena.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!submitted || !consent) return;
    setBusy(true);
    setError("");
    try {
      await api<AnimalCase>("/animal-health/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: submitted, consent }),
      });
      setSaved(true);
    } catch {
      setError(
        t(
          "Could not save. Sign in and try again; your result remains here.",
          "Haijahifadhiwa. Ingia kisha ujaribu tena; matokeo yako yapo hapa.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">
            {t("CARE FOR YOUR ANIMALS", "TUNZA MIFUGO YAKO")}
          </p>
          <h1>{t("Animal health")}</h1>
          <p>
            {t(
              "Describe what you see. Get a clear next step for veterinary review.",
              "Eleza unachoona. Pata hatua inayofuata kwa uchunguzi wa daktari wa mifugo.",
            )}
          </p>
        </div>
      </div>
      <div className="status-message">
        {t(
          "Demo only. No current outbreaks, drug prescriptions, or photo diagnosis. If you are worried about an animal, contact a veterinarian even when no warning sign is selected.",
          "Ni majaribio tu. Hakuna taarifa za milipuko ya sasa, maagizo ya dawa au utambuzi wa picha. Ukiwa na wasiwasi, wasiliana na daktari hata bila kuchagua dalili ya hatari.",
        )}
      </div>
      <div className="workspace-grid">
        <form onSubmit={submit} className="panel stack" aria-busy={busy}>
          <fieldset className="stack">
            <legend className="font-semibold mb-3">
              {t(
                "1 · Check warning signs first",
                "1 · Kagua dalili za hatari kwanza",
              )}
            </legend>
            {warningOptions.map(([id, en, sw]) => (
              <label key={id} className="check-row">
                <input
                  type="checkbox"
                  checked={form.warning_signs.includes(id)}
                  onChange={(e) =>
                    update(
                      "warning_signs",
                      e.target.checked
                        ? [...form.warning_signs, id]
                        : form.warning_signs.filter((x) => x !== id),
                    )
                  }
                />
                {t(en, sw)}
              </label>
            ))}
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.warning_check}
                onChange={(e) => update("warning_check", e.target.checked)}
              />
              {t(
                "I have checked the warning signs above.",
                "Nimekagua dalili za hatari hapo juu.",
              )}
            </label>
          </fieldset>
          {form.warning_signs.length > 0 && (
            <div className="error-message" role="alert">
              {t(
                "Contact a veterinarian now. You can submit immediately without completing the remaining fields.",
                "Wasiliana na daktari wa mifugo sasa. Unaweza kutuma bila kukamilisha sehemu zilizobaki.",
              )}
            </div>
          )}
          <div className="form-grid">
            <label className="field-label">
              {t("Species", "Aina ya mnyama")}
              <select
                className="field"
                value={form.species || ""}
                onChange={(e) => {
                  update("species", e.target.value || null);
                  update("symptoms", []);
                }}
              >
                <option value="">{t("Choose species", "Chagua aina")}</option>
                {speciesOptions.map(([id, en, sw]) => (
                  <option key={id} value={id}>
                    {t(en, sw)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              {t("Age group", "Kundi la umri")}
              <select
                className="field"
                value={form.age_group}
                onChange={(e) => update("age_group", e.target.value)}
              >
                <option value="unknown">{t("Not sure")}</option>
                <option value="young">{t("Young", "Wachanga")}</option>
                <option value="adult">{t("Adult", "Wakubwa")}</option>
              </select>
            </label>
          </div>
          <label className="field-label">
            {t(
              "Herd, flock or animal name (optional)",
              "Jina la kundi au mnyama (hiari)",
            )}
            <input
              className="field"
              maxLength={100}
              value={form.group_name}
              onChange={(e) => update("group_name", e.target.value)}
            />
          </label>
          <fieldset>
            <legend className="font-semibold mb-3">
              {t("2 · Observed signs", "2 · Dalili zilizoonekana")}
            </legend>
            <div className="form-grid">
              {symptomOptions
                .filter(
                  (x) =>
                    form.species !== "chicken" ||
                    !["udder_swelling", "milk_change"].includes(x[0]),
                )
                .map(([id, en, sw]) => (
                  <label className="check-row" key={id}>
                    <input
                      type="checkbox"
                      checked={form.symptoms.includes(id)}
                      onChange={(e) =>
                        update(
                          "symptoms",
                          e.target.checked
                            ? [...form.symptoms, id]
                            : form.symptoms.filter((x) => x !== id),
                        )
                      }
                    />
                    {t(en, sw)}
                  </label>
                ))}
            </div>
          </fieldset>
          <div className="form-grid">
            {(
              [
                [
                  "duration_days",
                  "Days since signs began (0 = today)",
                  "Siku tangu dalili kuanza (0 = leo)",
                ],
                ["affected", "Number affected", "Idadi iliyoathirika"],
                [
                  "herd_size",
                  "Total animals in group",
                  "Jumla ya wanyama kwenye kundi",
                ],
              ] as const
            ).map(([key, en, sw]) => (
              <label className="field-label" key={key}>
                {t(en, sw)}
                <input
                  type="number"
                  className="field"
                  min={key === "duration_days" ? 0 : 1}
                  max={key === "duration_days" ? 3650 : 1000000}
                  value={form[key] ?? ""}
                  onChange={(e) =>
                    update(
                      key,
                      e.target.value === ""
                        ? key === "duration_days"
                          ? null
                          : 1
                        : Number(e.target.value),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <label className="field-label">
            {t(
              "Additional observations (for your vet)",
              "Maelezo ya ziada (kwa daktari)",
            )}
            <textarea
              className="field"
              maxLength={3000}
              rows={3}
              value={form.observations}
              onChange={(e) => update("observations", e.target.value)}
            />
            <span className="text-xs font-normal">
              {t(
                "Written notes are recorded, not interpreted by the demo.",
                "Maandishi huhifadhiwa kama maelezo; hayachambuliwi na onyesho hili.",
              )}
            </span>
          </label>
          <label className="field-label">
            {t(
              "Optional photo — device preview only",
              "Picha ya hiari — huonekana kwenye kifaa tu",
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="field"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (
                  file &&
                  (!["image/jpeg", "image/png", "image/webp"].includes(
                    file.type,
                  ) ||
                    file.size > 10 * 1024 * 1024)
                ) {
                  setError(
                    t(
                      "Choose a JPEG, PNG or WebP under 10 MB.",
                      "Chagua JPEG, PNG au WebP chini ya MB 10.",
                    ),
                  );
                  e.target.value = "";
                  return;
                }
                setPhoto(file);
                setPreview("");
                setResult(null);
              }}
            />
          </label>
          {photo && preview && (
            <div>
              <Image
                src={preview}
                width={600}
                height={400}
                unoptimized
                alt={t(
                  "Animal observation preview",
                  "Picha ya uchunguzi wa mnyama",
                )}
                className="rounded-xl max-h-64 object-contain w-full"
              />
              <button
                className="button button-secondary mt-2"
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPreview("");
                }}
              >
                {t("Remove photo", "Ondoa picha")}
              </button>
            </div>
          )}
          <details>
            <summary className="cursor-pointer py-3 font-semibold">
              {t(
                "3 · Location and history (optional)",
                "3 · Eneo na historia (hiari)",
              )}
            </summary>
            <div className="stack">
              {(
                [
                  ["county", "County", "Kaunti"],
                  ["area", "Area", "Eneo"],
                  ["vaccination", "Vaccination history", "Historia ya chanjo"],
                  [
                    "feeding_changes",
                    "Recent feeding changes",
                    "Mabadiliko ya lishe",
                  ],
                  [
                    "introductions",
                    "New animals introduced",
                    "Wanyama wapya walioingizwa",
                  ],
                ] as const
              ).map(([key, en, sw]) => (
                <label className="field-label" key={key}>
                  {t(en, sw)}
                  <input
                    className="field"
                    maxLength={key === "county" || key === "area" ? 100 : 500}
                    value={form[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
              <p className="text-xs">
                {t(
                  "Manually supplied area only. No GPS. A planting season is not required.",
                  "Eneo lililotolewa na mtumiaji tu. Hakuna GPS. Msimu wa kupanda hauhitajiki.",
                )}
              </p>
            </div>
          </details>
          <button className="button button-primary" disabled={busy}>
            {busy
              ? t("Please wait…")
              : t("Check animal health", "Kagua afya ya mifugo")}
          </button>
        </form>
        <div className="stack" ref={resultRef} tabIndex={-1} aria-live="polite">
          {result ? (
            <>
              <AnimalResultCard result={result} />
              {submitted?.language !== language && (
                <p className="status-message">
                  {t(
                    "This result uses the language selected when submitted. Submit again for the other language.",
                    "Matokeo haya yanatumia lugha iliyochaguliwa wakati wa kutuma. Tuma tena kwa lugha nyingine.",
                  )}
                </p>
              )}
              <div className="panel stack">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  {t(
                    "Save my observation and result to my private account. No photo is stored. This does not send a veterinary referral.",
                    "Hifadhi uchunguzi na matokeo kwenye akaunti yangu binafsi. Picha haihifadhiwi. Hii haitumi rufaa kwa daktari.",
                  )}
                </label>
                <button
                  className="button button-secondary"
                  onClick={() => void save()}
                  disabled={busy || !consent || saved}
                >
                  {saved
                    ? t("Saved", "Imehifadhiwa")
                    : t("Save animal case", "Hifadhi rekodi ya mnyama")}
                </button>
                <Link
                  className="button button-secondary"
                  href="/animal-health/cases"
                >
                  {t("Animal case history", "Historia ya afya ya mifugo")}
                </Link>
                <Link href="/account/login" className="underline">
                  {t("Log in")}
                </Link>
              </div>
            </>
          ) : (
            <div className="panel">
              <h2>
                {t(
                  "For animals, the right expert is a veterinarian.",
                  "Kwa mifugo, mtaalamu anayefaa ni daktari wa mifugo.",
                )}
              </h2>
              <p>
                {t(
                  "Possible groups and next steps will appear here. A photo alone cannot establish a diagnosis.",
                  "Vikundi vinavyowezekana na hatua zinazofuata zitaonekana hapa. Picha pekee haiwezi kuthibitisha ugonjwa.",
                )}
              </p>
            </div>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
