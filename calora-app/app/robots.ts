// Dynamic robots.txt — Next.js will serve this at /robots.txt automatically.
// Allow all crawlers, point them at the sitemap, disallow the API surface.

import type { MetadataRoute } from "next";

const SITE = "https://calora.develalfy.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/app", "/privacy", "/terms"],
        disallow: ["/api/", "/_next/", "/icon-"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}