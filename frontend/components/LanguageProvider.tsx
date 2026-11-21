"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import dictionary from "@/lib/sw.json";
type Language = "en" | "sw";
const translations: Record<string, string> = dictionary;
const Context = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (en: string, sw?: string) => string;
}>({ language: "en", setLanguage: () => {}, t: (en) => en });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setValue] = useState<Language>("en");
  useEffect(() => {
    const read = () => {
      try {
        setValue(
          localStorage.getItem("duducare-language") === "sw" ? "sw" : "en",
        );
      } catch {}
    };
    queueMicrotask(read);
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  function setLanguage(value: Language) {
    setValue(value);
    try {
      localStorage.setItem("duducare-language", value);
    } catch {}
  }
  const t = useCallback(
    (en: string, sw?: string) =>
      language === "sw" ? sw || translations[en.trim()] || en : en,
    [language],
  );
  return (
    <Context.Provider value={{ language, setLanguage, t }}>
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function T({ children }: { children: string }) {
  const { t } = useLanguage();
  return <>{t(children)}</>;
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-switch" role="group" aria-label="Language / Lugha">
      <button
        type="button"
        lang="en"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        English
      </button>
      <button
        type="button"
        lang="sw"
        aria-pressed={language === "sw"}
        onClick={() => setLanguage("sw")}
      >
        Kiswahili
      </button>
    </div>
  );
}
