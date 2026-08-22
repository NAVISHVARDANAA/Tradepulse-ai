# TradePulse AI

TradePulse AI is an early-stage global trade and market-intelligence dashboard.
The current MVP uses React, TypeScript, Vite, Recharts, and Supabase.

## Current status

- Market cards read the latest observation for each configured asset from Supabase.
- Market cards refresh when `market_observations` changes through Supabase Realtime.
- KPI, trend, insight, and country sections are illustrative prototype data and are
  not trading advice or live market data.

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and add the Supabase project URL and anon key.

3. Apply the SQL files in `supabase/migrations` to the Supabase project in filename
   order.

4. Start the development server:

   ```bash
   npm run dev
   ```

## Quality checks

```bash
npm run typecheck
npm run build
```

GitHub Actions runs both checks for pull requests and pushes to `main`.

## Repository notes

- Keep service-role keys and provider secrets out of all `VITE_*` variables because
  Vite exposes them to the browser.
- Production build output is generated in `dist/` and is intentionally not committed.
