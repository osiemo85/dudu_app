/** Validate the server-only origin before building API rewrites. */
export function getBackendUrl(env: Record<string, string | undefined>): string | undefined {
  const value = env.BACKEND_URL?.trim();
  const hosted = env.VERCEL === "1" && env.VERCEL_ENV !== "development";
  if (!value) {
    if (hosted) throw new Error("Set BACKEND_URL in Vercel to the public HTTPS origin of the deployed FastAPI backend, then redeploy.");
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("BACKEND_URL must be a complete HTTP or HTTPS origin.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname.replace(/\/+$/, "") || url.search || url.hash) {
    throw new Error("BACKEND_URL must contain only the FastAPI origin, without credentials, /api/v1, a query, or a fragment.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const privateHost = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host.endsWith(".internal") || /^(0|10|127)\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::" || host === "::1" || (/^(fc|fd|fe80:)/i.test(host) && host.includes(":"));
  if (hosted && (url.protocol !== "https:" || privateHost)) {
    throw new Error("Vercel BACKEND_URL must be a public HTTPS FastAPI origin. Localhost and private addresses cannot be reached by Vercel rewrites.");
  }
  if (hosted && [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].includes(url.host)) {
    throw new Error("BACKEND_URL points to this frontend. Use the separate FastAPI deployment origin.");
  }
  return url.origin;
}
