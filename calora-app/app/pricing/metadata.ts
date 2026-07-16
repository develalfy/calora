// app/pricing/metadata.ts — server-side metadata for /pricing.
//
// Money page. Search terms buyers use:
//   "calorie tracker subscription", "AI calorie app pricing",
//   "best food tracking app 2026" — long-tail commercial intent.
//
// Title + description should make the price clear upfront — searchers
// filter results by visible price signal.

import type { Metadata } from "next";

const SITE = "https://calora.develalfy.me";
const PATH = "/pricing";

export const metadata: Metadata = {
  title: "Pricing — Calora",
  description:
    "Calora is free for 5 daily AI meal scans. Pro is $4.99/month or $39.99/year with unlimited scans. 7-day free trial, cancel anytime, no surprise charges.",
  alternates: {
    canonical: `${SITE}${PATH}`,
  },
  openGraph: {
    title: "Calora pricing — free or Pro at $4.99/mo",
    description:
      "Free for 5 daily AI scans. Pro from $4.99/mo or $39.99/yr with unlimited scans, cross-device sync, and priority AI.",
    url: `${SITE}${PATH}`,
    siteName: "Calora",
    locale: "en_US",
    images: [
      {
        url: `${SITE}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Calora — pricing page",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calora pricing — free or Pro at $4.99/mo",
    description:
      "Free for 5 daily AI scans. Pro from $4.99/mo or $39.99/yr. 7-day free trial, cancel anytime.",
    images: [`${SITE}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};
