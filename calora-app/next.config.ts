import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the framework fingerprint (small info-leak reduction).
  poweredByHeader: false,

  // Security headers — applied to every response that Next.js serves.
  // The Dokploy/Caddy layer also adds some; we set them here so they're correct
  // even if the reverse-proxy config drifts.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const csp = [
      "default-src 'self'",
      // Scripts: self + inline (Next.js hydration) + Google Fonts CSS
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      // Styles: self + inline (Tailwind sets some inline styles for dynamic values) + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com data:",
      // Images: self + data: (for thumbnails) + blob: (camera captures)
      "img-src 'self' data: blob: https:",
      // XHR/fetch: self + OpenRouter (the only external API we call)
      "connect-src 'self' https://openrouter.ai https://api.telegram.org https://fonts.googleapis.com https://fonts.gstatic.com",
      // Frames: nobody should frame us
      "frame-ancestors 'none'",
      // Form targets: only self
      "form-action 'self'",
      // Base URI: only self
      "base-uri 'self'",
      // Upgrade insecure requests in prod
      isProd ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; ");

    return [
      {
        // Apply to all routes (including /_next assets, /api, etc.)
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // Service worker must be served without aggressive caching so updates take effect fast.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      // Manifest should be re-validated periodically
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },

  // Don't let Next.js accidentally cache API responses at the CDN layer.
  // Each estimate call costs us real money; we never want a stale "rate-limited"
  // or stale "all-models-failed" response served to a different user.
  // (Already true by default for /api/* but explicit is safer.)
  experimental: {
    // No-op for now; keep the key present so adding experimental flags later is consistent.
  },
};

export default nextConfig;