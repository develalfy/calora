import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Calora",
  description:
    "How Calora handles your data. TL;DR: your meal log lives on your device unless you create an account and opt-in to cloud sync. We don't sell your data, ever.",
};

const SECTIONS: Array<{ heading: string; body: React.ReactNode }> = [
  {
    heading: "1. What we collect",
    body: (
      <>
        <p className="mb-3">
          On the free tier, Calora stores your meal log entirely in your
          browser&apos;s localStorage. The data never leaves your device unless
          you explicitly choose to create an account and enable cloud sync.
        </p>
        <p>
          If you create a Calora Pro account, we collect your email address,
          account creation date, subscription status, and the meal log items
          you choose to sync. We do not collect your name, address, phone
          number, or any government ID.
        </p>
      </>
    ),
  },
  {
    heading: "2. Photos and food images",
    body: (
      <>
        <p className="mb-3">
          When you snap a photo for a meal scan, the image is sent to our AI
          provider (OpenRouter / Gemini 2.5 Flash) for the sole purpose of
          generating calorie and macro estimates. The provider processes the
          image and returns structured data; we do not store the photo on our
          servers. We may retain the AI&apos;s response for up to 30 days for
          abuse detection, then delete it.
        </p>
        <p>
          Photos are never used for advertising, never sold, and never shared
          with third parties other than the AI provider contracted to process
          them.
        </p>
      </>
    ),
  },
  {
    heading: "3. Payment information",
    body: (
      <p>
        Payment is processed by Stripe. We never see or store your credit card
        number, CVV, or full billing address. Stripe&apos;s privacy policy
        governs how they handle your payment data:{" "}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline"
        >
          stripe.com/privacy
        </a>
        .
      </p>
    ),
  },
  {
    heading: "4. Analytics",
    body: (
      <p>
        We use privacy-respecting analytics (PostHog Cloud or Plausible) to
        count visits, signups, and feature usage. We do not track you across
        other sites, do not use third-party advertising cookies, and do not
        build advertising profiles. You can opt out by enabling Do Not Track in
        your browser; we honor the DNT header.
      </p>
    ),
  },
  {
    heading: "5. Data export and deletion",
    body: (
      <>
        <p className="mb-3">
          You can export all your meal data to CSV at any time from the
          History view. On the free tier, this is just your localStorage. On
          Pro, the export includes everything synced to your account.
        </p>
        <p>
          You can delete your account and all associated data at any time from
          Settings → Delete Account. Deletion is permanent and processed within
          7 days; backup copies are purged within 30 days.
        </p>
      </>
    ),
  },
  {
    heading: "6. Children's privacy",
    body: (
      <p>
        Calora is not directed to children under 13. We do not knowingly
        collect personal information from children under 13. If you believe a
        child under 13 has created an account, contact us and we will delete
        it.
      </p>
    ),
  },
  {
    heading: "7. International users (GDPR)",
    body: (
      <p>
        If you are in the European Economic Area, United Kingdom, or
        Switzerland, you have the right to access, correct, port, and delete
        your personal data, and to object to or restrict its processing.
        Contact us at the email below to exercise these rights. Our legal
        basis for processing is your consent (for analytics) and contract
        performance (for Pro subscription).
      </p>
    ),
  },
  {
    heading: "8. Changes to this policy",
    body: (
      <p>
        If we make material changes, we will email Pro subscribers at least 14
        days before the changes take effect. The current effective date is
        shown at the top of this page.
      </p>
    ),
  },
  {
    heading: "9. Contact",
    body: (
      <p>
        Questions or requests? Email{" "}
        <a
          href="mailto:privacy@calora.app"
          className="text-[var(--accent)] underline"
        >
          privacy@calora.app
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--canvas)]">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <Link
          href="/"
          className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition inline-flex items-center gap-1 mb-8"
        >
          ← Back to calora
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-[36px] font-semibold tracking-[-0.02em] text-[var(--ink)] mb-2">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-[var(--ink-muted)] mb-8">
          Effective 2026-07-12
        </p>

        <p className="text-[15px] text-[var(--ink-soft)] leading-relaxed mb-10 p-4 rounded-[14px] bg-[var(--accent-soft)] border border-[var(--accent)]/20">
          <strong className="text-[var(--ink)]">TL;DR:</strong> Your meal log
          lives on your device unless you opt in to cloud sync. Photos are
          processed by our AI provider and not stored. We don&apos;t sell your
          data, ever. You can export or delete everything at any time.
        </p>

        <div className="space-y-8 text-[15px] text-[var(--ink)]">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-[-0.01em] mb-3">
                {s.heading}
              </h2>
              <div className="text-[var(--ink-soft)] leading-relaxed">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}