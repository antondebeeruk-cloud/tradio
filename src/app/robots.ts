import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        allow: [
          "/",
          "/privacy-policy",
          "/terms",
          "/cookie-policy",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/customers",
          "/dashboard/",
          "/documents/",
          "/invoices",
          "/login",
          "/portal/",
          "/pricing",
          "/quotes",
          "/settings",
          "/signup",
        ],
        userAgent: "*",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
