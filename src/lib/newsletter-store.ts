import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { mailerReady, sendMail, wrapEmail } from "@/lib/mail";
import type { NewsletterIssue, NewsletterItem } from "@/lib/newsletter";
import { generateNewsletter, seedIssue, thisWeekSlug, weeklyIssueDue } from "@/lib/newsletter-write";

function asIssue(row: {
  slug: string;
  title: string;
  lede: string;
  body: unknown;
  tester: boolean;
  published_at: string | Date;
}): NewsletterIssue {
  const body = row.body as { items?: NewsletterItem[] } | NewsletterItem[];
  const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
  const publishedAt =
    row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at);
  return {
    slug: row.slug,
    title: row.title,
    lede: row.lede,
    items,
    tester: Boolean(row.tester),
    publishedAt,
  };
}

async function insertIssue(issue: NewsletterIssue): Promise<NewsletterIssue> {
  const sql = await getSql();
  const body = JSON.stringify({ items: issue.items });
  const rows = await sql<{
    slug: string;
    title: string;
    lede: string;
    body: unknown;
    tester: boolean;
    published_at: string | Date;
  }>`
    insert into newsletters (slug, title, lede, body, tester, published_at)
    values (${issue.slug}, ${issue.title}, ${issue.lede}, ${body}::jsonb, ${issue.tester}, ${issue.publishedAt}::timestamptz)
    on conflict (slug) do update set
      title = excluded.title,
      lede = excluded.lede,
      body = excluded.body,
      tester = excluded.tester
    returning slug, title, lede, body, tester, published_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Failed to save newsletter");
  return asIssue(row);
}

export async function listStoredIssues(): Promise<NewsletterIssue[]> {
  const sql = await getSql();
  const rows = await sql<{
    slug: string;
    title: string;
    lede: string;
    body: unknown;
    tester: boolean;
    published_at: string | Date;
  }>`
    select slug, title, lede, body, tester, published_at
    from newsletters
    order by published_at desc
    limit 24
  `;
  return rows.map(asIssue);
}

export async function ensureSeedIssue(): Promise<NewsletterIssue[]> {
  let issues = await listStoredIssues();
  if (issues.length > 0) return issues;
  const seeded = await insertIssue(seedIssue());
  return [seeded];
}

export async function publishWeeklyIssue(): Promise<{ slug: string; emailed: number; skipped?: string }> {
  const slug = thisWeekSlug();
  if (!weeklyIssueDue()) return { slug, emailed: 0, skipped: "not-due" };
  const sql = await getSql();
  const existing = await sql<{ slug: string }>`select slug from newsletters where slug = ${slug} limit 1`;
  if (existing[0]) return { slug, emailed: 0, skipped: "exists" };
  const issue = await generateNewsletter({ tester: false, slug });
  await insertIssue(issue);
  const emailed = await emailSubscribers(issue);
  return { slug: issue.slug, emailed };
}

async function emailSubscribers(issue: NewsletterIssue): Promise<number> {
  if (!mailerReady()) return 0;
  const sql = await getSql();
  const users = await sql<{ email: string; name: string }>`
    select u.email, u.name
    from user_settings s
    join "user" u on u.id = s.user_id
    where s.newsletter = true and u.email is not null
  `;
  const origin = (process.env.BETTER_AUTH_URL ?? "https://remaindr.xyz").replace(/\/+$/, "");
  const bullets = issue.items
    .slice(0, 6)
    .map((item) => `<li><strong>${item.headline}</strong></li>`)
    .join("");
  let mailed = 0;
  for (const user of users) {
    const result = await sendMail({
      to: user.email,
      subject: issue.title,
      html: wrapEmail(
        issue.title,
        `<p>${issue.lede}</p><ul>${bullets}</ul><p><a href="${origin}/#/news" style="color:#f0efe8;">Read the brief</a></p>`,
      ),
      text: `${issue.title}\n\n${issue.lede}\n\n${origin}/#/news`,
    });
    if (result.sent) mailed += 1;
  }
  return mailed;
}

export const listNewsletters = createServerFn({ method: "GET" }).handler(async () => {
  try {
    try {
      await publishWeeklyIssue();
    } catch {
      /* cron/page both retry; still show whatever is stored */
    }
    return await ensureSeedIssue();
  } catch {
    return [seedIssue()];
  }
});
