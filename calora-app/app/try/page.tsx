// app/try/page.tsx — server entry for /try.
//
// Why this thin wrapper exists:
//   Next.js App Router only honors `export const metadata` from a server
//   component. The form lives in `PageClient.tsx` (`"use client"` because it
//   owns form state and dispatches the AI estimate). Without this server
//   wrapper, every page inherits the root layout's title — losing SEO.
//
// Title is intent-matched to the visitor (a searcher typing
// "AI calorie tracker" — match the intent, not the company tagline).
// Description stays under 160 chars and includes the call-to-action.

import type { Metadata } from "next";
import PageClient from "./PageClient";

const SITE = "https://calora.develalfy.me";

export const metadata: Metadata = {
  title: "Try the AI calorie tracker — no signup",
  description:
    "Type what you ate. Calora's AI estimates calories and macros in 5 seconds. No signup, no email. See the result, then decide.",
  alternates: { canonical: `${SITE}/try` },
  openGraph: {
    title: "Try Calora — AI calorie estimates, no signup",
    description:
      "Type a meal, get calories and macros in ~5 seconds. No account required.",
    url: `${SITE}/try`,
    siteName: "Calora",
    locale: "en_US",
    images: [
      {
        url: `${SITE}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Calora — try the AI calorie tracker without signing up",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Try Calora — no signup needed",
    description:
      "Type a meal, get calories and macros in ~5 seconds. No account required.",
    images: [`${SITE}/og-image.png`],
  },
  robots: { index: true, follow: true },
};

export default function TryPage() {
  return <PageClient />;
}
