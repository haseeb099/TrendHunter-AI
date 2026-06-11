import { AuthLayout } from "@/components/AuthLayout";
import { Link } from "wouter";

export default function Terms() {
  return (
    <AuthLayout
      title="Terms of Service"
      subtitle="Private beta — last updated June 2026"
    >
      <article className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to DropHunter / TrendHunter-AI
          (&quot;Service&quot;) during our private beta. By creating an account, you agree to these Terms.
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Beta software</h2>
          <p>
            The Service is provided as a pre-release beta. Features, data sources, pricing, and availability
            may change without notice. Cached and AI-generated data may be incomplete or outdated — verify
            critical business decisions independently.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Acceptable use</h2>
          <p>
            You may use the Service for lawful product research and e-commerce planning. You may not scrape,
            reverse-engineer, resell access, abuse rate limits, or use the Service to violate marketplace or
            third-party API terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Accounts & billing</h2>
          <p>
            You are responsible for safeguarding your credentials. Paid plans and trials are subject to the
            plan limits shown in your workspace. We may suspend accounts that violate these Terms or pose
            abuse risk.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Disclaimer</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE
            ACCURACY OF MARKETPLACE, TREND, OR SUPPLIER DATA. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
            ARE NOT LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about these Terms? Email{" "}
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
