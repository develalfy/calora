// app/embed/metadata.ts — server-side metadata for /embed (the drop-in widget
// demo that B2B prospects see first).

import type { Metadata } from "next";

const SITE = "https://calora.develalfy.me";
const PATH = "/embed";

export const metadata: Metadata = {
  title: "Calora Embed — drop-in AI calorie tracking widget",
  description:
    "Copy one snippet, get a working meal-tracking widget. Demo the Calora embed live — AI photo + text estimates, no signup, ~5 second response.",
  alternates: {
    canonical: `${SITE}${PATH}`,
  },
  openGraph: {
    title: "Calora Embed — AI calorie tracking in your site",
    description:
      "One snippet, one demo. The Calora embed widget handles photo + text estimates and returns calories, macros, and confidence in ~5 seconds.",
    url: `${SITE}${PATH}`,
    siteName: "Calora",
    locale: "en_US",
    images: [
      {
        url: `${SITE}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Calora embed — AI calorie tracking widget for your site",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calora Embed — drop-in meal tracker",
    description:
      "Copy one snippet, demo the AI in ~5 seconds. Photo + text, calories + macros.",
    images: [`${SITE}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};
