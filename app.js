const UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AVGO", "AMD", "NFLX",
  "CRM", "ORCL", "ADBE", "COST", "JPM", "BAC", "XOM", "CVX", "UNH", "LLY",
  "NKE", "DIS", "PYPL", "SHOP", "SQ", "UBER", "ABNB", "PLTR", "SNOW", "COIN",
  "SPY", "QQQ", "IWM", "DIA", "SMH", "XLF", "XLK", "XLE", "ARKK", "TLT"
];

const BASE_PRICES = {
  AAPL: 198, MSFT: 431, NVDA: 129, AMZN: 184, META: 477, GOOGL: 176, TSLA: 184, AVGO: 1410,
  AMD: 162, NFLX: 642, CRM: 288, ORCL: 124, ADBE: 493, COST: 804, JPM: 201, BAC: 38,
  XOM: 116, CVX: 161, UNH: 498, LLY: 781, NKE: 92, DIS: 104, PYPL: 64, SHOP: 72,
  SQ: 78, UBER: 67, ABNB: 148, PLTR: 23, SNOW: 152, COIN: 224, SPY: 526, QQQ: 454,
  IWM: 206, DIA: 392, SMH: 227, XLF: 42, XLK: 216, XLE: 94, ARKK: 46, TLT: 91
};

const DEFAULT_CURRENCY = "USD";

const STRATEGIES = {
  day: {
    label: "Day trading",
    timeframe: "1m to 15m",
    indicators: ["VWAP", "RSI", "MFI", "Volume"],
    long: "Price reclaims VWAP, RSI is above 50, MFI confirms money flow, and volume is expanding.",
    short: "Price rejects VWAP, RSI is below 50, MFI confirms selling pressure, and sellers arrive on volume.",
    window: "8 to 30 minutes",
    risk: "Use VWAP as the invalidation area and target at least 2:1 reward to risk."
  },
  swing: {
    label: "Swing trading",
    timeframe: "4H to Daily",
    indicators: ["EMA 20/50", "MACD", "Ichimoku", "Fibonacci"],
    long: "EMA trend turns up near a pullback level while MACD and Ichimoku cloud bias confirm.",
    short: "EMA trend rolls over near resistance while MACD and Ichimoku cloud bias confirm.",
    window: "2 to 7 trading days",
    risk: "Stop beyond the prior swing point; avoid oversized positions before earnings."
  },
  scalp: {
    label: "Scalping",
    timeframe: "1m to 5m",
    indicators: ["Bollinger Bands", "Keltner Channels", "Stochastic", "Williams %R"],
    long: "Price stretches into the lower band/Keltner zone while Stochastic and Williams %R turn up from oversold.",
    short: "Price rejects the upper band/Keltner zone while Stochastic and Williams %R turn down from overbought.",
    window: "1 to 6 minutes",
    risk: "Keep stops tight, usually 0.5x to 1x ATR, and take partials quickly."
  },
  trend: {
    label: "Trend following",
    timeframe: "Daily to Weekly",
    indicators: ["EMA 200", "ADX", "Supertrend", "ATR"],
    long: "Price is above the 200 EMA, Supertrend is positive, and ADX confirms trend strength.",
    short: "Price is below the 200 EMA, Supertrend is negative, and ADX confirms trend strength.",
    window: "5 to 20 trading days",
    risk: "Trail with roughly 2x ATR and reduce exposure when ADX fades."
  },
  reversal: {
    label: "Reversal trading",
    timeframe: "1H to 4H",
    indicators: ["RSI", "MFI", "Williams %R", "S&R"],
    long: "RSI/MFI divergence appears near support and Williams %R turns up from an extreme.",
    short: "RSI/MFI divergence appears near resistance and Williams %R turns down from an extreme.",
    window: "2 hours to 2 trading days",
    risk: "Stop beyond the key level; target the next high-volume node."
  },
  breakout: {
    label: "Breakout trading",
    timeframe: "15m to 1H",
    indicators: ["Bollinger Bands", "Donchian Channels", "Volume", "Pivot Points"],
    long: "A volatility squeeze breaks above the Donchian high/resistance with volume above average.",
    short: "A volatility squeeze breaks below the Donchian low/support with volume above average.",
    window: "20 minutes to 1 trading day",
    risk: "Stop back inside the prior range and use pivot extensions for targets."
  }
};

