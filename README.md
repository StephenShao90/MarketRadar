# Market Signal Radar

A technical-stock scanner prototype. It refreshes delayed USD quotes through a Vercel API route, scans a broad demo universe, looks for confluence across the indicator combinations from the reference guide, and surfaces long, short, or watch-only setups with a reason, confidence score, stop-loss, take-profit, and estimated signal window.

## What is included

- Broad-market scanner UI with filters for trading style, direction, confidence, and symbol.
- Adjustable scan rate: 2, 4, 10, or 30 seconds.
- Delayed quote refresh with currency labels for price, stop-loss, and take-profit.
- Indicator logic for EMA, MACD, RSI, MFI, VWAP, Bollinger Bands, Keltner Channels, Stochastic, Williams %R, ADX approximation, Supertrend, ATR, OBV, Ichimoku Cloud, Donchian Channels, pivots, and support/resistance zones.
- More precise trade-window estimates that adjust for volatility, volume expansion, trend strength, and signal confidence.
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

This prototype uses delayed quote snapshots for displayed prices and simulated intraday candles for the technical history. To make the full scanner institution-grade and real-time, connect a licensed market-data provider in `api/quotes.js` and replace the simulated candle path in `app.js` with historical and streaming candles.

Good provider options:

- Polygon.io for broad US equities snapshots and websocket trades.
- Alpaca Market Data for equities and paper-trading workflows.
- IEX Cloud or Tiingo for quote and historical candles.
- Twelve Data for multi-asset technical-indicator APIs.

For production, the app should use a backend service for API keys, rate-limit control, exchange licensing, watchlist scheduling, and notification delivery.
