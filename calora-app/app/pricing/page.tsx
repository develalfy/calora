// app/pricing/page.tsx — server entry for /pricing.
// See app/try/page.tsx for the rationale.

import type { Metadata } from "next";
import PageClient from "./PageClient";

const SITE = "https://calora.develalfy.me";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Calora is free for 5 daily AI meal scans. Pro is $4.99/month or $39.99/year with unlimited scans. 7-day free trial, cancel anytime, no surprise charges.",
  alternates: { canonical: `${SITE}/pricing` },
  openGraph: {
    title: "Calora pricing — free or Pro at $4.99/mo",
    description:
      "Free for 5 daily AI scans. Pro from $4.99/mo or $39.99/yr with unlimited scans, cross-device sync, and priority AI.",
    url: `${SITE}/pricing`,
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
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PageClient />;
}
