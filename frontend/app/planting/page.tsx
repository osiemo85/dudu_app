"use client";
import { T } from "@/components/LanguageProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { PlantingForm } from "@/components/PlantingForm";
export default function PlantingPage() {
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow"><T>GROW WITH A PLAN</T></p>
          <h1><T>Make room for a better season.</T></h1>
          <p><T>Explore what, when, and how to plant using local demo evidence.</T></p>
        </div>
      </div>
      <PlantingForm />
    </DashboardShell>
  );
}
