// app/b2b/page.tsx — server entry for /b2b.
// See app/try/page.tsx for the "server wrapper → client form" rationale.

import type { Metadata } from "next";
import PageClient from "./PageClient";

const SITE = "https://calora.develalfy.me";

export const metadata: Metadata = {
  title: "Calora for Teams — AI calorie tracking API & embeddable widget",
  description:
    "Drop Calora's AI calorie tracking into your product. REST API, white-label embed, per-estimate pricing. Built for fitness, coaching, and wellness platforms.",
  alternates: { canonical: `${SITE}/b2b` },
  openGraph: {
    title: "Calora API — AI calorie tracking for your product",
    description:
      "REST API + drop-in widget. Snap a meal, get structured calories and macros in ~5 seconds. White-label ready.",
    url: `${SITE}/b2b`,
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
  robots: { index: true, follow: true },
};

export default function B2BPage() {
  return <PageClient />;
}
