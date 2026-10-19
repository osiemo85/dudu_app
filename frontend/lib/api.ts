export type ApiStatus = {
  connected: boolean;
  message: string;
};

const API_BASE_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";
export const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

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