const state = {
  running: true,
  notify: false,
  scanRate: 4000,
  scanTimer: null,
  quoteRefreshTimer: null,
  dataMode: "Demo fallback",
  quoteAsOf: "",
  refreshingQuotes: false,
  tick: 0,
  alerts: [],
  symbols: seedMarket(),
  selectedSignal: null
};

const els = {
  scanStatus: document.querySelector("#scanStatus"),
  universeCount: document.querySelector("#universeCount"),
  signalCount: document.querySelector("#signalCount"),
  longCount: document.querySelector("#longCount"),
  shortCount: document.querySelector("#shortCount"),
  lastScan: document.querySelector("#lastScan"),
  dataMode: document.querySelector("#dataMode"),
  strategy: document.querySelector("#strategy"),
  direction: document.querySelector("#direction"),
  minScore: document.querySelector("#minScore"),
  scanRate: document.querySelector("#scanRate"),
  scoreLabel: document.querySelector("#scoreLabel"),
  symbolSearch: document.querySelector("#symbolSearch"),
  toggleScan: document.querySelector("#toggleScan"),
  notifyButton: document.querySelector("#notifyButton"),
  alertMode: document.querySelector("#alertMode"),
  alertFeed: document.querySelector("#alertFeed"),
  signalGrid: document.querySelector("#signalGrid"),
  detailDialog: document.querySelector("#detailDialog"),
  detailSymbol: document.querySelector("#detailSymbol"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBody: document.querySelector("#detailBody"),
  closeDialog: document.querySelector("#closeDialog")
};

function seedMarket() {
  return UNIVERSE.map((symbol, index) => {
    const candles = makeCandles(BASE_PRICES[symbol], index);
    return { symbol, candles, currency: DEFAULT_CURRENCY, quote: null, lastSignalKey: "" };
  });
}

function makeCandles(base, seed) {
  const candles = [];
  let price = base;
  let volumeBase = 700000 + seed * 42000;
  const drift = ((seed % 7) - 3) * 0.0012;

  for (let i = 0; i < 130; i += 1) {
    const wave = Math.sin((i + seed) / 8) * 0.012;
    const shock = seededNoise(seed * 131 + i) * 0.018;
    const move = drift + wave + shock;
    const open = price;
    const close = Math.max(2, open * (1 + move));
    const high = Math.max(open, close) * (1 + Math.abs(seededNoise(seed + i * 3)) * 0.01);
    const low = Math.min(open, close) * (1 - Math.abs(seededNoise(seed + i * 5)) * 0.01);
    const volume = Math.round(volumeBase * (1 + Math.abs(wave) * 22 + Math.abs(shock) * 16));
    candles.push({ open, high, low, close, volume });
    price = close;
  }

  return candles;
}

function seededNoise(value) {
  const x = Math.sin(value * 999) * 10000;
  return x - Math.floor(x) - 0.5;
}

function advanceMarket() {
  state.tick += 1;
  state.symbols = state.symbols.map((item, index) => {
    if (item.quote) return item;

    const last = item.candles[item.candles.length - 1];
    const pulse = Math.sin((state.tick + index) / 5) * 0.004;
    const random = (Math.random() - 0.5) * 0.018;
    const eventBoost = (state.tick + index) % 31 === 0 ? (index % 2 === 0 ? 0.035 : -0.035) : 0;
    const open = last.close;
    const close = Math.max(2, open * (1 + pulse + random + eventBoost));
    const high = Math.max(open, close) * (1 + Math.random() * 0.009);
    const low = Math.min(open, close) * (1 - Math.random() * 0.009);
    const volume = Math.round(last.volume * (0.82 + Math.random() * 0.52 + Math.abs(eventBoost) * 12));
    const candles = item.candles.slice(-129).concat({ open, high, low, close, volume });
    return { ...item, candles };
  });
}

async function refreshLiveQuotes() {
  if (state.refreshingQuotes) return;

  state.refreshingQuotes = true;
  state.dataMode = "Refreshing USD quotes";
  renderCurrentScan();

  try {
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(UNIVERSE.join(","))}`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Quote request failed");

    const payload = await response.json();
    const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    const quoteMap = new Map(quotes.filter((quote) => Number.isFinite(quote.close)).map((quote) => [quote.symbol, quote]));

    state.symbols = state.symbols.map((item) => {
      const quote = quoteMap.get(item.symbol);
      if (!quote) return item;

      const candles = item.candles.slice();
      const previous = candles[candles.length - 2] || candles[candles.length - 1];
      candles[candles.length - 1] = {
        open: quote.open || previous.close,
        high: quote.high || quote.close,
        low: quote.low || quote.close,
        close: quote.close,
        volume: quote.volume || previous.volume
      };

      return {
        ...item,
        candles,
        currency: quote.currency || DEFAULT_CURRENCY,
        quote
      };
    });

    state.quoteAsOf = payload.asOf || new Date().toISOString();
    state.dataMode = quotes.length ? "USD delayed quotes" : "Demo fallback";
  } catch (error) {
    state.dataMode = "Demo fallback";
  } finally {
    state.refreshingQuotes = false;
    scan();
  }
}

function ema(values, period) {
  const k = 2 / (period + 1);
  let current = values[0];
  return values.map((value) => {
    current = value * k + current * (1 - k);
    return current;
  });
}

function sma(values, period) {
  if (values.length < period) return values[values.length - 1] || 0;
  return values.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}

function rsi(closes, period = 14) {
  let gains = 0;
  let losses = 0;
  const slice = closes.slice(-(period + 1));
  for (let i = 1; i < slice.length; i += 1) {
    const change = slice[i] - slice[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function macd(closes) {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const line = fast.map((value, index) => value - slow[index]);
  const signal = ema(line, 9);
  const last = line.length - 1;
  return {
    line: line[last],
    signal: signal[last],
    histogram: line[last] - signal[last],
    previousHistogram: line[last - 1] - signal[last - 1]
  };
}

function atr(candles, period = 14) {
  const slice = candles.slice(-period);
  const ranges = slice.map((candle, index) => {
    const previous = candles[candles.length - period + index - 1] || candle;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous.close),
      Math.abs(candle.low - previous.close)
    );
  });
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

function stochastic(candles, period = 14) {
  const slice = candles.slice(-period);
  const high = Math.max(...slice.map((candle) => candle.high));
  const low = Math.min(...slice.map((candle) => candle.low));
  const close = candles[candles.length - 1].close;
  return ((close - low) / Math.max(0.01, high - low)) * 100;
}

function bollinger(candles, period = 20) {
  const closes = candles.map((candle) => candle.close);
  const basis = sma(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, value) => sum + (value - basis) ** 2, 0) / period;
  const dev = Math.sqrt(variance);
  return {
    upper: basis + dev * 2,
    basis,
    lower: basis - dev * 2,
    bandwidth: ((dev * 4) / basis) * 100
  };
}

function obv(candles) {
  let total = 0;
  for (let i = 1; i < candles.length; i += 1) {
    if (candles[i].close > candles[i - 1].close) total += candles[i].volume;
    if (candles[i].close < candles[i - 1].close) total -= candles[i].volume;
  }
  return total;
}

function vwap(candles) {
  const slice = candles.slice(-30);
  const pv = slice.reduce((sum, candle) => sum + ((candle.high + candle.low + candle.close) / 3) * candle.volume, 0);
  const volume = slice.reduce((sum, candle) => sum + candle.volume, 0);
  return pv / volume;
}

function estimateAdx(candles) {
  const closes = candles.map((candle) => candle.close);
  const recentChange = Math.abs(closes[closes.length - 1] - closes[closes.length - 15]);
  const averageRange = atr(candles, 14);
  return Math.min(55, Math.max(8, (recentChange / Math.max(0.01, averageRange)) * 8));
}

function moneyFlowIndex(candles, period = 14) {
  const slice = candles.slice(-(period + 1));
  let positive = 0;
  let negative = 0;

  for (let i = 1; i < slice.length; i += 1) {
    const previousTypical = (slice[i - 1].high + slice[i - 1].low + slice[i - 1].close) / 3;
    const typical = (slice[i].high + slice[i].low + slice[i].close) / 3;
    const flow = typical * slice[i].volume;
    if (typical >= previousTypical) positive += flow;
    else negative += flow;
  }

  if (negative === 0) return 100;
  const ratio = positive / negative;
  return 100 - 100 / (1 + ratio);
}

function williamsR(candles, period = 14) {
  const slice = candles.slice(-period);
  const high = Math.max(...slice.map((candle) => candle.high));
  const low = Math.min(...slice.map((candle) => candle.low));
  const close = candles[candles.length - 1].close;
  return ((high - close) / Math.max(0.01, high - low)) * -100;
}

function donchian(candles, period = 20) {
  const slice = candles.slice(-period);
  return {
    high: Math.max(...slice.map((candle) => candle.high)),
    low: Math.min(...slice.map((candle) => candle.low))
  };
}

function keltner(candles, period = 20, multiplier = 1.5) {
  const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
  const mid = ema(typical, period).at(-1);
  const range = atr(candles, period);
  return {
    upper: mid + range * multiplier,
    mid,
    lower: mid - range * multiplier
  };
}

function ichimoku(candles) {
  const highLowMid = (period) => {
    const slice = candles.slice(-period);
    const high = Math.max(...slice.map((candle) => candle.high));
    const low = Math.min(...slice.map((candle) => candle.low));
    return (high + low) / 2;
  };

  const conversion = highLowMid(9);
  const base = highLowMid(26);
  const spanA = (conversion + base) / 2;
  const spanB = highLowMid(52);
  const close = candles[candles.length - 1].close;

  return {
    conversion,
    base,
    spanA,
    spanB,
    bullish: close > Math.max(spanA, spanB) && conversion > base,
    bearish: close < Math.min(spanA, spanB) && conversion < base
  };
}

function supertrend(candles, period = 10, multiplier = 3) {
  const last = candles[candles.length - 1];
  const mid = (last.high + last.low) / 2;
  const range = atr(candles, period);
  const lower = mid - range * multiplier;
  const upper = mid + range * multiplier;

  return {
    lower,
    upper,
    bullish: last.close > lower && last.close > sma(candles.map((candle) => candle.close), 20),
    bearish: last.close < upper && last.close < sma(candles.map((candle) => candle.close), 20)
  };
}

function analyzeSymbol(item) {
  const { candles, symbol, currency } = item;
  const closes = candles.map((candle) => candle.close);
  const last = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const ema9 = ema(closes, 9).at(-1);
  const ema20 = ema(closes, 20).at(-1);
  const ema50 = ema(closes, 50).at(-1);
  const ema200 = ema(closes, 100).at(-1);
  const rsiValue = rsi(closes);
  const macdValue = macd(closes);
  const atrValue = atr(candles);
  const stochValue = stochastic(candles);
  const bands = bollinger(candles);
  const keltnerValue = keltner(candles);
  const donchianValue = donchian(candles);
  const ichimokuValue = ichimoku(candles);
  const supertrendValue = supertrend(candles);
  const vwapValue = vwap(candles);
  const adxValue = estimateAdx(candles);
  const mfiValue = moneyFlowIndex(candles);
  const williamsValue = williamsR(candles);
  const avgVolume = sma(candles.map((candle) => candle.volume), 20);
  const volumeRatio = last.volume / avgVolume;
  const obvNow = obv(candles.slice(-45));
  const obvPrev = obv(candles.slice(-70, -25));
  const change = ((last.close - previous.close) / previous.close) * 100;
  const pivot = (previous.high + previous.low + previous.close) / 3;
  const rangeHigh = Math.max(...candles.slice(-30).map((candle) => candle.high));
  const rangeLow = Math.min(...candles.slice(-30).map((candle) => candle.low));

  const metrics = {
    price: last.close,
    currency: currency || DEFAULT_CURRENCY,
    change,
    ema9,
    ema20,
    ema50,
    ema200,
    rsi: rsiValue,
    macd: macdValue,
    atr: atrValue,
    stochastic: stochValue,
    williamsR: williamsValue,
    mfi: mfiValue,
    bands,
    keltner: keltnerValue,
    donchian: donchianValue,
    ichimoku: ichimokuValue,
    supertrend: supertrendValue,
    vwap: vwapValue,
    adx: adxValue,
    volumeRatio,
    obvTrend: obvNow - obvPrev,
    pivot,
    rangeHigh,
    rangeLow
  };

  const candidates = [
    scoreDay(symbol, metrics),
    scoreSwing(symbol, metrics),
    scoreScalp(symbol, metrics),
    scoreTrend(symbol, metrics),
    scoreReversal(symbol, metrics, closes),
    scoreBreakout(symbol, metrics)
  ];

  return candidates.sort((a, b) => b.score - a.score)[0];
}

function scoreDay(symbol, m) {
  const longScore = points([
    [m.price > m.vwap, 22],
    [m.rsi > 50, 16],
    [m.mfi > 50, 12],
    [m.volumeRatio > 1.25, 18],
    [m.change > 0.15, 10],
    [m.obvTrend > 0, 8]
  ]);
  const shortScore = points([
    [m.price < m.vwap, 22],
    [m.rsi < 50, 16],
    [m.mfi < 50, 12],
    [m.volumeRatio > 1.25, 18],
    [m.change < -0.15, 10],
    [m.obvTrend < 0, 8]
  ]);
  return buildSignal(symbol, "day", longScore, shortScore, m, [
    `VWAP ${fmt(m.vwap)}`,
    `RSI ${m.rsi.toFixed(0)}`,
    `MFI ${m.mfi.toFixed(0)}`,
    `Volume ${m.volumeRatio.toFixed(1)}x average`
  ]);
}

function scoreSwing(symbol, m) {
  const longScore = points([
    [m.ema20 > m.ema50, 22],
    [m.price > m.ema20, 14],
    [m.macd.histogram > 0 && m.macd.previousHistogram <= m.macd.histogram, 18],
    [m.ichimoku.bullish, 16],
    [m.rsi > 48 && m.rsi < 70, 12],
    [m.price > m.pivot, 8]
  ]);
  const shortScore = points([
    [m.ema20 < m.ema50, 22],
    [m.price < m.ema20, 14],
    [m.macd.histogram < 0 && m.macd.previousHistogram >= m.macd.histogram, 18],
    [m.ichimoku.bearish, 16],
    [m.rsi < 52 && m.rsi > 30, 12],
    [m.price < m.pivot, 8]
  ]);
  return buildSignal(symbol, "swing", longScore, shortScore, m, [
    `EMA 20/50 ${fmt(m.ema20)} / ${fmt(m.ema50)}`,
    `MACD histogram ${m.macd.histogram.toFixed(2)}`,
    `Ichimoku ${m.ichimoku.bullish ? "bullish cloud" : m.ichimoku.bearish ? "bearish cloud" : "inside cloud"}`,
    `Pivot ${fmt(m.pivot)}`
  ]);
}

function scoreScalp(symbol, m) {
  const longScore = points([
    [m.price <= m.bands.lower * 1.015, 20],
    [m.price <= m.keltner.lower * 1.015, 14],
    [m.stochastic < 35, 15],
    [m.williamsR < -75, 13],
    [m.volumeRatio > 1.2, 14],
    [m.change > -2.8, 6]
  ]);
  const shortScore = points([
    [m.price >= m.bands.upper * 0.985, 20],
    [m.price >= m.keltner.upper * 0.985, 14],
    [m.stochastic > 65, 15],
    [m.williamsR > -25, 13],
    [m.volumeRatio > 1.2, 14],
    [m.change < 2.8, 6]
  ]);
  return buildSignal(symbol, "scalp", longScore, shortScore, m, [
    `Bollinger range ${fmt(m.bands.lower)} to ${fmt(m.bands.upper)}`,
    `Keltner range ${fmt(m.keltner.lower)} to ${fmt(m.keltner.upper)}`,
    `Stochastic ${m.stochastic.toFixed(0)}`,
    `Williams %R ${m.williamsR.toFixed(0)}`,
    `ATR ${fmt(m.atr)}`
  ]);
}

function scoreTrend(symbol, m) {
  const longScore = points([
    [m.price > m.ema200, 24],
    [m.ema20 > m.ema50, 14],
    [m.adx > 25, 22],
    [m.supertrend.bullish, 18],
    [m.rsi > 52, 8],
    [m.price > m.vwap, 6]
  ]);
  const shortScore = points([
    [m.price < m.ema200, 24],
    [m.ema20 < m.ema50, 14],
    [m.adx > 25, 22],
    [m.supertrend.bearish, 18],
    [m.rsi < 48, 8],
    [m.price < m.vwap, 6]
  ]);
  return buildSignal(symbol, "trend", longScore, shortScore, m, [
    `EMA 200 proxy ${fmt(m.ema200)}`,
    `ADX ${m.adx.toFixed(0)}`,
    `Supertrend ${m.supertrend.bullish ? "bullish" : m.supertrend.bearish ? "bearish" : "neutral"}`,
    `ATR trail area ${fmt(m.atr * 2)}`
  ]);
}

function scoreReversal(symbol, m, closes) {
  const recentLow = Math.min(...closes.slice(-12));
  const priorLow = Math.min(...closes.slice(-30, -12));
  const recentHigh = Math.max(...closes.slice(-12));
  const priorHigh = Math.max(...closes.slice(-30, -12));
  const bullishDivergence = recentLow < priorLow && m.rsi > 38 && m.mfi > 35;
  const bearishDivergence = recentHigh > priorHigh && m.rsi < 62 && m.mfi < 65;
  const longScore = points([
    [bullishDivergence, 24],
    [m.price > m.rangeLow * 1.02, 16],
    [m.rsi < 52, 10],
    [m.mfi < 55, 10],
    [m.williamsR < -70, 10],
    [m.volumeRatio > 1.1, 10],
    [m.change > 0, 6]
  ]);
  const shortScore = points([
    [bearishDivergence, 24],
    [m.price < m.rangeHigh * 0.98, 16],
    [m.rsi > 48, 10],
    [m.mfi > 45, 10],
    [m.williamsR > -30, 10],
    [m.volumeRatio > 1.1, 10],
    [m.change < 0, 6]
  ]);
  return buildSignal(symbol, "reversal", longScore, shortScore, m, [
    `Support zone ${fmt(m.rangeLow)}`,
    `Resistance zone ${fmt(m.rangeHigh)}`,
    `RSI ${m.rsi.toFixed(0)}`,
    `MFI ${m.mfi.toFixed(0)}`,
    `Williams %R ${m.williamsR.toFixed(0)}`
  ]);
}

function scoreBreakout(symbol, m) {
  const squeeze = m.bands.bandwidth < 7.5;
  const longScore = points([
    [squeeze, 16],
    [m.price > m.rangeHigh * 0.995, 18],
    [m.price >= m.donchian.high * 0.995, 18],
    [m.volumeRatio > 1.4, 18],
    [m.price > m.pivot, 10],
    [m.rsi > 54, 8]
  ]);
  const shortScore = points([
    [squeeze, 16],
    [m.price < m.rangeLow * 1.005, 18],
    [m.price <= m.donchian.low * 1.005, 18],
    [m.volumeRatio > 1.4, 18],
    [m.price < m.pivot, 10],
    [m.rsi < 46, 8]
  ]);
  return buildSignal(symbol, "breakout", longScore, shortScore, m, [
    `BB bandwidth ${m.bands.bandwidth.toFixed(1)}%`,
    `Donchian ${fmt(m.donchian.low)} to ${fmt(m.donchian.high)}`,
    `Range ${fmt(m.rangeLow)} to ${fmt(m.rangeHigh)}`,
    `Volume ${m.volumeRatio.toFixed(1)}x average`
  ]);
}

function points(rows) {
  return rows.reduce((sum, [condition, value]) => sum + (condition ? value : 0), 0);
}

function buildSignal(symbol, strategyId, longScore, shortScore, metrics, evidence) {
  const strategy = STRATEGIES[strategyId];
  const direction = Math.max(longScore, shortScore) < 45 ? "hold" : longScore >= shortScore ? "long" : "short";
  const baseScore = direction === "long" ? longScore : direction === "short" ? shortScore : Math.max(longScore, shortScore);
  const score = Math.min(96, Math.round(50 + baseScore * 0.58));
  const bias = direction === "long" ? "Long setup" : direction === "short" ? "Short setup" : "Watch only";
  const thesis = direction === "long" ? strategy.long : direction === "short" ? strategy.short : "Signals are mixed, so the better action is to watch for confirmation.";
  const stopLoss = direction === "long"
    ? metrics.price - metrics.atr * 1.5
    : direction === "short"
      ? metrics.price + metrics.atr * 1.5
      : metrics.price;
  const takeProfit = direction === "long"
    ? metrics.price + metrics.atr * 3
    : direction === "short"
      ? metrics.price - metrics.atr * 3
      : metrics.price;

  return {
    key: `${symbol}-${strategyId}-${direction}`,
    symbol,
    strategyId,
    strategy: strategy.label,
    timeframe: strategy.timeframe,
    indicators: strategy.indicators,
    direction,
    bias,
    score,
    price: metrics.price,
    currency: metrics.currency || DEFAULT_CURRENCY,
    change: metrics.change,
    window: direction === "hold" ? "Wait for a fresh trigger" : estimateWindow(strategyId, metrics, score),
    thesis,
    evidence,
    stopLoss,
    takeProfit,
    riskReward: direction === "hold" ? "No trade" : "2:1 target model",
    risk: strategy.risk,
    updatedAt: new Date()
  };
}

function estimateWindow(strategyId, metrics, score) {
  const volatilityPct = (metrics.atr / Math.max(0.01, metrics.price)) * 100;
  const highVolatility = volatilityPct > 2.4 || metrics.volumeRatio > 1.8;
  const strongTrend = metrics.adx > 30 || score > 88;

  const windows = {
    day: highVolatility ? "5 to 18 minutes" : "12 to 35 minutes",
    scalp: highVolatility ? "1 to 4 minutes" : "2 to 8 minutes",
    swing: strongTrend ? "3 to 10 trading days" : "1 to 5 trading days",
    trend: strongTrend ? "10 to 30 trading days" : "5 to 15 trading days",
    reversal: highVolatility ? "1 to 6 hours" : "4 hours to 2 trading days",
    breakout: highVolatility ? "20 minutes to 4 hours" : "1 hour to 1 trading day"
  };

  return windows[strategyId] || STRATEGIES[strategyId].window;
}

function scan() {
  if (state.running) advanceMarket();
  renderCurrentScan();
}

function renderCurrentScan() {
  let signals = state.symbols.map((item) => {
    const signal = analyzeSymbol(item);
    maybeAlert(item, signal);
    item.lastSignalKey = signal.key;
    return signal;
  });

  const strategy = els.strategy.value;
  const direction = els.direction.value;
  const minScore = Number(els.minScore.value);
  const search = els.symbolSearch.value.trim().toUpperCase();

  signals = signals
    .filter((signal) => strategy === "all" || signal.strategyId === strategy)
    .filter((signal) => direction === "all" || signal.direction === direction)
    .filter((signal) => signal.score >= minScore)
    .filter((signal) => !search || signal.symbol.includes(search))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  render(signals);
}

function maybeAlert(item, signal) {
  const isActionable = signal.score >= 78 && signal.direction !== "hold";
  const isNew = item.lastSignalKey !== signal.key;
  if (!isActionable || !isNew) return;

  const alert = {
    ...signal,
    id: `${signal.key}-${Date.now()}`
  };
  state.alerts.unshift(alert);
  state.alerts = state.alerts.slice(0, 12);

  if (state.notify && "Notification" in window && Notification.permission === "granted") {
    new Notification(`${signal.symbol}: ${signal.bias}`, {
      body: `${signal.strategy}. ${signal.thesis} Window: ${signal.window}.`
    });
  }
}

function render(signals) {
  const longs = signals.filter((signal) => signal.direction === "long").length;
  const shorts = signals.filter((signal) => signal.direction === "short").length;

  els.scanStatus.textContent = state.running ? `Scanning market every ${state.scanRate / 1000} seconds` : "Scanner paused";
  els.universeCount.textContent = String(UNIVERSE.length);
  els.signalCount.textContent = String(signals.length);
  els.longCount.textContent = String(longs);
  els.shortCount.textContent = String(shorts);
  els.lastScan.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  els.dataMode.textContent = state.quoteAsOf
    ? `${state.dataMode} ${new Date(state.quoteAsOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : state.dataMode;
  els.scoreLabel.textContent = `${els.minScore.value}%`;
  els.alertMode.textContent = state.notify ? "Browser alerts on" : "Browser alerts off";

  els.signalGrid.innerHTML = signals.length
    ? signals.map(signalCard).join("")
    : `<div class="alert"><h3>No setups match this filter</h3><p>Lower the confidence threshold or switch to all trading styles to widen the scan.</p></div>`;

  els.alertFeed.innerHTML = state.alerts.length
    ? state.alerts.map(alertItem).join("")
    : `<div class="alert"><h3>No fresh alerts yet</h3><p>The scanner will add strong long or short setups here when confluence appears.</p></div>`;

  document.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      const signal = signals.find((item) => item.key === button.dataset.detail) || state.alerts.find((item) => item.key === button.dataset.detail);
      if (signal) showDetails(signal);
    });
  });
}

