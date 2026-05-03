# SignalForge AI

AI-powered market radar for crypto signals, risk alerts, and trading research.

## Current MVP

- Plasmo Chrome Manifest V3 extension
- React + TypeScript popup
- Popup market radar UI
- Public Binance 24h ticker data
- Watchlist presets
- Momentum, volume, and activity signal scoring
- Demo fallback when live market data is unavailable

## Development

Use Node 22 for this project:

```bash
nvm use
npm install
npm run dev
```

Then load this folder in Chrome:

```text
/Users/macbookpro/Documents/Codex/2026-05-02/ai-chrome/build/chrome-mv3-dev
```

## Production Build

```bash
npm run build
```

Then load this folder in Chrome:

```text
/Users/macbookpro/Documents/Codex/2026-05-02/ai-chrome/build/chrome-mv3-prod
```

## Legacy Load

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select one of the generated Plasmo build folders above.

The project root contains source code. Chrome should load the generated `build/chrome-mv3-*` folder.

## Notes

This is a research tool only. Signals are not financial advice.
