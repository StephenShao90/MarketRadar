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

const STRATEGIES = {
  day: {
    label: "Day trading",
    timeframe: "1m to 15m",
    indicators: ["VWAP", "RSI", "Volume"],
    long: "Price reclaims VWAP, RSI is above 50, and volume is expanding.",
    short: "Price rejects VWAP, RSI is below 50, and sellers arrive on volume.",
    window: "10 to 45 minutes",
    risk: "Use VWAP as the invalidation area and target at least 2:1 reward to risk."
  },
  swing: {
    label: "Swing trading",
    timeframe: "4H to Daily",
    indicators: ["EMA 20/50", "MACD", "Fibonacci"],
    long: "EMA trend turns up near a pullback level while MACD crosses bullish.",
    short: "EMA trend rolls over near resistance while MACD crosses bearish.",
    window: "1 to 5 sessions",
    risk: "Stop beyond the prior swing point; avoid oversized positions before earnings."
  },
  scalp: {
    label: "Scalping",
    timeframe: "1m to 5m",
    indicators: ["Bollinger Bands", "Stochastic", "Volume"],
    long: "Price stretches into the lower band, Stochastic turns up from oversold, and volume surges.",
    short: "Price rejects the upper band, Stochastic turns down from overbought, and volume confirms.",
    window: "2 to 12 minutes",
    risk: "Keep stops tight, usually 0.5x to 1x ATR, and take partials quickly."
  },
  trend: {
    label: "Trend following",
    timeframe: "Daily to Weekly",
    indicators: ["EMA 200", "ADX", "ATR"],
    long: "Price is above the 200 EMA and ADX confirms trend strength.",
    short: "Price is below the 200 EMA and ADX confirms trend strength.",
    window: "Several days to weeks",
    risk: "Trail with roughly 2x ATR and reduce exposure when ADX fades."
  },
  reversal: {
    label: "Reversal trading",
    timeframe: "1H to 4H",
    indicators: ["RSI", "Volume Profile", "S&R"],
    long: "RSI divergence appears near support and price rejects a high-volume area.",
    short: "RSI divergence appears near resistance and price fails at a high-volume area.",
    window: "30 minutes to 2 sessions",
    risk: "Stop beyond the key level; target the next high-volume node."
  },
  breakout: {
    label: "Breakout trading",
    timeframe: "15m to 1H",
    indicators: ["Bollinger Bands", "Volume", "Pivot Points"],
    long: "A volatility squeeze breaks above resistance with volume above average.",
    short: "A volatility squeeze breaks below support with volume above average.",
    window: "15 minutes to 3 hours",
    risk: "Stop back inside the prior range and use pivot extensions for targets."
  }
};

const state = {
  running: true,
  notify: false,
  scanRate: 4000,
  scanTimer: null,
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
    return { symbol, candles, lastSignalKey: "" };
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

function analyzeSymbol(item) {
  const { candles, symbol } = item;
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
  const vwapValue = vwap(candles);
  const adxValue = estimateAdx(candles);
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
    change,
    ema9,
    ema20,
    ema50,
    ema200,
    rsi: rsiValue,
    macd: macdValue,
    atr: atrValue,
    stochastic: stochValue,
    bands,
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
    [m.price > m.vwap, 24],
    [m.rsi > 50, 18],
    [m.volumeRatio > 1.25, 18],
    [m.change > 0.15, 12],
    [m.obvTrend > 0, 10]
  ]);
  const shortScore = points([
    [m.price < m.vwap, 24],
    [m.rsi < 50, 18],
    [m.volumeRatio > 1.25, 18],
    [m.change < -0.15, 12],
    [m.obvTrend < 0, 10]
  ]);
  return buildSignal(symbol, "day", longScore, shortScore, m, [
    `VWAP ${fmt(m.vwap)}`,
    `RSI ${m.rsi.toFixed(0)}`,
    `Volume ${m.volumeRatio.toFixed(1)}x average`
  ]);
}

function scoreSwing(symbol, m) {
  const longScore = points([
    [m.ema20 > m.ema50, 25],
    [m.price > m.ema20, 14],
    [m.macd.histogram > 0 && m.macd.previousHistogram <= m.macd.histogram, 20],
    [m.rsi > 48 && m.rsi < 70, 12],
    [m.price > m.pivot, 10]
  ]);
  const shortScore = points([
    [m.ema20 < m.ema50, 25],
    [m.price < m.ema20, 14],
    [m.macd.histogram < 0 && m.macd.previousHistogram >= m.macd.histogram, 20],
    [m.rsi < 52 && m.rsi > 30, 12],
    [m.price < m.pivot, 10]
  ]);
  return buildSignal(symbol, "swing", longScore, shortScore, m, [
    `EMA 20/50 ${fmt(m.ema20)} / ${fmt(m.ema50)}`,
    `MACD histogram ${m.macd.histogram.toFixed(2)}`,
    `Pivot ${fmt(m.pivot)}`
  ]);
}

function scoreScalp(symbol, m) {
  const longScore = points([
    [m.price <= m.bands.lower * 1.015, 24],
    [m.stochastic < 35, 18],
    [m.volumeRatio > 1.2, 16],
    [m.rsi < 45, 10],
    [m.change > -2.8, 6]
  ]);
  const shortScore = points([
    [m.price >= m.bands.upper * 0.985, 24],
    [m.stochastic > 65, 18],
    [m.volumeRatio > 1.2, 16],
    [m.rsi > 55, 10],
    [m.change < 2.8, 6]
  ]);
  return buildSignal(symbol, "scalp", longScore, shortScore, m, [
    `Bollinger range ${fmt(m.bands.lower)} to ${fmt(m.bands.upper)}`,
    `Stochastic ${m.stochastic.toFixed(0)}`,
    `ATR ${fmt(m.atr)}`
  ]);
}

