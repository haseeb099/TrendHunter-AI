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
