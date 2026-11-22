"use client";
import { T } from "@/components/LanguageProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { ExpertChat } from "@/components/ExpertChat";
import Link from "next/link";
import "./messaging.css";
export default function ChatPage() {
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow"><T>FARM CHAT</T></p>
          <h1><T>Expert messages</T></h1>
          <p><T>Choose an expert and return to your saved conversations.</T></p>
        </div>
        <Link className="messaging-assistant-link" href="/chat/assistant"><T>Scripted demo assistant</T></Link>
      </div>
      <ExpertChat />
    </DashboardShell>
  );
}
