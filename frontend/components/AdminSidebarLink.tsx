"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { NavigationLink } from "./NavigationLink";

export function AdminSidebarLink() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include", cache: "no-store", signal: AbortSignal.timeout(10_000),
        });
        const allowed = response.ok && (await response.json()).role === "admin";
        if (active) setIsAdmin(allowed);
      } catch {
        if (active) setIsAdmin(false);
      }
    }
    void refresh();
    window.addEventListener("account-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("account-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!isAdmin) return null;
  return (
    <NavigationLink href="/disease/admin/disease_cases" className="sidebar-admin-link"
      label={t("Administration", "Usimamizi")} icon="clipboard"
      active={pathname.startsWith("/disease/admin")} />
  );
}
