"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    const install = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => setPrompt(null);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() =>
          setError(
            "Offline support could not start. You can keep using Duducare online.",
          ),
        );
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch {
      setError(
        "Installation could not start. Use your browser’s install menu or see Help.",
      );
    }
  }
  if (!offline && !prompt && !error) return null;
  return (
    <div className="pwa-bar" role="status">
      <span>
        {offline
          ? "You’re offline. Advice and chat need a connection; your open farm notebook is still available."
          : error || "Keep Duducare close. Add it to your home screen."}
      </span>
      {prompt && !offline && (
        <button
          className="button button-secondary"
          onClick={() => void install()}
        >
          <Icon name="download" size={16} />
          Install Duducare
        </button>
      )}
    </div>
  );
}
