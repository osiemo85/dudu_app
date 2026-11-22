"use client";
import { T } from "@/components/LanguageProvider";
import { DiseaseForm } from "@/components/DiseaseForm";
import { DashboardShell } from "@/components/DashboardShell";
import Link from "next/link";

export default function DiseasePage() {
  return (
    <DashboardShell>
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="page-title"><T>A little clarity for your crop.</T></h1>
        <p className="page-description mb-6"><T>Share a photo or symptoms to explore possible causes. Demo evidence, with uncertainty clearly shown.</T></p>
        <div className="flex justify-end mb-5">
          <Link href="/disease/cases" className="button button-secondary case-history-link"><T>My crop health cases</T></Link>
        </div>
        <DiseaseForm />
      </section>
    </DashboardShell>
  );
}
