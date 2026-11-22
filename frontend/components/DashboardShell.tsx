"use client";
import { T } from "@/components/LanguageProvider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { AccountMenu } from "./AccountMenu";
import { useLanguage, LanguageSwitch } from "./LanguageProvider";
import { PwaStatus } from "./PwaStatus";
import { AdminSidebarLink } from "./AdminSidebarLink";
import { NavigationLink } from "./NavigationLink";
import { useUnreadMessages } from "./MessagingProvider";
const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/planting", label: "Planting", icon: "plant" },
  { href: "/health", label: "Health Check", icon: "scan" },
  { href: "/chat", label: "Farm chat", icon: "chat" },
  { href: "/farms", label: "My farm", icon: "farm" },
];
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-6" role="status">
          Opening Duducare…
        </div>
      }
    >
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}
function DashboardContent({ children }: { children: ReactNode }) {
  const { unreadCount } = useUnreadMessages();
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
  }, [pathname]);
  const navigation = links.map((item) => (
    <NavigationLink
      key={item.href}
      href={item.href}
      label={t(item.label)}
      icon={item.icon}
      unreadCount={item.href === "/chat" ? unreadCount : 0}
      unreadLabel={t("unread messages", "ujumbe ambao haujasomwa")}
      active={
        (
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href) ||
              (item.href === "/health" &&
                ((pathname.startsWith("/disease") && !pathname.startsWith("/disease/admin")) ||
                  pathname.startsWith("/animal-health")))
        )
      }
    />
  ));
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        <T>Skip to content</T>
      </a>
      <aside className="desktop-sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="plant" size={28} />
          </span>
          <span>
            dudu<span className="brand-accent">care</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {navigation}
          <AdminSidebarLink />
        </nav>
        <div className="sidebar-account">
          <AccountMenu />
        </div>
        <Link className="sidebar-help" href="/help">
          {t("Help", "Msaada")}
        </Link>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <Link href="/" className="mobile-brand brand">
            <Icon name="plant" />
            dudu<span className="brand-accent">care</span>
          </Link>
          <span className="desktop-header-label">
            <T>Your farm, a little better cared for.</T>
          </span>
          <div className="header-actions">
            <Link href="/help" className="help-link">
              {t("Help", "Msaada")}
            </Link>
            <div className="mobile-profile">
              <AccountMenu compact />
            </div>
            <LanguageSwitch />
            <PwaStatus />
          </div>
        </header>
        {language === "sw" && (
          <p className="language-evidence-note">
            Kiolesura kinapatikana kwa Kiswahili. Rekodi za zamani, vyanzo na
            baadhi ya matokeo ya mimea hubaki katika lugha ya asili ili
            kuhifadhi maana ya ushahidi.
          </p>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          ref={main}
          className="app-content"
        >
          {children}
        </main>
        <footer className="app-footer">
          {t(
            "Duducare · Simulated evidence. Confirm crop advice with an extension officer and animal advice with a veterinarian.",
            "Duducare · Ushahidi wa majaribio. Thibitisha ushauri wa mimea na afisa ugani, na wa mifugo na daktari wa mifugo.",
          )}
        </footer>
      </div>
      <nav aria-label="Mobile navigation" className="mobile-navigation">
        {navigation}
        <AdminSidebarLink />
      </nav>
    </div>
  );
}
