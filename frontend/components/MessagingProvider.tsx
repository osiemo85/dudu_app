"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";

const Context = createContext({ unreadCount: 0, refresh: () => {} });
export const useUnreadMessages = () => useContext(Context);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(() => {
    if (!mounted.current || document.visibilityState !== "visible" || !navigator.onLine) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    void fetch("/api/v1/messaging/unread", {
      credentials: "include", cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    }).then(async (response) => {
      const data = response.ok ? await response.json() : null;
      if (!controller.signal.aborted && mounted.current && (response.ok || response.status === 401))
        setUnreadCount(typeof data?.unread_count === "number" ? data.unread_count : 0);
    }).catch(() => { /* Keep the last known count during a connection failure. */ });
  }, []);

  useEffect(() => {
    mounted.current = true;
    const accountChanged = () => { request.current?.abort(); setUnreadCount(0); refresh(); };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("account-changed", accountChanged);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      request.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("account-changed", accountChanged);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  return <Context.Provider value={{ unreadCount, refresh }}>
    {children}
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {unreadCount > 0 ? `${unreadCount} ${t("unread messages", "ujumbe ambao haujasomwa")}` : ""}
    </span>
  </Context.Provider>;
}