function signalCard(signal) {
  return `
    <article class="signal-card ${signal.direction}">
      <div class="card-top">
        <div>
          <div class="ticker">${signal.symbol}</div>
          <div class="price">${fmt(signal.price, signal.currency)} ${signal.change >= 0 ? "+" : ""}${signal.change.toFixed(2)}%</div>
        </div>
        <span class="badge ${signal.direction}">${signal.direction}</span>
      </div>
      <div class="score-row">
        <div class="score-track"><div class="score-bar" style="width:${signal.score}%"></div></div>
        <strong>${signal.score}%</strong>
      </div>
      <p class="reason">${signal.thesis}</p>
      <div class="meta-grid">
        <div><span>Style</span><strong>${signal.strategy}</strong></div>
        <div><span>Window</span><strong>${signal.window}</strong></div>
        <div><span>Stop-loss</span><strong>${fmt(signal.stopLoss, signal.currency)}</strong></div>
        <div><span>Take-profit</span><strong>${fmt(signal.takeProfit, signal.currency)}</strong></div>
      </div>
      <button class="detail-button" type="button" data-detail="${signal.key}">Why this signal?</button>
    </article>
  `;
}

function alertItem(signal) {
  return `
    <article class="alert ${signal.direction}">
      <small>${signal.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} - ${signal.strategy}</small>
      <h3>${signal.symbol}: ${signal.bias} at ${fmt(signal.price, signal.currency)}</h3>
      <p>${signal.thesis} Estimated window: ${signal.window}.</p>
    </article>
  `;
}