function scoreTrend(symbol, m) {
  const longScore = points([
    [m.price > m.ema200, 26],
    [m.ema20 > m.ema50, 16],
    [m.adx > 25, 24],
    [m.rsi > 52, 8],
    [m.price > m.vwap, 6]
  ]);
  const shortScore = points([
    [m.price < m.ema200, 26],
    [m.ema20 < m.ema50, 16],
    [m.adx > 25, 24],
    [m.rsi < 48, 8],
    [m.price < m.vwap, 6]
  ]);
  return buildSignal(symbol, "trend", longScore, shortScore, m, [
    `EMA 200 proxy ${fmt(m.ema200)}`,
    `ADX ${m.adx.toFixed(0)}`,
    `ATR trail area ${fmt(m.atr * 2)}`
  ]);
}

function scoreReversal(symbol, m, closes) {
  const recentLow = Math.min(...closes.slice(-12));
  const priorLow = Math.min(...closes.slice(-30, -12));
  const recentHigh = Math.max(...closes.slice(-12));
  const priorHigh = Math.max(...closes.slice(-30, -12));
  const bullishDivergence = recentLow < priorLow && m.rsi > 38;
  const bearishDivergence = recentHigh > priorHigh && m.rsi < 62;
  const longScore = points([
    [bullishDivergence, 25],
    [m.price > m.rangeLow * 1.02, 18],
    [m.rsi < 52, 12],
    [m.volumeRatio > 1.1, 12],
    [m.change > 0, 8]
  ]);
  const shortScore = points([
    [bearishDivergence, 25],
    [m.price < m.rangeHigh * 0.98, 18],
    [m.rsi > 48, 12],
    [m.volumeRatio > 1.1, 12],
    [m.change < 0, 8]
  ]);
  return buildSignal(symbol, "reversal", longScore, shortScore, m, [
    `Support zone ${fmt(m.rangeLow)}`,
    `Resistance zone ${fmt(m.rangeHigh)}`,
    `RSI ${m.rsi.toFixed(0)}`
  ]);
}

function scoreBreakout(symbol, m) {
  const squeeze = m.bands.bandwidth < 7.5;
  const longScore = points([
    [squeeze, 18],
    [m.price > m.rangeHigh * 0.995, 22],
    [m.volumeRatio > 1.4, 20],
    [m.price > m.pivot, 10],
    [m.rsi > 54, 8]
  ]);
  const shortScore = points([
    [squeeze, 18],
    [m.price < m.rangeLow * 1.005, 22],
    [m.volumeRatio > 1.4, 20],
    [m.price < m.pivot, 10],
    [m.rsi < 46, 8]
  ]);
  return buildSignal(symbol, "breakout", longScore, shortScore, m, [
    `BB bandwidth ${m.bands.bandwidth.toFixed(1)}%`,
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
    change: metrics.change,
    window: direction === "hold" ? "Wait for a fresh trigger" : strategy.window,
    thesis,
    evidence,
    stopLoss,
    takeProfit,
    riskReward: direction === "hold" ? "No trade" : "2:1 target model",
    risk: strategy.risk,
    updatedAt: new Date()
  };
}

function scan() {
  if (state.running) advanceMarket();

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
  els.dataMode.textContent = "Demo quotes";
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
          <div class="price">${fmt(signal.price)} ${signal.change >= 0 ? "+" : ""}${signal.change.toFixed(2)}%</div>
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
        <div><span>Stop-loss</span><strong>${fmt(signal.stopLoss)}</strong></div>
        <div><span>Take-profit</span><strong>${fmt(signal.takeProfit)}</strong></div>
      </div>
      <button class="detail-button" type="button" data-detail="${signal.key}">Why this signal?</button>
    </article>
  `;
}

function alertItem(signal) {
  return `
    <article class="alert ${signal.direction}">
      <small>${signal.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} - ${signal.strategy}</small>
      <h3>${signal.symbol}: ${signal.bias} at ${fmt(signal.price)}</h3>
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
      <div><span>Current price</span><strong>${fmt(signal.price)}</strong></div>
      <div><span>Trade window</span><strong>${signal.window}</strong></div>
      <div><span>Suggested stop-loss</span><strong>${fmt(signal.stopLoss)}</strong></div>
      <div><span>Suggested take-profit</span><strong>${fmt(signal.takeProfit)}</strong></div>
    </div>
    <p class="risk-note">${signal.risk} Risk/reward: ${signal.riskReward}. Prices shown are demo quotes until a licensed live data provider is connected. This app provides technical signal research only. It does not know your financial situation, portfolio, taxes, or risk tolerance.</p>
  `;
  els.detailDialog.showModal();
}

function fmt(value) {
  return `$${Number(value).toFixed(value > 1000 ? 0 : 2)}`;
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

function startScanner() {
  if (state.scanTimer) clearInterval(state.scanTimer);
  state.scanTimer = setInterval(scan, state.scanRate);
  els.scanStatus.textContent = state.running ? `Scanning market every ${state.scanRate / 1000} seconds` : "Scanner paused";
}
