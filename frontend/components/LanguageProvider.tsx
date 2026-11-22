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
import { Icon } from "./Icon";
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
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-switch" title={t("Choose language", "Chagua lugha")}>
      <select aria-label={t("Language", "Lugha")} value={language}
        onChange={(event) => setLanguage(event.target.value === "sw" ? "sw" : "en")}>
        <option value="en" lang="en">EN · English</option>
        <option value="sw" lang="sw">SW · Kiswahili</option>
      </select>
      <span className="language-code" aria-hidden="true">
        {language.toUpperCase()}
        <Icon name="chevron" size={13} style={{ transform: "rotate(90deg)" }} />
      </span>
    </label>
  );
}
