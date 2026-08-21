import { useEffect, useState } from "react";
import { listNewsletters } from "@/lib/newsletter-store";
import { CATEGORY_LABEL, type NewsletterIssue } from "@/lib/newsletter";
import { Skeleton } from "@/components/ui/skeleton";

export function NewsletterPage() {
  const [issues, setIssues] = useState<NewsletterIssue[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listNewsletters()
      .then((next) => {
        if (!cancelled) setIssues(next);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!issues && !error) {
    return (
      <div className="mt-10 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const latest = issues?.[0];

  return (
    <section className="mt-8 sm:mt-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Brief</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight sm:text-6xl">Newsletter</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Major items only — regulation, token unlocks, project updates, and macro prints. No forecasts. Top 50
        coins are watched; a coin appears only if something material happened.
      </p>

      {error && !latest && (
        <p className="mt-8 text-sm text-destructive">Could not load the brief.</p>
      )}

      {latest && <IssueView issue={latest} />}

      {issues && issues.length > 1 && (
        <div className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight">Earlier</h2>
          <ul className="mt-4 space-y-3">
            {issues.slice(1).map((issue) => (
              <li key={issue.slug} className="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]">
                <p className="font-serif text-xl tracking-tight">{issue.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{issue.lede}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-12 text-[11px] leading-relaxed text-muted-foreground">
        Not financial advice. Items are summaries of public reports. The brief is due Friday 9:00 a.m. Eastern;
        if the scheduled job misses, opening this page publishes it. Opt in under Account settings for email.
      </p>
    </section>
  );
}

function IssueView({ issue }: { issue: NewsletterIssue }) {
  const date = issue.publishedAt.slice(0, 10);
  return (
    <article className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight">{issue.title}</h2>
        {issue.tester && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs tracking-wide text-muted-foreground uppercase">
            Tester
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{date}</p>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/90">{issue.lede}</p>
      <div className="mt-8 space-y-4">
        {issue.items.map((item) => (
          <section key={item.headline} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              {CATEGORY_LABEL[item.category]}
            </p>
            <h3 className="mt-2 font-serif text-2xl tracking-tight">{item.headline}</h3>
            {item.assets.length > 0 && (
              <p className="mt-2 font-mono text-xs tracking-wide text-muted-foreground">
                {item.assets.join(" · ")}
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{item.body}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {item.source}
                </a>
              ) : (
                item.source
              )}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
