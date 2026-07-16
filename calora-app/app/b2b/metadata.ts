// app/b2b/metadata.ts — server-side metadata for /b2b (Calora for Teams).
//
// B2B traffic converts differently from consumer:
//   - Buyers search "AI calorie API", "white-label food logger",
//     "meal tracking SDK", "calorie tracking for fitness apps".
//   - They're technical evaluators, not impulse visitors. The title and
//     description should signal "API + embed + white-label + per-estimate
//     pricing" — not hype.
//
// Per-route metadata.ts lets us write server-side metadata without
// restructuring the client-side form at /b2b/page.tsx.

import type { Metadata } from "next";

const SITE = "https://calora.develalfy.me";
const PATH = "/b2b";

export const metadata: Metadata = {
  title: "Calora for Teams — AI calorie tracking API & embeddable widget",
  description:
    "Drop Calora's AI calorie tracking into your product. REST API, white-label embed, per-estimate pricing. Built for fitness, coaching, and wellness platforms.",
  alternates: {
    canonical: `${SITE}${PATH}`,
  },
  openGraph: {
    title: "Calora API — AI calorie tracking for your product",
    description:
      "REST API + drop-in widget. Snap a meal, get structured calories and macros in ~5 seconds. White-label ready.",
    url: `${SITE}${PATH}`,
    siteName: "Calora",
    locale: "en_US",
    images: [
      {
        url: `${SITE}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Calora — embeddable AI calorie tracking for your platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calora API — embeddable AI calorie tracking",
    description:
      "REST API + drop-in widget. Snap a meal, get structured calories and macros in ~5 seconds.",
    images: [`${SITE}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};
