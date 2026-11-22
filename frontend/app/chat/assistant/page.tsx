"use client";
import Link from "next/link";
import { T } from "@/components/LanguageProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { FarmChat } from "@/components/FarmChat";
export default function Page() {
  return <DashboardShell>
    <div className="page-intro"><div><p className="eyebrow"><T>SCRIPTED LOCAL DEMO</T></p><h1><T>Demo farm assistant</T></h1><p><T>Scripted guidance, separate from your expert conversations.</T></p></div><Link href="/chat" className="button button-secondary"><T>Expert messages</T></Link></div>
    <FarmChat />
  </DashboardShell>;
}
