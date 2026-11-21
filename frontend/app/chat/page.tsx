"use client";
import { T } from "@/components/LanguageProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { FarmChat } from "@/components/FarmChat";
export default function ChatPage() {
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow"><T>A CONVERSATION THAT HELPS</T></p>
          <h1><T>Your farm questions, welcome here.</T></h1>
          <p><T>Find the next useful step with a simulated farm assistant.</T></p>
        </div>
      </div>
      <FarmChat />
    </DashboardShell>
  );
}
