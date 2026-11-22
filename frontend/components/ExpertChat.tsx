"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { messagingApi, personLocation, initials, type ChatAccount, type ChatPerson, type Conversation, type ConversationPage, type ChatMessage, type MessagePage } from "@/lib/messaging";
import { useLanguage } from "./LanguageProvider";
import { useUnreadMessages } from "./MessagingProvider";
import { Icon } from "./Icon";
import { RecordModal } from "./RecordModal";

function messageTime(value: string, language: string) {
  return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ExpertChat() {
  const { t } = useLanguage();
  const [account, setAccount] = useState<ChatAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      if (!active) return;
      try {
        const response = await fetch("/api/v1/auth/me", { credentials: "include", cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (response.status !== 401 && !response.ok) throw Error();
        const user = response.ok ? await response.json() : null;
        if (active) { setAccount(user); setError(""); }
      } catch {
        if (controller.signal.aborted) return;
        if (active) { setAccount(null); setError("Account service unavailable. Please retry."); }
      } finally { if (active) setLoading(false); }
    }
    const changed = () => { setAccount(null); setLoading(true); setRetry((value) => value + 1); };
    // Skip the discarded effect during React's development setup/cleanup replay.
    queueMicrotask(() => { void load(); });
    window.addEventListener("account-changed", changed);
    return () => { active = false; controller.abort(); window.removeEventListener("account-changed", changed); };
  }, [retry]);

  if (loading) return <div className="panel" role="status">{t("Loading your messages…", "Inapakia ujumbe wako…")}</div>;
  if (error) return <div className="panel"><p role="alert" className="error-message">{t(error)}</p><button type="button" className="button button-secondary" onClick={() => setRetry((value) => value + 1)}>{t("Retry")}</button></div>;
  if (!account) return <section className="panel messaging-sign-in">
    <span className="tool-icon green"><Icon name="chat" /></span>
    <h2>{t("Talk with an expert", "Zungumza na mtaalamu")}</h2>
    <p>{t("Log in to select an expert, send a private message and return to your saved conversations.", "Ingia kuchagua mtaalamu, kutuma ujumbe wa faragha na kurudi kwenye mazungumzo yaliyohifadhiwa.")}</p>
    <div className="account-page-actions"><Link className="button button-primary" href="/account/login">{t("Log in")}</Link><Link className="button button-secondary" href="/account/register">{t("Register")}</Link></div>
  </section>;
  return <Inbox key={account.id} account={account} />;
}

