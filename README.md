# Remaindr

**Live site:** [remainder-gray.vercel.app](https://remainder-gray.vercel.app) · domain: remaindr.xyz

Set crypto target holdings, see the capital left to hit them, and plan a DCA path.

Holdings can be typed in (CEX or private) or imported read-only from an Ethereum wallet. Remaindr never asks you to sign a transaction.

The public GitHub Pages site is the same ledger you see in preview — guest mode, live prices, wallet import, and DCA planning. Sign-in to save a stack across devices needs the full server app below.

## Features

- Target stacks with live USD remaining and fill progress
- Manual current holdings, or wallet import (injected MetaMask / Rabby)
- Per-asset DCA plans: date, cadence, optional assumed price, projection chart
- What if? calculator: set your own price on every asset and see held + target value at once
- BTC tracker: live price, days since / days to halving, ATH, cycle low
- Sign in with email, Google, or X to save a stack to your account (hosted app)
- Guest mode stores the ledger in the browser

## Stack

React 19, TypeScript, Vite, TanStack Start / Router, Tailwind v4, Postgres (Neon in production, PGLite in local preview), Better Auth.

The GitHub Pages build is a static guest edition of the same UI (`docs/index.html`).

## Develop

```bash
npm install
npm run dev
```

The app listens on `0.0.0.0:8080`.

```bash
npm run typecheck
npm run build
```

No `.env` is required for local preview. Auth uses the baked preview client; the database falls back to embedded PGLite. On deploy, set `DATABASE_URL` (Neon) and the platform auth credentials.

## Hosted URL (accounts)

GitHub Pages is guest-only. Accounts need the full app on Vercel plus a Postgres database.

1. Create a free [Neon](https://neon.tech) project. Copy the connection string (`DATABASE_URL`).
2. Go to [vercel.com/new](https://vercel.com/new) and import [`AyeBudd/remainder`](https://github.com/AyeBudd/remainder).
3. Framework: Vite. Build command stays `npm run build`.
4. Add these environment variables (Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_URL` | Your Vercel URL, e.g. `https://remainder.vercel.app` (set after the first deploy if needed, then redeploy) |
| `BETTER_AUTH_SECRET` | A long random string (`openssl rand -hex 32`) |
| `VITE_AUTH_ENABLED` | `true` |
| `RESEND_API_KEY` | Resend API key so newsletter confirms and DCA warnings can send |
| `EMAIL_FROM` | e.g. `Remaindr <alerts@remaindr.xyz>` (must be a verified Resend domain) |
| `CRON_SECRET` | Random string; Vercel Cron sends it as `Authorization: Bearer …` |
| `XAI_API_KEY` | xAI key so Friday’s newsletter can be written from current headlines |

5. Deploy. Vercel gives you a URL like `https://remainder-xxxx.vercel.app`.
6. Put that URL in `BETTER_AUTH_URL` and redeploy once.
7. Send testers that URL. They create an account with email.

Each push to `main` rebuilds the hosted app. Testers keep their accounts.

The guest site at [ayebudd.github.io/remainder](https://ayebudd.github.io/remainder/) stays in `docs/` and is independent.

## License

Private project unless you choose otherwise.
