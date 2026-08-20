# Remainder

**Live site:** [ayebudd.github.io/remainder](https://ayebudd.github.io/remainder/)

Set crypto target holdings, see the capital left to hit them, and plan a DCA path.

Holdings can be typed in (CEX or private) or imported read-only from an Ethereum wallet. Remainder never asks you to sign a transaction.

The public GitHub Pages site is the same ledger you see in preview — guest mode, live prices, wallet import, and DCA planning. Sign-in to save a stack across devices needs the full server app below.

## Features

- Target stacks with live USD remaining and fill progress
- Manual current holdings, or wallet import (injected MetaMask / Rabby)
- Per-asset DCA plans: date, cadence, optional assumed price, projection chart
- What if? calculator: set your own price on every asset and see held + target value at once
- Sign in with Google or X to save a stack to your account (self-hosted)
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

## License

Private project unless you choose otherwise.