function Inbox({ account }: { account: ChatAccount }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const query = useSearchParams();
  const raw = query.get("conversation");
  const selected = raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
  const [data, setData] = useState<ConversationPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const request = useRef<AbortController | null>(null);
  const { refresh: refreshUnread } = useUnreadMessages();
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await messagingApi<ConversationPage>(`/conversations?offset=${offset}&limit=30`, { signal: controller.signal });
      if (!controller.signal.aborted) { setData(result); setError(""); }
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load conversations.");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [offset]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const timer = window.setInterval(() => void refresh(), 5_000);
    const visible = () => void refresh();
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.clearInterval(timer); request.current?.abort(); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const changed = useCallback(() => { void refresh(); refreshUnread(); }, [refresh, refreshUnread]);

  return <>
    <div className="messaging-layout" data-thread-selected={Boolean(selected)}>
      <aside className="messaging-inbox" aria-label={t("Conversations", "Mazungumzo")}>
        <div className="messaging-inbox-heading"><div><h2>{t("Conversations", "Mazungumzo")}</h2><p>{t("Private messages", "Ujumbe wa faragha")}</p></div>
          <button type="button" className="admin-icon-button" aria-label={t("Choose an expert", "Chagua mtaalamu")} title={t("Choose an expert", "Chagua mtaalamu")} onClick={() => setPicker(true)}><Icon name="plus" size={19} /></button>
        </div>
        {error && <div className="messaging-inline-error"><p role="alert">{t(error)}</p><button type="button" onClick={() => void refresh()}>{t("Retry")}</button></div>}
        <nav className="conversation-list" aria-label={t("Your conversations", "Mazungumzo yako")}>
          {!data && !error && <p className="messaging-empty-copy" role="status">{t("Loading conversations…", "Inapakia mazungumzo…")}</p>}
          {data?.items.map((conversation) => <Link key={conversation.id} href={`/chat?conversation=${conversation.id}`} scroll={false} aria-current={selected === conversation.id ? "page" : undefined}>
            <span className="chat-avatar" aria-hidden="true">{initials(conversation.participant.name)}</span>
            <span className="conversation-preview"><strong>{conversation.participant.name || t("Unnamed account", "Akaunti bila jina")}</strong><span>{conversation.last_message || t("Start the conversation", "Anza mazungumzo")}</span><small>{messageTime(conversation.last_message_at, language)}</small></span>
            {conversation.unread_count > 0 && <span className="conversation-unread" aria-label={`${conversation.unread_count} ${t("unread messages", "ujumbe ambao haujasomwa")}`}>{conversation.unread_count > 99 ? "99+" : conversation.unread_count}</span>}
          </Link>)}
          {data?.total === 0 && <div className="messaging-list-empty"><Icon name="chat" size={28} /><strong>{t("No conversations yet", "Bado hakuna mazungumzo")}</strong><p>{t("Choose an expert to start a private conversation.", "Chagua mtaalamu kuanza mazungumzo ya faragha.")}</p><button type="button" className="button button-primary" onClick={() => setPicker(true)}>{t("Choose an expert", "Chagua mtaalamu")}</button></div>}
        </nav>
        {data && data.total > 30 && <div className="messaging-list-pagination"><button type="button" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - 30))}>{t("Previous", "Iliyotangulia")}</button><span>{offset + 1}–{Math.min(offset + 30, data.total)} / {data.total}</span><button type="button" disabled={offset + 30 >= data.total} onClick={() => setOffset((value) => value + 30)}>{t("Next", "Inayofuata")}</button></div>}
      </aside>
      {selected ? <ConversationThread key={`${account.id}-${selected}`} id={selected} account={account} onChange={changed} /> : <section className="messaging-welcome">
        <span className="tool-icon green"><Icon name="chat" size={26} /></span><h2>{t("A conversation with a person", "Mazungumzo na mtu")}</h2><p>{t("Select a conversation or choose an expert from the directory. Messages are saved to your account.", "Chagua mazungumzo au mtaalamu kwenye orodha. Ujumbe unahifadhiwa kwenye akaunti yako.")}</p><button type="button" className="button button-primary" onClick={() => setPicker(true)}>{t("Choose an expert", "Chagua mtaalamu")}</button>
      </section>}
    </div>
    <p className="messaging-privacy-note">{t("Only the two participants can access a conversation. Expert accounts use the demo’s administrator role; credentials and response times are not verified. Shared observations and messages are not automatically validated advice.", "Washiriki wawili pekee wanaweza kufikia mazungumzo. Wataalamu hutumia akaunti za wasimamizi katika onyesho hili; sifa na muda wa kujibu havijathibitishwa. Ujumbe si ushauri uliothibitishwa moja kwa moja.")}</p>
    {picker && <ExpertPicker onClose={() => setPicker(false)} onSelect={(conversation) => { setPicker(false); setOffset(0); changed(); router.push(`/chat?conversation=${conversation.id}`, { scroll: false }); }} />}
  </>;
}

