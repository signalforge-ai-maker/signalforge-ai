# SignalForge AI Roadmap

## Goal

Build a production-minded AI crypto market radar while practicing modern full-stack engineering:

- Chrome extension product surface
- React + TypeScript frontend architecture
- Realtime market data pipelines
- Backend API and scheduled signal computation
- AI explanation and structured output
- Alerts, storage, auth, deployment, testing, and publishing

## Recommended Stack

### Extension

- Plasmo
- React 19
- TypeScript
- Tailwind CSS
- Zustand or TanStack Store
- Chrome Manifest V3 APIs

### Web Dashboard

- Next.js App Router
- React Server Components where useful
- Tailwind CSS
- shadcn/ui-style component primitives
- TanStack Query
- Lightweight charting with TradingView Lightweight Charts

### Backend

- Hono
- Cloudflare Workers
- Cloudflare D1 or Postgres later
- Drizzle ORM
- Cloudflare KV / Durable Objects for fast state
- Scheduled jobs for radar scans

### AI Layer

- OpenAI Responses API
- Structured JSON outputs for signal summaries
- Server-side API key only
- Tool/function calling for market context
- Guardrails to avoid financial-advice language

### Data Sources

- Binance public market data for MVP
- Coinbase/Kraken as second-source validation
- WebSocket feeds for realtime prices
- REST snapshots for fallback and backfill

## Build Phases

### Phase 1: Product Skeleton

- Convert current vanilla extension into a typed React extension
- Add proper folder structure
- Add linting, formatting, and build scripts
- Keep current Binance market scan working

### Phase 2: Radar Engine

- Move scoring rules into shared TypeScript modules
- Add paper trading bot plans before any live exchange integration
- Add signal categories:
  - momentum
  - volume anomaly
  - volatility risk
  - reversal watch
- Add unit tests for scoring logic

### Phase 3: Alerts

- Add Chrome notifications
- Add user-configurable thresholds
- Persist settings with Chrome storage
- Add background service worker and alarms

### Phase 4: Backend API

- Create Hono API service
- Proxy market data through backend
- Add `/signals` endpoint
- Add caching and rate-limit protection

### Phase 5: AI Analysis

- Add AI-generated signal explanation
- Return strict JSON from the AI layer
- Add disclaimer and risk controls
- Never expose API keys in the extension

### Phase 6: Dashboard

- Build a Next.js web dashboard
- Add watchlists, charts, signal history, and journal
- Use the same backend and shared signal engine

### Phase 7: Production

- Add authentication
- Add billing-ready account model
- Add privacy policy
- Prepare Chrome Web Store listing
- Add monitoring and error reporting

## Learning Rule

For each feature:

1. Explain the concept.
2. Implement the smallest useful version.
3. Test it.
4. Refactor into clean product code.
5. Record what changed and why.

## Product Rule

SignalForge AI is a research and risk-monitoring tool. It should not promise profit, guaranteed signals, or direct financial advice.
