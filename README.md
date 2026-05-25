# Market Signal Radar

A self-contained prototype for a technical-stock scanner. It scans a broad demo universe, looks for confluence across the indicator combinations from the reference guide, and surfaces long, short, or watch-only setups with a reason, confidence score, stop-loss, take-profit, and estimated signal window.

## What is included

- Broad-market scanner UI with filters for trading style, direction, confidence, and symbol.
- Adjustable scan rate: 2, 4, 10, or 30 seconds.
- Indicator logic for EMA, MACD, RSI, VWAP, Bollinger Bands, Stochastic, ADX approximation, ATR, OBV, pivots, and support/resistance zones.
- Alert feed for fresh high-confidence signals.
- Optional browser notifications.
- Clear educational-use guardrails so outputs are not presented as personalized financial advice.

## How to open

Open `index.html` in a browser, or run a simple local web server from this folder and visit the shown localhost URL.

## Public deployment

This is a static app. It does not need a build step.

### Vercel

```bash
npx vercel --prod
```

### Netlify

```bash
npx netlify deploy --prod --dir .
```

## Live data path

This prototype currently uses simulated market candles so it can run without API keys. The UI labels this as demo quotes because those values are not live market prices. To make it truly live, connect a market-data provider in `app.js` where `seedMarket()` and `advanceMarket()` create and update candles.

Good provider options:

- Polygon.io for broad US equities snapshots and websocket trades.
- Alpaca Market Data for equities and paper-trading workflows.
- IEX Cloud or Tiingo for quote and historical candles.
- Twelve Data for multi-asset technical-indicator APIs.

For production, the app should use a backend service for API keys, rate-limit control, exchange licensing, watchlist scheduling, and notification delivery.
