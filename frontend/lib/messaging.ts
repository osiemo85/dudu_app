export type ChatPerson = { id: number; name: string; role: string; county: string | null; area: string | null };
export type ChatAccount = ChatPerson & { email: string };
export type Conversation = { id: number; participant: ChatPerson; created_at: string; last_message_at: string; last_message: string | null; unread_count: number };
export type ConversationPage = { items: Conversation[]; total: number; offset: number; limit: number };
export type ChatMessage = { id: number; conversation_id: number; sender_id: number; body: string; client_message_id: string; created_at: string };
export type MessagePage = { conversation: Conversation; messages: ChatMessage[]; has_earlier: boolean; has_more: boolean };

export class MessagingError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function messagingApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/messaging${path}`, {
    ...init, credentials: "include", cache: "no-store",
    signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    if (response.status === 401) window.dispatchEvent(new Event("account-changed"));
    throw new MessagingError(typeof data?.detail === "string" ? data.detail : "Messages could not load. Check your connection and retry.", response.status);
  }
  return data as T;
}
export function personLocation(person: ChatPerson): string {
  return [person.area, person.county].filter(Boolean).join(", ");
}
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
}
