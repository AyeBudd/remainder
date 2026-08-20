import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAccount, saveAccountPrefs, updateAccountEmail, type AccountPrefs } from "@/lib/account";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const [prefs, setPrefs] = useState<AccountPrefs | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.displayName ?? "");
      setEmail(user.primaryEmail ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void getAccount()
      .then(setPrefs)
      .catch(() => setPrefs({ hasPassword: false, newsletter: false, dcaAlerts: false, mailerReady: false }));
  }, [user]);

  if (isPending) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-6">
        <SiteHeader />
        <div className="mt-10 h-40 animate-pulse rounded-xl bg-card" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const flash = (ok: string | null, err: string | null) => {
    setNote(ok);
    setError(err);
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("name");
    flash(null, null);
    try {
      const result = await authClient.updateUser({ name: name.trim() || "Trader" });
      if (result.error) throw new Error(result.error.message);
      flash("Display name saved.", null);
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Could not save name");
    } finally {
      setBusy(null);
    }
  };

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("email");
    flash(null, null);
    try {
      await updateAccountEmail({ data: email.trim() });
      flash("Email saved. Use this address for alerts.", null);
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Could not save email");
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      flash(null, "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      flash(null, "New passwords do not match.");
      return;
    }
    setBusy("password");
    flash(null, null);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      flash("Password updated.", null);
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(null);
    }
  };

  const togglePref = async (patch: Partial<Pick<AccountPrefs, "newsletter" | "dcaAlerts">>) => {
    if (!prefs) return;
    const next = {
      newsletter: patch.newsletter ?? prefs.newsletter,
      dcaAlerts: patch.dcaAlerts ?? prefs.dcaAlerts,
    };
    setBusy("prefs");
    flash(null, null);
    try {
      const saved = await saveAccountPrefs({ data: next });
      setPrefs(saved);
      flash(
        saved.mailerReady
          ? "Preferences saved."
          : "Saved. Emails go out once a mailer key is added on the host.",
        null,
      );
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "Could not save preferences");
    } finally {
      setBusy(null);
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
          Account
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight">Account settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Name, email, password, and what we may send you.</p>

        {(note || error) && (
          <p className={`mt-4 text-sm ${error ? "text-destructive" : "text-success"}`}>{error ?? note}</p>
        )}

        <section className="mt-8 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 className="font-serif text-2xl tracking-tight">Profile</h2>
          <form className="mt-5 space-y-3" onSubmit={(e) => void saveName(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy === "name"}>
              {busy === "name" ? "Saving…" : "Save name"}
            </Button>
          </form>
          <form className="mt-6 space-y-3" onSubmit={(e) => void saveEmail(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy === "email"}>
              {busy === "email" ? "Saving…" : "Save email"}
            </Button>
          </form>
        </section>

        <section className="mt-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 className="font-serif text-2xl tracking-tight">Password</h2>
          {prefs && !prefs.hasPassword ? (
            <p className="mt-3 text-sm text-muted-foreground">
              You signed in with Google or X, so there is no password on this account.
            </p>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={(e) => void savePassword(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy === "password"}>
                {busy === "password" ? "Saving…" : "Update password"}
              </Button>
            </form>
          )}
        </section>

        <section className="mt-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 className="font-serif text-2xl tracking-tight">Email me</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Alerts use the email on this account. A 25% ETA change from when a DCA plan was originally set
            triggers the off-target warning.
          </p>
          <div className="mt-5 space-y-3">
            <PrefRow
              title="Newsletter"
              hint="Occasional product notes. No spam cadence yet — this stores the opt-in."
              on={Boolean(prefs?.newsletter)}
              disabled={!prefs || busy === "prefs"}
              onToggle={() => void togglePref({ newsletter: !prefs?.newsletter })}
            />
            <PrefRow
              title="DCA off-target warnings"
              hint="Email if a saved plan's ETA moves more than 25% from the original."
              on={Boolean(prefs?.dcaAlerts)}
              disabled={!prefs || busy === "prefs"}
              onToggle={() => void togglePref({ dcaAlerts: !prefs?.dcaAlerts })}
            />
          </div>
          {prefs && !prefs.mailerReady && (
            <p className="mt-4 text-xs text-muted-foreground">
              Prefs save now. Outbound mail starts after RESEND_API_KEY (and EMAIL_FROM) are set on the host.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function PrefRow({
  title,
  hint,
  on,
  disabled,
  onToggle,
}: {
  title: string;
  hint: string;
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-secondary/70 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
          on ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-primary-foreground transition-transform ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
