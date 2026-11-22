export type ApiStatus = {
  connected: boolean;
  message: string;
};

/**
 * Browser requests stay on the Next.js origin. `next.config.ts` proxies this
 * path to FastAPI, so a browser opened through a remote/dev preview does not
 * try to resolve its own `localhost:8000`.
 */
const API_BASE_URL = "";
export const PUBLIC_API_BASE_URL = API_BASE_URL;

/** Keep proxy HTML/text errors out of account forms. */
export async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const unavailable = "The account service is unavailable. Please try again later.";
  const payload: unknown = await response.json().catch(() => null);
  if (payload === null || typeof payload !== "object") {
    throw new Error(unavailable);
  }
  if (!response.ok) {
    throw new Error("detail" in payload && typeof payload.detail === "string"
      ? payload.detail
      : fallbackMessage);
  }
  return payload as T;
}

export async function getApiStatus(): Promise<ApiStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      return { connected: false, message: "Backend unavailable" };
    }

    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "status" in data &&
      data.status === "ok"
    ) {
      return { connected: true, message: "Connected to FastAPI" };
    }

    return { connected: false, message: "Unexpected backend response" };
  } catch {
    return { connected: false, message: "Backend offline · start FastAPI to connect" };
  }
}
