"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { LanguageSwitch, useLanguage } from "@/components/LanguageProvider";

export default function Page() {
  const { t } = useLanguage();
  return (
    <DashboardShell>
      <div className="page-intro">
        <h1>{t("Settings", "Mipangilio")}</h1>
      </div>
      <section
        className="account-page-section settings-language"
        aria-labelledby="language-title"
      >
        <div>
          <h2 id="language-title">{t("Language", "Lugha")}</h2>
          <p>{t("Saved on this device.", "Imehifadhiwa kwenye kifaa hiki.")}</p>
        </div>
        <LanguageSwitch />
      </section>
    </DashboardShell>
  );
}
