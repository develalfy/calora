// app/try/metadata.ts — server-side metadata for /try.
//
// Why this lives in a sibling file (not at the top of page.tsx):
//   Next.js App Router allows per-route `metadata` exports ONLY from server
//   components. `app/try/page.tsx` is `"use client"` because it owns form
//   state and AI call dispatch. Splitting the metadata into its own
//   `metadata.ts` (server by default) gives the route a unique <title>,
//   description, canonical, and OG image — without refactoring the form.
//
// SEO playbook (per docs/research/seo.md):
//   - Title is unique and intent-matched (visitor typed "AI calorie tracker" —
//     match the search intent, not the tagline).
//   - Description is <160 chars, has the call-to-action, no clickbait.
//   - Canonical is absolute + matches the deployed protocol (https).
//   - OG image is currently shared with the root; if we ship a dedicated
//     `og-try.png` later, swap the `images` URL here.

import type { Metadata } from "next";

const SITE = "https://calora.develalfy.me";
const PATH = "/try";

export const metadata: Metadata = {
  title: "Try the AI calorie tracker — no signup",
  description:
    "Type what you ate. Calora's AI estimates calories and macros in 5 seconds. No signup, no email. See the result, then decide.",
  alternates: {
    canonical: `${SITE}${PATH}`,
  },
  openGraph: {
    title: "Try Calora — AI calorie estimates, no signup",
    description:
      "Type a meal, get calories and macros in ~5 seconds. No account required.",
    url: `${SITE}${PATH}`,
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
  robots: {
    index: true,
    follow: true,
  },
};
