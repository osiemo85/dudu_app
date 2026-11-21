"use client";
import { T } from "@/components/LanguageProvider";
import { AccountPage } from "@/components/AccountPage";
import { DashboardShell } from "@/components/DashboardShell";

export default function RegisterPage() {
  return <DashboardShell><section className="mx-auto max-w-xl px-5 py-10"><h1 className="mb-6 text-3xl font-semibold text-emerald-950"><T>Create a Duducare account</T></h1><AccountPage mode="register" /></section></DashboardShell>;
}
