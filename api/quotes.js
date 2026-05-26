const DEFAULT_CURRENCY = "USD";
const MAX_SYMBOLS = 60;

function cleanSymbol(symbol) {
  return String(symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .slice(0, 12);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseCsvLine(line) {
  const [stooqSymbol, date, time, open, high, low, close, volume] = line.trim().split(",");
  const symbol = stooqSymbol.replace(/\.US$/i, "").toUpperCase();
  const closeValue = toNumber(close);

  if (!symbol || !closeValue) return null;

  return {
    symbol,
    currency: DEFAULT_CURRENCY,
    source: "Stooq delayed quote",
    asOf: date && time ? `${date}T${time}Z` : new Date().toISOString(),
    open: toNumber(open),
    high: toNumber(high),
    low: toNumber(low),
    close: closeValue,
    volume: toNumber(volume)
  };
}

async function fetchQuote(symbol) {
  const stooqSymbol = `${symbol.toLowerCase()}.us`;
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MarketRadar/1.0"
    }
  });

  if (!response.ok) return null;

  const text = await response.text();
  const line = text.trim().split(/\r?\n/)[1];
  return line ? parseCsvLine(line) : null;
}

module.exports = async function handler(request, response) {
  const rawSymbols = String(request.query.symbols || "");
  const symbols = [...new Set(rawSymbols.split(",").map(cleanSymbol).filter(Boolean))].slice(0, MAX_SYMBOLS);

  if (!symbols.length) {
    response.status(400).json({ error: "Missing symbols query parameter." });
    return;
  }

  const settled = await Promise.allSettled(symbols.map(fetchQuote));
  const quotes = settled
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);

  response.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
  response.status(200).json({
    currency: DEFAULT_CURRENCY,
    source: "Stooq delayed quotes",
    asOf: new Date().toISOString(),
    quotes
  });
};