function ExpertPicker({ onClose, onSelect }: { onClose: () => void; onSelect: (conversation: Conversation) => void }) {
  const { t } = useLanguage();
  const [experts, setExperts] = useState<ChatPerson[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void messagingApi<ChatPerson[]>("/experts", { signal: controller.signal }).then((people) => { setExperts(people); setError(""); }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load experts."); });
    return () => controller.abort();
  }, [retry]);
  async function choose(person: ChatPerson) {
    if (busy !== null) return;
    setBusy(person.id); setError("");
    try {
      const conversation = await messagingApi<Conversation>("/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expert_id: person.id }) });
      onSelect(conversation);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the conversation."); }
    finally { setBusy(null); }
  }
  const filtered = experts?.filter((person) => `${person.name} ${personLocation(person)}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <RecordModal title={t("Choose an expert", "Chagua mtaalamu")} onClose={onClose}>
    <p className="messaging-picker-note">{t("Choose a registered expert-review account. County and area are self-reported.", "Chagua akaunti iliyosajiliwa ya mtaalamu wa ukaguzi. Kaunti na eneo vimeingizwa na mhusika.")}</p>
    <label className="field-label">{t("Search by name or area", "Tafuta kwa jina au eneo")}<input className="field" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {error && <div className="messaging-inline-error"><p role="alert">{t(error)}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>{t("Retry")}</button></div>}
    {!experts && !error && <p role="status">{t("Loading experts…", "Inapakia wataalamu…")}</p>}
    <ul className="expert-directory">{filtered?.map((person) => <li key={person.id}><span className="chat-avatar" aria-hidden="true">{initials(person.name)}</span><div><strong>{person.name}</strong><p>{personLocation(person) || t("Location not provided", "Eneo halijawekwa")}</p><small>{t("Expert review account", "Akaunti ya mtaalamu wa ukaguzi")}</small></div><button type="button" className="button button-secondary" aria-label={`${t("Chat with", "Zungumza na")} ${person.name}`} disabled={busy !== null} onClick={() => void choose(person)}>{busy === person.id ? t("Opening…", "Inafungua…") : t("Chat", "Gumzo")}</button></li>)}</ul>
    {experts?.length === 0 && <p className="messaging-empty-copy">{t("No expert accounts are available yet. An administrator can create one using the backend account script.", "Bado hakuna akaunti za wataalamu. Msimamizi anaweza kuunda moja kupitia hati ya akaunti ya seva.")}</p>}
    {experts && experts.length > 0 && filtered?.length === 0 && <p className="messaging-empty-copy">{t("No experts match that search.", "Hakuna wataalamu wanaolingana na utafutaji huo.")}</p>}
  </RecordModal>;
}

function ConversationThread({ id, account, onChange }: { id: number; account: ChatAccount; onChange: () => void }) {
  const { t, language } = useLanguage();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [newBelow, setNewBelow] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastId = useRef(0);
  const lastRead = useRef(0);
  const reading = useRef(false);
  const active = useRef(false);
  const sendingLock = useRef(false);
  const pendingSend = useRef<{ body: string; key: string } | null>(null);
  const refreshMessages = useRef<() => Promise<void>>(async () => {});

  const markRead = useCallback(async () => {
    const through = lastId.current;
    if (!active.current || !through || through <= lastRead.current || reading.current || !atBottom.current || document.visibilityState !== "visible" || !document.hasFocus()) return;
    reading.current = true;
    const previous = lastRead.current;
    lastRead.current = through;
    try {
      await messagingApi("/conversations/" + id + "/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ through_message_id: through }) });
      if (active.current) onChange();
    } catch { if (active.current) lastRead.current = previous; }
    finally { reading.current = false; }
  }, [id, onChange]);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    let initialized = false;
    let controller: AbortController | null = null;
    let running: Promise<void> | null = null;
    async function load() {
      if (cancelled || document.visibilityState !== "visible" || !navigator.onLine) return;
      controller = new AbortController();
      try {
        const result = await messagingApi<MessagePage>(`/conversations/${id}/messages${initialized ? `?after_id=${lastId.current}` : ""}`, { signal: controller.signal });
        if (cancelled) return;
        setConversation(result.conversation);
        setError("");
        if (!initialized) setHasEarlier(result.has_earlier);
        const incoming = result.messages;
        if (incoming.length) {
          lastId.current = incoming[incoming.length - 1].id;
          setMessages((old) => [...new Map([...old, ...incoming].map((message) => [message.id, message])).values()].sort((a, b) => a.id - b.id));
          if (!atBottom.current) setNewBelow(true);
        }
        initialized = true;
        // Drain bursts in order; never advance the read cursor past messages
        // that were skipped by an incremental page.
        if (result.has_more) { await load(); return; }
        requestAnimationFrame(() => {
          if (!cancelled && atBottom.current && scroll.current) {
            scroll.current.scrollTop = scroll.current.scrollHeight;
            void markRead();
          }
        });
      } catch (reason) {
        if (!cancelled && !controller?.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load messages.");
      } finally { if (!cancelled) setLoading(false); }
    }
    async function refresh() {
      if (running) await running;
      if (cancelled) return;
      running = load();
      await running;
      running = null;
    }
    refreshMessages.current = refresh;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    const visible = () => void refresh();
    window.addEventListener("focus", visible);
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { active.current = false; cancelled = true; controller?.abort(); window.clearInterval(timer); window.removeEventListener("focus", visible); window.removeEventListener("online", visible); document.removeEventListener("visibilitychange", visible); };
  }, [id, markRead]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (atBottom.current && scroll.current) { scroll.current.scrollTop = scroll.current.scrollHeight; void markRead(); }
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, markRead]);

  async function earlier() {
    if (loadingEarlier || !messages.length) return;
    setLoadingEarlier(true);
    const previousHeight = scroll.current?.scrollHeight ?? 0;
    const previousTop = scroll.current?.scrollTop ?? 0;
    atBottom.current = false;
    try {
      const result = await messagingApi<MessagePage>(`/conversations/${id}/messages?before_id=${messages[0].id}`);
      if (!active.current) return;
      setMessages((old) => [...new Map([...result.messages, ...old].map((message) => [message.id, message])).values()].sort((a, b) => a.id - b.id));
      setHasEarlier(result.has_earlier);
      requestAnimationFrame(() => { if (scroll.current) scroll.current.scrollTop = previousTop + scroll.current.scrollHeight - previousHeight; });
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : "Could not load earlier messages."); }
    finally { if (active.current) setLoadingEarlier(false); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sendingLock.current) return;
    sendingLock.current = true; setSending(true); setSendError("");
    if (pendingSend.current?.body !== body) pendingSend.current = { body, key: crypto.randomUUID() };
    const key = pendingSend.current.key;
    try {
      await messagingApi<ChatMessage>(`/conversations/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, client_message_id: key }) });
      if (!active.current) return;
      setDraft(""); pendingSend.current = null; atBottom.current = true;
      await refreshMessages.current();
      onChange();
    } catch (reason) { if (active.current) setSendError(reason instanceof Error ? reason.message : "Could not send. Your draft is kept; retry."); }
    finally { sendingLock.current = false; if (active.current) setSending(false); }
  }

  return <section className="messaging-thread" aria-label={t("Selected conversation", "Mazungumzo yaliyochaguliwa")}>
    <header className="messaging-thread-heading"><Link className="messaging-back" href="/chat" aria-label={t("Back to conversations", "Rudi kwenye mazungumzo")}><Icon name="back" size={20} /></Link><span className="chat-avatar" aria-hidden="true">{initials(conversation?.participant.name || "?")}</span><div><h2>{conversation?.participant.name || t("Conversation", "Mazungumzo")}</h2><p>{conversation ? personLocation(conversation.participant) || t("Location not provided", "Eneo halijawekwa") : t("Loading…", "Inapakia…")}</p></div></header>
    {error && <div className="messaging-inline-error"><p role="alert">{t(error)}</p><button type="button" onClick={() => void refreshMessages.current()}>{t("Retry")}</button></div>}
    <div ref={scroll} className="messaging-message-list" role="log" aria-label={t("Conversation messages", "Ujumbe wa mazungumzo")} aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={() => {
      const pane = scroll.current;
      if (!pane) return;
      atBottom.current = pane.scrollHeight - pane.clientHeight - pane.scrollTop < 40;
      if (atBottom.current) { setNewBelow(false); void markRead(); }
    }}>
      {hasEarlier && <button type="button" className="messaging-earlier" disabled={loadingEarlier} onClick={() => void earlier()}>{loadingEarlier ? t("Loading…", "Inapakia…") : t("Load earlier messages", "Pakia ujumbe wa awali")}</button>}
      {loading && <p className="messaging-empty-copy" role="status">{t("Loading messages…", "Inapakia ujumbe…")}</p>}
      {!loading && !error && messages.length === 0 && <p className="messaging-empty-copy">{t("Send the first message. Include the crop or animal, symptoms, and the question you want to discuss.", "Tuma ujumbe wa kwanza. Taja mmea au mnyama, dalili, na swali unalotaka kujadili.")}</p>}
      {messages.map((message) => <article key={message.id} className={`person-message ${message.sender_id === account.id ? "own" : "received"}`}><span className="sr-only">{message.sender_id === account.id ? t("You", "Wewe") : conversation?.participant.name}: </span><p>{message.body}</p><time dateTime={message.created_at}>{messageTime(message.created_at, language)}</time></article>)}
    </div>
    {newBelow && <button type="button" className="messaging-new-below" onClick={() => { atBottom.current = true; if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; setNewBelow(false); void markRead(); }}>{t("New messages ↓", "Ujumbe mpya ↓")}</button>}
    {sendError && <p className="messaging-send-error" role="alert">{t(sendError)} {t("Your draft is kept. Try sending again.", "Rasimu imehifadhiwa hapa. Jaribu kutuma tena.")}</p>}
    <form className="messaging-composer" onSubmit={send} aria-busy={sending}><label><span className="sr-only">{t("Your message", "Ujumbe wako")}</span><textarea className="field" rows={2} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("Write a message…", "Andika ujumbe…")} required disabled={sending || !conversation} /></label><button type="submit" className="button button-primary" disabled={sending || !draft.trim() || !conversation} aria-label={t("Send message")}><Icon name="send" size={20} /><span className="sr-only">{sending ? t("Sending…", "Inatuma…") : t("Send message")}</span></button></form>
  </section>;
}
