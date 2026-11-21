import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Duducare — Your farm companion",
    short_name: "Duducare",
    description:
      "Crop health, planting guidance, and farm notes. Simulated agricultural demo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ec",
    theme_color: "#17462f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
