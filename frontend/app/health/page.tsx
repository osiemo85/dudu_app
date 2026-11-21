"use client";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { useLanguage } from "@/components/LanguageProvider";
import { Icon } from "@/components/Icon";
export default function Page() {
  const { t } = useLanguage();
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow">
            {t("CARE FOR YOUR WHOLE FARM", "TUNZA SHAMBA LAKO LOTE")}
          </p>
          <h1>{t("Health checks", "Ukaguzi wa afya")}</h1>
          <p>
            {t(
              "Choose what needs care. Each flow asks the right questions.",
              "Chagua kinachohitaji utunzaji. Kila sehemu ina maswali yanayofaa.",
            )}
          </p>
        </div>
      </div>
      <nav className="health-options" aria-label={t("Health checks")}>
        <Link href="/disease" className="health-option">
          <span className="health-option-icon">
            <Icon name="plant" />
          </span>
          <div>
            <h2>{t("Crop health")}</h2>
            <p>
              {t(
                "Explore possible causes from a photo or symptoms.",
                "Chunguza sababu zinazowezekana kwa picha au dalili.",
              )}
            </p>
          </div>
          <Icon name="chevron" size={20} />
        </Link>
        <Link href="/animal-health" className="health-option">
          <span className="health-option-icon health-option-animal">
            <Icon name="farm" />
          </span>
          <div>
            <h2>{t("Animal health")}</h2>
            <p>
              {t(
                "Check signs in cattle, goats, sheep or chickens.",
                "Kagua dalili kwa ng’ombe, mbuzi, kondoo au kuku.",
              )}
            </p>
          </div>
          <Icon name="chevron" size={20} />
        </Link>
      </nav>
      <p className="health-evidence-note">
        {t(
          "Both tools use simulated evidence. They do not confirm a diagnosis or prescribe medicines.",
          "Zana zote zinatumia ushahidi wa majaribio. Hazithibitishi ugonjwa wala kuagiza dawa.",
        )}
      </p>
    </DashboardShell>
  );
}
