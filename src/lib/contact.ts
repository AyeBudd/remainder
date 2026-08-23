import { createServerFn } from "@tanstack/react-start";
import { mailerReady, sendMail, wrapEmail } from "@/lib/mail";

export const PUBLIC_CONTACT_EMAIL = "hello@remaindr.xyz";

const ESC: Record<string, string> = {
  "&": "\u0026amp;",
  "<": "\u0026lt;",
  ">": "\u0026gt;",
  '"': "\u0026quot;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => ESC[ch] ?? ch);
}

export const sendContact = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const name = String(row.name ?? "").trim().slice(0, 80);
    const email = String(row.email ?? "").trim().slice(0, 120);
    const message = String(row.message ?? "").trim().slice(0, 4000);
    const trap = String(row.company ?? "").trim();
    return { name, email, message, trap };
  })
  .handler(async ({ data }): Promise<{ sent: boolean; error?: string }> => {
    if (data.trap) return { sent: true };
    if (!data.email.includes("@") || data.message.length < 8) {
      return { sent: false, error: "Need a real email and a short message." };
    }
    if (!mailerReady()) return { sent: false, error: "mailto" };
    const to = process.env.CONTACT_INBOX?.trim() || PUBLIC_CONTACT_EMAIL;
    const fromName = data.name || "No name";
    const result = await sendMail({
      to,
      subject: `Remaindr contact — ${fromName}`,
      html: wrapEmail(
        "Contact",
        `<p><strong>${escapeHtml(fromName)}</strong> <${escapeHtml(data.email)}></p><p>${escapeHtml(data.message).replace(/\n/g, "<br/>")}</p>`,
      ),
      text: `${fromName} <${data.email}>\n\n${data.message}`,
    });
    return result.sent ? { sent: true } : { sent: false, error: result.error ?? "send failed" };
  });
