import { ENV } from "../_core/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const { to, subject, html, text } = input;

  if (!to.includes("@")) {
    console.warn("[Email] Invalid recipient:", to);
    return false;
  }

  if (ENV.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.emailFrom,
        to: [to],
        subject,
        html,
        text: text ?? stripHtml(html),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Email] Resend error:", res.status, body);
      return false;
    }
    return true;
  }

  console.log(`[Email] (dev) To: ${to}\nSubject: ${subject}\n${text ?? stripHtml(html)}`);
  return true;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function isEmailConfigured(): boolean {
  return Boolean(ENV.resendApiKey);
}

export function buildPasswordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Reset your TrendHunter password";
  const text = `You requested a password reset for TrendHunter.\n\nOpen this link to choose a new password (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111;">
  <p>You requested a password reset for <strong>TrendHunter</strong>.</p>
  <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 18px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Reset password</a></p>
  <p style="font-size: 14px; color: #555;">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
  <p style="font-size: 12px; color: #888; word-break: break-all;">${resetUrl}</p>
</body>
</html>`;
  return { subject, html, text };
}
