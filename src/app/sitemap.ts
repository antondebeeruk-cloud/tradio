import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk";

const publicRoutes = [
  {
    changeFrequency: "weekly" as const,
    path: "/",
    priority: 1,
  },
  {
    changeFrequency: "weekly" as const,
    path: "/releases",
    priority: 0.6,
  },
  {
    changeFrequency: "monthly" as const,
    path: "/privacy-policy",
    priority: 0.3,
  },
  {
    changeFrequency: "monthly" as const,
    path: "/terms",
    priority: 0.3,
  },
  {
    changeFrequency: "monthly" as const,
    path: "/eula",
    priority: 0.3,
  },
  {
    changeFrequency: "monthly" as const,
    path: "/cookie-policy",
    priority: 0.3,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    changeFrequency: route.changeFrequency,
    lastModified: now,
    priority: route.priority,
    url: `${siteUrl}${route.path}`,
  }));
}
