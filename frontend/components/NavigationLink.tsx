"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "./Icon";

export function NavigationLink({ href, label, icon, active, className, unreadCount = 0, unreadLabel = "unread messages" }: {
  href: string;
  label: string;
  icon: IconName;
  active?: boolean;
  className?: string;
  unreadCount?: number;
  unreadLabel?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  return <Link href={href} className={className} aria-label={unreadCount ? `${label}, ${unreadCount} ${unreadLabel}` : label}
    aria-current={active ? "page" : undefined}
    data-tooltip-dismissed={dismissed || undefined}
    onKeyDown={(event) => { if (event.key === "Escape") setDismissed(true); }}
    onPointerLeave={() => setDismissed(false)} onBlur={() => setDismissed(false)}>
    <span className="nav-icon"><Icon name={icon} />
      {unreadCount > 0 && <span className="nav-unread-badge" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </span>
    <span className="nav-label" aria-hidden="true">{label}</span>
  </Link>;
}
