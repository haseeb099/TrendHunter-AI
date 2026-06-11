import { AuthLayout } from "@/components/AuthLayout";
import { Link } from "wouter";

export default function Privacy() {
  return (
    <AuthLayout
      title="Privacy Policy"
      subtitle="Private beta — last updated June 2026"
    >
      <article className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          This Privacy Policy describes how DropHunter / TrendHunter-AI (&quot;we&quot;, &quot;us&quot;)
          collects and uses information when you use our private beta Service.
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details: name, email, and authentication data you provide at registration.</li>
            <li>Usage data: searches, feature usage, credits consumed, and workspace activity for quotas and product improvement.</li>
            <li>Billing data: processed by Stripe when you subscribe; we store customer and subscription identifiers, not full card numbers.</li>
            <li>Technical logs: IP address, browser type, and error diagnostics for security and reliability.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">How we use information</h2>
          <p>
            We use your information to operate the Service, enforce plan limits, provide support, improve
            features, and send essential account or billing notices. We do not sell your personal data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Third parties</h2>
          <p>
            We rely on infrastructure and API partners (hosting, Stripe, AI providers, marketplace data
            sources) that process data on our behalf under their own terms. Search queries may be sent to
            configured live API providers when you explicitly use live features.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Retention & deletion</h2>
          <p>
            We retain account and usage data while your account is active and as needed for legal or billing
            obligations. You may request account deletion by contacting support; some records may be retained
            where required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Contact</h2>
          <p>
            Privacy questions:{" "}
            <a href="mailto:support@drophunter.ai" className="text-primary hover:underline">
              support@drophunter.ai
            </a>
            .
          </p>
        </section>

        <p className="pt-2">
          <Link href="/" className="text-primary font-medium hover:underline">
            ← Back to home
          </Link>
        </p>
      </article>
    </AuthLayout>
  );
}
