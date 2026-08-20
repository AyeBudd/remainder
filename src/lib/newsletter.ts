export type NewsletterCategory = "regulation" | "unlock" | "project" | "macro";

export type NewsletterItem = {
  category: NewsletterCategory;
  headline: string;
  body: string;
  assets: string[];
  source: string;
  sourceUrl?: string;
};

export type NewsletterIssue = {
  slug: string;
  title: string;
  lede: string;
  items: NewsletterItem[];
  tester: boolean;
  publishedAt: string;
};

export const CATEGORY_LABEL: Record<NewsletterCategory, string> = {
  regulation: "Regulation",
  unlock: "Token unlocks",
  project: "Project updates",
  macro: "Macro",
};
