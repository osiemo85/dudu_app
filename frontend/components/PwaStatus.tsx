"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useLanguage } from "./LanguageProvider";
import { RecordModal } from "./RecordModal";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function PwaStatus() {
  const { t } = useLanguage();
  const [offline, setOffline] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const update = () => setOffline(!navigator.onLine);
    const checkInstalled = () => setInstalled(displayMode.matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const install = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const complete = () => { setPrompt(null); setInstalled(true); setShowHelp(false); };
    queueMicrotask(() => { update(); checkInstalled(); });
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", complete);
    displayMode.addEventListener("change", checkInstalled);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() =>
        setError("Offline support could not start. You can keep using Duducare online."));
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", complete);
      displayMode.removeEventListener("change", checkInstalled);
    };
  }, []);

  async function install() {
    if (!prompt || offline) { setShowHelp(true); return; }
    const pending = prompt;
    setPrompt(null);
    setInstalling(true);
    try {
      await pending.prompt();
      await pending.userChoice;
    } catch {
      setError("Installation could not start. Use your browser’s install menu or see Help.");
      setShowHelp(true);
    } finally {
      setInstalling(false);
    }
  }

  return <>
    {offline && <span className="header-offline" role="status" title={t("Advice and chat need a connection.", "Ushauri na gumzo vinahitaji mtandao.")}>{t("Offline", "Nje ya mtandao")}</span>}
    {error && <span className="sr-only" role="status">{t(error)}</span>}
    {!installed && <button type="button" className="header-install" onClick={() => void install()}
      disabled={installing} aria-label={t("Install Duducare", "Sakinisha Duducare")}
      title={t("Install Duducare", "Sakinisha Duducare")}>
      <Icon name="download" size={18} />
    </button>}
    {showHelp && <RecordModal title={t("Install Duducare", "Sakinisha Duducare")} onClose={() => setShowHelp(false)}>
      <div className="install-instructions">
        {offline && <p role="status">{t("You’re offline. Reconnect to install Duducare. Advice and chat need a connection; your open farm notebook is still available.", "Uko nje ya mtandao. Unganisha mtandao ili kusakinisha Duducare. Ushauri na gumzo vinahitaji mtandao; daftari lako lililo wazi bado linapatikana.")}</p>}
        {error && <p role="alert">{t(error)}</p>}
        <p>{t("Use your browser menu and choose Install app or Add to Home Screen.", "Tumia menyu ya kivinjari chako na uchague Sakinisha programu au Ongeza kwenye Skrini ya Mwanzo.")}</p>
        <p>{t("On iPhone or iPad, open Duducare in Safari, then choose Share → Add to Home Screen.", "Kwenye iPhone au iPad, fungua Duducare katika Safari, kisha chagua Shiriki → Ongeza kwenye Skrini ya Mwanzo.")}</p>
        <p className="page-description">{t("Installation depends on browser support. Advice, accounts and chat need an internet connection.", "Usakinishaji unategemea uwezo wa kivinjari. Ushauri, akaunti na gumzo vinahitaji mtandao.")}</p>
      </div>
    </RecordModal>}
  </>;
}
