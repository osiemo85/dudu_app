"use client";
import { T } from "@/components/LanguageProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { FarmNotebook } from "@/components/FarmNotebook";
export default function FarmsPage() {
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow"><T>EVERY OBSERVATION MATTERS</T></p>
          <h1><T>A little record. A lot to learn.</T></h1>
          <p><T>Your farm notebook, from the first seed to the last harvest.</T></p>
        </div>
      </div>
      <FarmNotebook />
    </DashboardShell>
  );
}
