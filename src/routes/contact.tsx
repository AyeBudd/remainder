import { useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PUBLIC_CONTACT_EMAIL, sendContact } from "@/lib/contact";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const result = await sendContact({ data: { name, email, message, company: trap } });
      if (result.sent) {
        setNote("Got it. We’ll read it.");
        setMessage("");
        return;
      }
      if (result.error === "mailto") {
        window.location.href = `mailto:${PUBLIC_CONTACT_EMAIL}?subject=${encodeURIComponent("Remaindr")}&body=${encodeURIComponent(message)}`;
        return;
      }
      setError(result.error || "Could not send. Email hello@remaindr.xyz instead.");
    } catch {
      setError("Could not send. Email hello@remaindr.xyz instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />
      <main className="mt-8 max-w-xl">
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Ledger
          </Link>
          <span className="mx-2">/</span>
          Contact
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight">Contact</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Product, privacy, or account questions. This is not a support desk for trades — Remaindr
          does not move funds.
        </p>
        <p className="mt-3 text-sm">
          <a
            href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
            className="font-mono underline-offset-4 hover:underline"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
        </p>

        <form className="mt-8 space-y-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6" onSubmit={(e) => void submit(e)}>
          <div className="hidden" aria-hidden="true">
            <Label htmlFor="company">Company</Label>
            <Input id="company" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-message">Message</Label>
            <textarea
              id="contact-message"
              required
              minLength={8}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex min-h-32 w-full rounded-md bg-secondary px-3 py-2 text-sm text-foreground shadow-[var(--shadow-border)] placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>
          {note && <p className="text-sm text-success">{note}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send"}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
