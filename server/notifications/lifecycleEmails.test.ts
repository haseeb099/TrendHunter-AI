/**
 * Lifecycle email template tests.
 * Implemented and updated by Cursor — June 13, 2026.
 */
import { describe, expect, it } from "vitest";
import {
  buildWelcomeEmail,
  buildTrialEndingEmail,
  buildPaymentFailedEmail,
} from "./lifecycleEmails";

describe("lifecycleEmails", () => {
  it("buildWelcomeEmail includes dashboard link", () => {
    const { subject, html, text } = buildWelcomeEmail("Alex");
    expect(subject).toContain("Welcome");
    expect(html).toContain("Alex");
    expect(text).toContain("/dashboard");
  });

  it("buildTrialEndingEmail pluralizes days", () => {
    const one = buildTrialEndingEmail("Alex", 1);
    expect(one.subject).toContain("1 day");
    const three = buildTrialEndingEmail("Alex", 3);
    expect(three.subject).toContain("3 days");
  });

  it("buildPaymentFailedEmail includes billing CTA", () => {
    const { subject, html } = buildPaymentFailedEmail("Alex");
    expect(subject.toLowerCase()).toContain("payment");
    expect(html).toContain("billing");
  });
});