function showDetails(signal) {
  els.detailSymbol.textContent = `${signal.symbol} - ${signal.strategy} - ${signal.timeframe}`;
  els.detailTitle.textContent = `${signal.bias} with ${signal.score}% confluence`;
  els.detailBody.innerHTML = `
    <p>${signal.thesis}</p>
    <ul class="indicator-list">
      ${signal.evidence.map((item) => `<li>${item}</li>`).join("")}
    </ul>
    <div class="meta-grid">
      <div><span>Current price</span><strong>${fmt(signal.price, signal.currency)}</strong></div>
      <div><span>Trade window</span><strong>${signal.window}</strong></div>
      <div><span>Suggested stop-loss</span><strong>${fmt(signal.stopLoss, signal.currency)}</strong></div>
      <div><span>Suggested take-profit</span><strong>${fmt(signal.takeProfit, signal.currency)}</strong></div>
    </div>
    <p class="risk-note">${signal.risk} Risk/reward: ${signal.riskReward}. Prices are shown in ${signal.currency}. Quotes are delayed unless your own real-time market-data provider is connected. This app provides technical signal research only. It does not know your financial situation, portfolio, taxes, or risk tolerance.</p>
  `;
  els.detailDialog.showModal();
}

function fmt(value, currency = DEFAULT_CURRENCY) {
  const amount = Number(value).toFixed(value > 1000 ? 0 : 2);
  return `${currency} $${amount}`;
}

