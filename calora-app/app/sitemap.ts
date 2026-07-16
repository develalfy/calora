// Dynamic sitemap.xml — Next.js will serve this at /sitemap.xml automatically.
//
// Indexable surfaces as of 2026-07-16:
//   - /              → marketing landing (priority 1.0, weekly)
//   - /try           → anon top-of-funnel demo (priority 0.9, weekly)
//   - /b2b           → B2B pitch + lead form (priority 0.9, weekly)
//   - /embed         → drop-in widget demo (priority 0.85, weekly)
//   - /pricing       → money page (priority 0.95, weekly)
//   - /privacy       → legal (priority 0.3, monthly)
//   - /terms         → legal (priority 0.3, monthly)
//
// NOT indexed (auth/utility; surfaces in robots.ts as allow but
// search engines shouldn't prioritize them):
//   - /app           → requires login
//   - /sign-in, /sign-up, /forgot-password, /account
//
// Change-frequency is a Google hint, not a directive. weekly for marketing
// surfaces (we update copy often enough), monthly for legal. Real CE helps
// more than this field.

import type { MetadataRoute } from "next";

const SITE = "https://calora.develalfy.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE}/try`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/b2b`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/embed`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE}/pricing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${SITE}/privacy`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE}/terms`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
