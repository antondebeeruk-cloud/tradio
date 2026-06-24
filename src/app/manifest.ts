import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#061d34",
    description:
      "Quote, invoice, lead, customer, and job tracking software for UK tradespeople.",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/tradio-mark.png",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/tradio-mark.png",
        type: "image/png",
      },
    ],
    name: "Tradio",
    short_name: "Tradio",
    start_url: "/",
    theme_color: "#061d34",
  };
}
