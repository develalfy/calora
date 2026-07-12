import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calora — snap a meal, get calories instantly",
  description:
    "AI calorie tracker. Snap a photo or type a description, get calorie and macro estimates in 5 seconds. No signup. Data stays on device.",
  applicationName: "Calora",
  keywords: ["calorie", "tracker", "AI", "food", "photo", "PWA"],
  manifest: "/manifest.json",
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
      </head>
      <body className="min-h-full flex flex-col bg-[var(--canvas)] text-[var(--ink)]">
        {children}
        <Script id="register-sw" strategy="afterInteractive">
          {`if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.error("SW register failed", e));
  });
}`}
        </Script>
      </body>
    </html>
  );
}
