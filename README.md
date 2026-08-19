# Remainder

Set crypto target holdings, see the capital left to hit them, and plan a DCA path.

Holdings can be typed in (CEX or private) or imported read-only from an Ethereum wallet. Remainder never asks you to sign a transaction.

## Features

- Target stacks with live USD remaining and fill progress
- Manual current holdings, or wallet import (injected MetaMask / Rabby)
- Per-asset DCA plans: date, cadence, optional assumed price, projection chart
- Sign in with Google or X to save a stack to your account
- Guest mode stores the ledger in the browser

## Stack

React 19, TypeScript, Vite, TanStack Start / Router, Tailwind v4, Postgres (Neon in production, PGLite in local preview), Better Auth.

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

## License

Private project unless you choose otherwise.
