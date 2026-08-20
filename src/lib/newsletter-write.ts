import { BAKED_TOP_100 } from "@/lib/baked-assets";
import type { NewsletterIssue, NewsletterItem } from "@/lib/newsletter";
import { SEED_ISSUE } from "@/lib/newsletter-seed";

const FEEDS = [
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://www.theblock.co/rss.xml",
  "https://www.sec.gov/news/pressreleases.rss",
];

type Headline = { title: string; link: string; date: string; source: string; summary: string };

function stripTags(html: string): string {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string, source: string): Headline[] {
  const items: Headline[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const chunk of chunks.slice(0, 20)) {
    const title = stripTags(chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = stripTags(chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "")
      || chunk.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim()
      || "";
    const date = stripTags(
      chunk.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]
        ?? chunk.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]
        ?? "",
    );
    const summary = stripTags(
      chunk.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "",
    ).slice(0, 420);
    if (title) items.push({ title, link, date, source, summary });
  }
  return items;
}

async function gatherHeadlines(): Promise<Headline[]> {
  const cutoff = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const lists = await Promise.all(
    FEEDS.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { accept: "application/rss+xml, application/xml, text/xml" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [] as Headline[];
        const host = new URL(url).hostname.replace(/^www\./, "");
        return parseRss(await res.text(), host);
      } catch {
        return [] as Headline[];
      }
    }),
  );
  return lists
    .flat()
    .filter((h) => {
      const t = Date.parse(h.date);
      return !Number.isFinite(t) || t >= cutoff;
    })
    .slice(0, 40);
}

function top50Line(): string {
  return BAKED_TOP_100.slice(0, 50)
    .map((a) => `${a.symbol} (${a.name})`)
    .join(", ");
}

function fridaySlug(now = new Date()): string {
  const day = now.getUTCDay();
  const offset = day === 0 ? -2 : day < 5 ? 5 - day : 0;
  const friday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
  return friday.toISOString().slice(0, 10);
}

export function seedIssue(): NewsletterIssue {
  return SEED_ISSUE;
}

function coerceIssue(raw: unknown, slug: string, tester: boolean): NewsletterIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const itemsIn = Array.isArray(o.items) ? o.items : [];
  const items: NewsletterItem[] = [];
  for (const row of itemsIn) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const category = r.category;
    if (category !== "regulation" && category !== "unlock" && category !== "project" && category !== "macro") {
      continue;
    }
    const headline = String(r.headline ?? "").trim();
    const body = String(r.body ?? "").trim();
    if (!headline || !body) continue;
    const assets = Array.isArray(r.assets)
      ? r.assets.map((a) => String(a).toUpperCase()).filter(Boolean).slice(0, 6)
      : [];
    items.push({
      category,
      headline,
      body,
      assets,
      source: String(r.source ?? "Source").slice(0, 160),
      sourceUrl: typeof r.sourceUrl === "string" && r.sourceUrl.startsWith("http") ? r.sourceUrl : undefined,
    });
  }
  if (items.length === 0) return null;
  return {
    slug,
    title: String(o.title ?? `Remaindr brief — ${slug}`).slice(0, 120),
    lede: String(o.lede ?? "").slice(0, 500),
    items: items.slice(0, 12),
    tester,
    publishedAt: new Date().toISOString(),
  };
}

export async function generateNewsletter(opts?: {
  tester?: boolean;
  slug?: string;
}): Promise<NewsletterIssue> {
  const tester = Boolean(opts?.tester);
  const slug = opts?.slug ?? (tester ? "2026-08-20-tester" : fridaySlug());
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    if (tester) return seedIssue();
    throw new Error("XAI_API_KEY missing");
  }

  const headlines = await gatherHeadlines();
  const briefing =
    headlines.length > 0
      ? headlines
          .map((h, i) => `${i + 1}. ${h.title}\n   ${h.date} · ${h.source}\n   ${h.summary}\n   ${h.link}`)
          .join("\n\n")
      : "(No RSS items returned. Use only widely reported facts you can ground, or return fewer items.)";

  const system = `You write Remaindr Brief, a factual crypto digest.
Rules:
- Report only events that already happened or documents that were published.
- No predictions, price targets, “could”, “expected to rally”, “bullish”, “bearish”, “moon”, or investment advice.
- Cover token unlocks (scheduled amounts and dates), project updates (upgrades, votes, launches), government regulation, and major macro prints that already occurred.
- Watch this top-50 list. Mention a coin only if there is a material item. Skip the rest. Do not pad.
Top 50: ${top50Line()}
- Prefer primary sources (SEC, CFTC, project blogs, CoinDesk, The Block, Reuters).
- Past tense or present facts. Include dates and figures when known.
- Return JSON only.`;

  const user = `Write this week's Remaindr Brief as JSON:
{
  "title": "Remaindr brief — ${slug}",
  "lede": "2-3 sentences, facts only",
  "items": [
    {
      "category": "regulation" | "unlock" | "project" | "macro",
      "headline": "short factual headline",
      "body": "1-3 short paragraphs, facts only",
      "assets": ["BTC"],
      "source": "outlet or agency",
      "sourceUrl": "https://..."
    }
  ]
}
Use 3 to 8 items. Omit coins with no material news.
Source material:
${briefing}`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`xAI ${res.status}`);
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Newsletter JSON parse failed");
  }
  const issue = coerceIssue(parsed, slug, tester);
  if (!issue) throw new Error("Newsletter empty");
  return issue;
}
