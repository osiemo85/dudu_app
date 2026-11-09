import { AccountPage } from "@/components/AccountPage";
import { DashboardShell } from "@/components/DashboardShell";

export default function LoginPage() {
  return <DashboardShell><section className="mx-auto max-w-xl px-5 py-10"><h1 className="mb-6 text-3xl font-semibold text-emerald-950">Log in to Crop Health</h1><AccountPage mode="login" /></section></DashboardShell>;
}
