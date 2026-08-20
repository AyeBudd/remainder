import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { mailerReady, sendMail, wrapEmail } from "@/lib/mail";

export type AccountPrefs = {
  hasPassword: boolean;
  newsletter: boolean;
  dcaAlerts: boolean;
  mailerReady: boolean;
};

async function loadPrefs(userId: string): Promise<AccountPrefs> {
  const sql = await getSql();
  const creds = await sql<{ n: string | number }>`
    select count(*) as n from account
    where "userId" = ${userId} and "password" is not null
  `;
  const rows = await sql<{ newsletter: boolean; dca_alerts: boolean }>`
    select newsletter, dca_alerts from user_settings where user_id = ${userId}
  `;
  const row = rows[0];
  return {
    hasPassword: Number(creds[0]?.n ?? 0) > 0,
    newsletter: Boolean(row?.newsletter),
    dcaAlerts: Boolean(row?.dca_alerts),
    mailerReady: mailerReady(),
  };
}

export const getAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccountPrefs> => {
    return loadPrefs(context.userId);
  });

const emailSchema = z.string().trim().email().max(160);

export const updateAccountEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ context, data: email }) => {
    const sql = await getSql();
    const taken = await sql<{ id: string }>`
      select id from "user" where email = ${email} and id <> ${context.userId} limit 1
    `;
    if (taken[0]) throw new Error("That email is already in use");
    await sql`
      update "user"
      set email = ${email}, "updatedAt" = now()
      where id = ${context.userId}
    `;
    return { email };
  });

const prefsSchema = z.object({
  newsletter: z.boolean(),
  dcaAlerts: z.boolean(),
});

export const saveAccountPrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => prefsSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const prev = await sql<{ newsletter: boolean; dca_alerts: boolean }>`
      select newsletter, dca_alerts from user_settings where user_id = ${context.userId}
    `;
    await sql`
      insert into user_settings (user_id, newsletter, dca_alerts, updated_at)
      values (${context.userId}, ${data.newsletter}, ${data.dcaAlerts}, now())
      on conflict (user_id) do update set
        newsletter = excluded.newsletter,
        dca_alerts = excluded.dca_alerts,
        updated_at = now()
    `;
    const users = await sql<{ email: string; name: string }>`
      select email, name from "user" where id = ${context.userId}
    `;
    const to = users[0]?.email;
    const name = users[0]?.name ?? "there";
    const wasNews = Boolean(prev[0]?.newsletter);
    const wasAlerts = Boolean(prev[0]?.dca_alerts);
    if (to && mailerReady()) {
      if (data.newsletter && !wasNews) {
        await sendMail({
          to,
          subject: "You're on the Remaindr list",
          html: wrapEmail(
            "Newsletter on",
            `<p>Hey ${escapeHtml(name)} — you'll get the occasional Remaindr note. Toggle it off anytime in Account settings.</p>`,
          ),
          text: "You're subscribed to the Remaindr newsletter. Toggle off in Account settings.",
        });
      }
      if (data.dcaAlerts && !wasAlerts) {
        await sendMail({
          to,
          subject: "DCA off-target alerts are on",
          html: wrapEmail(
            "DCA alerts on",
            `<p>Hey ${escapeHtml(name)} — if a saved plan's ETA moves more than 25% from when you set it, we'll email you. Not financial advice.</p>`,
          ),
          text: "DCA off-target alerts are on. A 25% ETA change from when you set the plan will trigger a warning.",
        });
      }
    }
    return loadPrefs(context.userId);
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.literal("DELETE").parse(String(input ?? "").trim().toUpperCase()))
  .handler(async ({ context }) => {
    const sql = await getSql();
    const id = context.userId;
    const users = await sql<{ email: string | null }>`
      select email from "user" where id = ${id}
    `;
    await sql`delete from dca_plans where user_id = ${id}`;
    await sql`delete from holdings where user_id = ${id}`;
    await sql`delete from user_wallets where user_id = ${id}`;
    await sql`delete from user_settings where user_id = ${id}`;
    const email = users[0]?.email;
    if (email) {
      await sql`delete from verification where identifier = ${email}`;
    }
    await sql`delete from "session" where "userId" = ${id}`;
    await sql`delete from "account" where "userId" = ${id}`;
    await sql`delete from "user" where id = ${id}`;
    return { ok: true as const };
  });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
