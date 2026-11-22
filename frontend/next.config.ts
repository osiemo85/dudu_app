import type { NextConfig } from "next";
import { getBackendUrl } from "./lib/backend-config";

const backendUrl = getBackendUrl(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Photo analysis, evidence lookup and review can exceed the 30-second default.
    proxyTimeout: 300_000,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/disease/admin/disease_case",
        destination: "/disease/admin/disease_cases",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