els.strategy.addEventListener("change", scan);
els.direction.addEventListener("change", scan);
els.minScore.addEventListener("input", scan);
els.scanRate.addEventListener("change", () => {
  state.scanRate = Number(els.scanRate.value);
  startScanner();
  scan();
});
els.symbolSearch.addEventListener("input", scan);
els.toggleScan.addEventListener("click", () => {
  state.running = !state.running;
  els.toggleScan.textContent = state.running ? "Pause scan" : "Resume scan";
  scan();
});
els.notifyButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    els.alertMode.textContent = "Alerts unavailable";
    return;
  }
  const permission = await Notification.requestPermission();
  state.notify = permission === "granted";
  els.notifyButton.textContent = state.notify ? "Alerts enabled" : "Enable alerts";
  scan();
});
els.closeDialog.addEventListener("click", () => els.detailDialog.close());

scan();
startScanner();
refreshLiveQuotes();
state.quoteRefreshTimer = setInterval(refreshLiveQuotes, 60000);

function startScanner() {
  if (state.scanTimer) clearInterval(state.scanTimer);
  state.scanTimer = setInterval(scan, state.scanRate);
  els.scanStatus.textContent = state.running ? `Scanning market every ${state.scanRate / 1000} seconds` : "Scanner paused";
}
