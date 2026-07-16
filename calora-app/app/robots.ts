// Dynamic robots.txt — Next.js will serve this at /robots.txt automatically.
// Allow all crawlers, point them at the sitemap, disallow the API surface.

import type { MetadataRoute } from "next";

const SITE = "https://calora.develalfy.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/try",
          "/b2b",
          "/embed",
          "/pricing",
          "/app",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/api/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/account",
          "/_next/",
          "/icon-",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}