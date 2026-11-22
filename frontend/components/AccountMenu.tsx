"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { Icon } from "./Icon";

type Account = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
};

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [action, setAction] = useState<"logout" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const busy = action !== null;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setMounted(true);
    });
    async function refresh() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (response.status !== 401 && !response.ok) throw Error();
        const user: Account | null = response.ok ? await response.json() : null;
        if (active) {
          setAccount(user);
          setError("");
        }
      } catch {
        if (active) setError("Account service unavailable. Please retry.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    window.addEventListener("account-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("account-changed", refresh);
    };
  }, []);

  function positionPanel() {
    const anchor = trigger.current;
    const popover = panel.current;
    if (!anchor || !popover) return;
    const rect = anchor.getBoundingClientRect();
    if (!rect.width) {
      popover.hidePopover();
      return;
    }
    const width = Math.min(304, window.innerWidth - 24);
    const above = rect.top > window.innerHeight / 2;
    const available = above ? rect.top : window.innerHeight - rect.bottom;
    Object.assign(popover.style, {
      width: `${width}px`,
      left: `${Math.max(12, Math.min(compact ? rect.right - width : rect.left, window.innerWidth - width - 12))}px`,
      top: above ? "auto" : `${rect.bottom + 8}px`,
      bottom: above ? `${window.innerHeight - rect.top + 8}px` : "auto",
      maxHeight: `${Math.max(80, available - 20)}px`,
    });
  }

  useEffect(() => {
    if (!open) return;
    const reposition = () => positionPanel();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  });

  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus();
  }
  async function logout() {
    setAction("logout");
    setError("");
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error();
      setAccount(null);
      window.dispatchEvent(new Event("account-changed"));
      close();
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not log out. Please retry.");
    } finally {
      setAction(null);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="account-avatar-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-label={t("Open account menu", "Fungua menyu ya akaunti")}
        onClick={() => {
          if (panel.current?.matches(":popover-open")) {
            close();
            return;
          }
          positionPanel();
          panel.current?.showPopover();
          requestAnimationFrame(() =>
            panel.current?.querySelector<HTMLElement>("a, button")?.focus(),
          );
        }}
      >
        <span className="profile-avatar">
          <Icon name="user" />
        </span>
      </button>
      {mounted &&
        createPortal(
          <div
            ref={panel}
            id={id}
            popover="auto"
            role="dialog"
            className="account-popover"
            aria-label={t("Account menu", "Menyu ya akaunti")}
            onToggle={(event) => setOpen(event.newState === "open")}
          >
            <header className="account-menu-header">
              <span className="profile-avatar">
                <Icon name="user" size={18} />
              </span>
              <div>
                <strong>
                  {account?.name || t("Your account", "Akaunti yako")}
                </strong>
                <small>
                  {account?.email ||
                    t("Welcome to Duducare", "Karibu Duducare")}
                </small>
              </div>
            </header>
            <nav
              className="account-menu-items"
              aria-label={t("Account actions", "Chaguo za akaunti")}
            >
              <Link onClick={close} href="/profile">
                <Icon name="user" size={19} />
                {t("Profile")}
                <Icon name="chevron" size={16} />
              </Link>
              <Link onClick={close} href="/settings">
                <Icon name="settings" size={19} />
                {t("Settings", "Mipangilio")}
                <Icon name="chevron" size={16} />
              </Link>
              {account?.role === "admin" && (
                <Link onClick={close} href="/disease/admin">
                  <Icon name="clipboard" size={19} />
                  {t("Administration", "Usimamizi")}
                  <Icon name="chevron" size={16} />
                </Link>
              )}
              {loading ? (
                <p role="status">{t("Please wait…")}</p>
              ) : account ? (
                <button
                  className="account-menu-logout"
                  disabled={busy}
                  onClick={() => void logout()}
                >
                  <Icon name="logout" size={19} />
                  {action === "logout"
                    ? t("Logging out…", "Inatoka…")
                    : t("Log out")}
                </button>
              ) : (
                <Link
                  className="account-menu-login"
                  onClick={close}
                  href="/account/login"
                >
                  <Icon name="logout" size={19} />
                  {t("Log in")}
                </Link>
              )}
            </nav>
            {error && (
              <div className="account-menu-feedback" role="alert">
                {t(error)}
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("account-changed"))
                  }
                >
                  {t("Retry")}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
