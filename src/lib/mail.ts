/**
 * Outbound mail via Resend's HTTP API (no extra package).
 * Set RESEND_API_KEY + EMAIL_FROM on Vercel. Until then, prefs still save;
 * sends no-op with { sent: false }.
 */
export function mailerReady(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { sent: false, error: "no-mailer" };
  const from = process.env.EMAIL_FROM?.trim() || "Remaindr <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: body.slice(0, 240) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export function wrapEmail(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#0c0d0c;color:#f0efe8;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <p style="font-size:22px;letter-spacing:-0.03em;margin:0 0 24px;">Remaindr</p>
    <h1 style="font-size:28px;font-weight:400;letter-spacing:-0.03em;margin:0 0 16px;">${title}</h1>
    <div style="font-family:'Source Sans 3',system-ui,sans-serif;font-size:15px;line-height:1.55;color:#c8c7c0;">
      ${bodyHtml}
    </div>
    <p style="margin-top:32px;font-size:12px;color:#8e8d86;font-family:system-ui,sans-serif;">
      Not financial advice. Manage alerts in Account settings.
    </p>
  </div>
</body></html>`;
}
