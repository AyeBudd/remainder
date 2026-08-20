/**
 * Native Google / X OAuth for the hosted Vercel app.
 * Preview still uses the Grok broker (see server.ts genericOAuth).
 * Secrets stay server-only — set these in Vercel, never VITE_*.
 */
function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

type Social = { clientId: string; clientSecret: string; prompt?: "select_account" };

export function nativeSocialProviders(): { google?: Social; twitter?: Social } | undefined {
  const googleId = env("GOOGLE_CLIENT_ID");
  const googleSecret = env("GOOGLE_CLIENT_SECRET");
  const twitterId = env("TWITTER_CLIENT_ID") ?? env("X_CLIENT_ID");
  const twitterSecret = env("TWITTER_CLIENT_SECRET") ?? env("X_CLIENT_SECRET");
  const google =
    googleId && googleSecret
      ? { clientId: googleId, clientSecret: googleSecret, prompt: "select_account" as const }
      : undefined;
  const twitter =
    twitterId && twitterSecret ? { clientId: twitterId, clientSecret: twitterSecret } : undefined;
  if (!google && !twitter) return undefined;
  return { ...(google ? { google } : {}), ...(twitter ? { twitter } : {}) };
}
