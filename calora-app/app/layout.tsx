import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const SITE = "https://calora.develalfy.me";
const TITLE = "Calora — snap a meal, get calories instantly";
const DESCRIPTION =
  "AI calorie tracker. Snap a photo or type a description, get calorie and macro estimates in 5 seconds. No signup. Data stays on device.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: TITLE,
    template: "%s — Calora",
  },
  description: DESCRIPTION,
  applicationName: "Calora",
  keywords: ["calorie", "tracker", "AI", "food", "photo", "PWA", "macro"],
  authors: [{ name: "Calora" }],
  creator: "Calora",
  publisher: "Calora",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE,
    siteName: "Calora",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Calora — snap a meal, get calories instantly",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@calora",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Calora",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff6f4d",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Cal Sans (display) + Inter (body) — Self-host for PWA offline */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cal+Sans&display=swap"
        />
        <meta name="theme-color" content="#fbfaf7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0c0a08" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Calora" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#ff6f4d" />
        <meta name="color-scheme" content="light dark" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="h-full bg-[var(--canvas)] text-[var(--ink)]">
        {children}
        {/* Structured data: SoftwareApplication for SEO + AI crawlers. */}
        <Script
          id="ld-software"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Calora",
              url: SITE,
              applicationCategory: "HealthApplication",
              operatingSystem: "Web, iOS, Android",
              description: DESCRIPTION,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free tier with 5 scans/day",
              },
              featureList: [
                "Photo calorie estimation",
                "Text-based calorie estimation",
                "Edit-before-save",
                "Daily macro tracking",
                "History export",
                "PWA install",
                "Offline support",
              ],
              aggregateRating: undefined, // intentionally unset; never fabricate ratings
            }),
          }}
        />
      </body>
    </html>
  );
}