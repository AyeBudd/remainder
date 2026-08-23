import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Props = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalDoc({ title, updated, children }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />
      <main className="mt-8 max-w-2xl">
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Ledger
          </Link>
          <span className="mx-2">/</span>
          {title}
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {updated}. Remaindr, remaindr.xyz.</p>
        <div className="legal-copy mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:tracking-tight [&_h2]:text-foreground [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
