import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import "@/app/admin.css";

export default function CropHealthAdminLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
