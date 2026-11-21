"use client";

import { useLanguage, T } from "@/components/LanguageProvider";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { api, type ChatReply } from "@/lib/advisory";
import { ContextFields, emptyContext } from "./ContextFields";
import { Evidence } from "./Evidence";
import { Icon } from "./Icon";
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; result: ChatReply };
export function FarmChat() {
  const {language,t}=useLanguage();
  const [subject,setSubject]=useState<"crops"|"animals">("crops");
  const [context, setContext] = useState(emptyContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  async function send(text: string) {
    if (!text.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const question = text.trim();
    setDraft("");
    setMessages((old) => [...old, { role: "user", text: question }]);
    try {
      const result = await api<ChatReply>("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, ...context, language, subject }),
      });
      setMessages((old) => [
        ...old,
        { role: "assistant", text: result.reply, result },
      ]);
    } catch (error) {
      setDraft(question);
      setError(
        error instanceof Error
          ? error.message
          : "Could not send. Please retry.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
      requestAnimationFrame(() =>
        end.current?.scrollIntoView({ behavior: "instant", block: "nearest" }),
      );
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }
  return (
    <div className="mx-auto max-w-3xl"><label className="field-label mb-4">{t("Conversation topic","Mada ya mazungumzo")}<select className="field" value={subject} onChange={e=>setSubject(e.target.value as "crops"|"animals")}><option value="crops">{t("Crop health")}</option><option value="animals">{t("Animal health")}</option></select></label>
      <div className="status-message">
        <strong><T>Demo farm assistant</T></strong>
        <p><T>Scripted guidance from local content. No live agronomist or farmer-to-farmer messaging. Chat stays in this tab and is not saved. Each question uses the selected context; earlier messages are not analysed.</T></p>
      </div>
      <details className="panel">
        <summary className="cursor-pointer min-h-11 font-semibold"><T>Local context ·</T>{context.area || "choose an area"}
          {context.season ? ` · ${context.season}` : ""}
        </summary>
        <div className="mt-4">
          <ContextFields value={context} onChange={setContext} />
        </div>
      </details>
      <div
        className="chat-log"
        role="log"
        aria-label="Farm conversation"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="chat-message assistant">
          <span className="tool-icon green">
            <Icon name="chat" />
          </span>
          <strong><T>Hi, let’s talk about your farm.</T></strong>
          <p className="mt-2"><T>I can help you find your way through crop health, planting, and farm records. What’s on your mind?</T></p>
        </div>
        {messages.map((message, i) => (
          <article className={`chat-message ${message.role}`} key={i}>
            <span className="sr-only">
              {message.role === "user" ? "You" : "Demo assistant"}:{" "}
            </span>
            {message.text}
            {message.role === "assistant" && (
              <>
                <div className="chat-meta">
                  {message.result.location.label} ·{" "}
                  {message.result.season.label}<T>· Scripted demo</T></div>
                {message.result.action && (
                  <Link
                    href={`/${message.result.action}`}
                    className="button button-secondary mt-3"
                  ><T>Open</T>{" "}
                    {message.result.action === "animal-health" ? t("Animal health") : message.result.action === "disease"
                      ? t("Crop health")
                      : message.result.action === "farms"
                        ? t("My farm")
                        : t("Planting")}
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
                <details className="mt-3 whitespace-normal text-xs">
                  <summary className="cursor-pointer py-3"><T>Evidence & limitations</T></summary>
                  <Evidence result={message.result} />
                </details>
              </>
            )}
          </article>
        ))}
        {busy && (
          <p role="status" className="text-sm text-slate-600"><T>Checking the demo conversation guide…</T></p>
        )}
        <div ref={end} />
      </div>
      {!messages.length && (
        <div className="suggestion-row">
          {[
            t("My leaves have yellow spots", "Majani yana madoa ya manjano"),
            t("What should I plant?", "Nipande nini?"),
            t("How can I keep farm notes?", "Ninawezaje kuweka kumbukumbu za shamba?"),
          ].map((text) => (
            <button key={text} onClick={() => void send(text)} disabled={busy}>
              {text}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}<T>Your message is restored below. Try sending again.</T></p>
      )}
      <form onSubmit={submit} className="chat-composer">
        <label className="flex-1 min-w-0">
          <span className="sr-only"><T>Your farming question</T></span>
          <textarea
            className="field"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Ask a farming question…", "Uliza swali la kilimo…")}
            required
            disabled={busy}
          />
        </label>
        <button
          className="button button-primary"
          aria-label={t("Send message")}
          disabled={busy || !draft.trim()}
        >
          <Icon name="send" />
        </button>
      </form>
      {messages.length > 0 && (
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Clear this conversation from the current tab?"))
              setMessages([]);
          }}
        ><T>Clear conversation</T></button>
      )}
    </div>
  );
}
