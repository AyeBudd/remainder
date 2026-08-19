import { Link, createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <Link to="/" className="font-serif text-2xl tracking-tight">
        Remainder
      </Link>
      <h1 className="mt-10 font-serif text-4xl tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Save targets to your account. Wallet reads stay in the browser.
      </p>
      <div className="mt-8 space-y-3">
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
            >
              Continue with {p.label}
            </Button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}
      </div>
      <Link to="/" className="mt-8 text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to the ledger
      </Link>
    </main>
  );
}
