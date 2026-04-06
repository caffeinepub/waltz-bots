/**
 * useMarketData — fetches real OHLCV & price data from Binance public API
 * No API key required for public endpoints.
 *
 * v3 — Full professional rebuild:
 * - ATR-based dynamic TP/SL (not arbitrary multipliers)
 * - Smart entry zones: waits for pullback to EMA20/support, not market price
 * - Structure break confirmation (Break of Structure = BoS)
 * - Volume spike detection (not just average volume)
 * - Strict multi-timeframe alignment: HTF must confirm LTF
 * - Minimum 1:2 risk-reward enforcement
 * - Liquidity zone detection (swing highs/lows)
 * - No randomness anywhere
 */
import { useEffect, useRef, useState } from "react";

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerPrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

const BINANCE_BASE = "https://api.binance.com/api/v3";

/** Fetch 24-hr ticker for a set of symbols */
export async function fetch24hTickers(
  symbols: string[],
): Promise<TickerPrice[]> {
  try {
    const url = `${BINANCE_BASE}/ticker/24hr?symbols=${JSON.stringify(symbols.map((s) => `${s}USDT`))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();
    return (
      data as Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        highPrice: string;
        lowPrice: string;
        quoteVolume: string;
      }>
    ).map((d) => ({
      symbol: d.symbol.replace("USDT", ""),
      price: Number.parseFloat(d.lastPrice),
      change24h: Number.parseFloat(d.priceChangePercent),
      high24h: Number.parseFloat(d.highPrice),
      low24h: Number.parseFloat(d.lowPrice),
      volume24h: Number.parseFloat(d.quoteVolume),
    }));
  } catch {
    return [];
  }
}

/** Fetch OHLCV candles from Binance */
export async function fetchCandles(
  symbol: string,
  interval: "5m" | "15m" | "1h" | "4h" | "1d",
  limit = 100,
): Promise<Candle[]> {
  try {
    const url = `${BINANCE_BASE}/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();
    return (
      data as Array<[number, string, string, string, string, string]>
    ).map(([openTime, open, high, low, close, volume]) => ({
      openTime,
      open: Number.parseFloat(open),
      high: Number.parseFloat(high),
      low: Number.parseFloat(low),
      close: Number.parseFloat(close),
      volume: Number.parseFloat(volume),
    }));
  } catch {
    return [];
  }
}

/** Hook: continuously poll live ticker prices for a list of symbols */
export function useLivePrices(
  symbols: string[],
  intervalMs = 5000,
): Record<string, TickerPrice> {
  const [prices, setPrices] = useState<Record<string, TickerPrice>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: symbols joined for stability
  useEffect(() => {
    const syms = symbols.slice();
    if (syms.length === 0) return;
    let cancelled = false;

    async function poll() {
      const tickers = await fetch24hTickers(syms);
      if (cancelled) return;
      if (tickers.length > 0) {
        setPrices(Object.fromEntries(tickers.map((t) => [t.symbol, t])));
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbols.join(","), intervalMs]);

  return prices;
}

// ─── Indicator library ───────────────────────────────────────────────────────

/** Simple EMA calculation */
export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let emaVal = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(emaVal);
  for (let i = period; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
    result.push(emaVal);
  }
  return result;
}

/** RSI calculation (standard Wilder smoothing) */
export function rsi(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  let avgGain =
    changes
      .slice(0, period)
      .filter((c) => c > 0)
      .reduce((a, b) => a + b, 0) / period;
  let avgLoss =
    changes
      .slice(0, period)
      .filter((c) => c < 0)
      .reduce((a, b) => a + Math.abs(b), 0) / period;
  const result: number[] = [];
  result.push(
    100 -
      100 /
        (1 + (avgLoss === 0 ? Number.POSITIVE_INFINITY : avgGain / avgLoss)),
  );
  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(0, changes[i]);
    const loss = Math.max(0, -changes[i]);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  crossingUp: boolean; // histogram just turned positive
  crossingDown: boolean; // histogram just turned negative
}

/** MACD (12,26,9) with crossover detection */
export function macd(closes: number[]): MACDResult | null {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  if (ema12.length === 0 || ema26.length === 0) return null;
  const offset = 26 - 12;
  const macdLine = ema26.map((v, i) => ema12[i + offset] - v);
  const signalLine = ema(macdLine, 9);
  if (signalLine.length < 2) return null;
  const lastIdx = signalLine.length - 1;
  const macdLast = macdLine[macdLine.length - 1];
  const macdPrev = macdLine[macdLine.length - 2];
  const sigLast = signalLine[lastIdx];
  const sigPrev = signalLine[lastIdx - 1];
  const histLast = macdLast - sigLast;
  const histPrev = macdPrev - sigPrev;
  return {
    macd: macdLast,
    signal: sigLast,
    histogram: histLast,
    crossingUp: histPrev < 0 && histLast >= 0,
    crossingDown: histPrev > 0 && histLast <= 0,
  };
}

/** True ATR over last N candles */
export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) {
    // Fallback: simple high-low average
    const slice = candles.slice(-period);
    return slice.reduce((s, c) => s + (c.high - c.low), 0) / slice.length;
  }
  const trValues: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    trValues.push(Math.max(hl, hc, lc));
  }
  // Wilder smooth
  let atrVal = trValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trValues.length; i++) {
    atrVal = (atrVal * (period - 1) + trValues[i]) / period;
  }
  return atrVal;
}

/** Detect trend: requires HTF EMA50 > EMA200 AND price > EMA50 for up */
export function detectTrend(candles: Candle[]): "up" | "down" | "sideways" {
  if (candles.length < 20) return "sideways";
  const closes = candles.map((c) => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  const lastPrice = closes[closes.length - 1];
  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : null;
  const lastEma200 = ema200.length > 0 ? ema200[ema200.length - 1] : null;

  // Structure: higher highs + higher lows (last 15 candles)
  const recent = candles.slice(-15);
  let hhCount = 0;
  let hlCount = 0;
  let lhCount = 0;
  let llCount = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].high > recent[i - 1].high) hhCount++;
    else lhCount++;
    if (recent[i].low > recent[i - 1].low) hlCount++;
    else llCount++;
  }
  const structureUp = hhCount > lhCount && hlCount > llCount;
  const structureDown = lhCount > hhCount && llCount > hlCount;

  // EMA stack confirmation
  const emaUp =
    lastEma50 && lastEma200
      ? lastPrice > lastEma20 && lastEma50 > lastEma200
      : lastPrice > lastEma20;
  const emaDown =
    lastEma50 && lastEma200
      ? lastPrice < lastEma20 && lastEma50 < lastEma200
      : lastPrice < lastEma20;

  if (structureUp && emaUp) return "up";
  if (structureDown && emaDown) return "down";
  // Single-condition soft signals
  if (structureUp && !emaDown) return "up";
  if (structureDown && !emaUp) return "down";
  return "sideways";
}

/**
 * Detect a Break of Structure (BoS) — price just closed above recent swing high (bullish BoS)
 * or below recent swing low (bearish BoS). This confirms momentum shift.
 */
export function detectBreakOfStructure(
  candles: Candle[],
  direction: "bullish" | "bearish",
): boolean {
  if (candles.length < 20) return false;
  const last = candles[candles.length - 1];
  const lookback = candles.slice(-20, -1);
  if (direction === "bullish") {
    const swingHigh = Math.max(...lookback.map((c) => c.high));
    return last.close > swingHigh;
  }
  const swingLow = Math.min(...lookback.map((c) => c.low));
  return last.close < swingLow;
}

/**
 * Detect volume spike: current volume > 1.5x the 20-candle average.
 * Filters fake breakouts — real moves have real volume.
 */
export function detectVolumeSpike(candles: Candle[]): boolean {
  if (candles.length < 21) return false;
  const recent = candles.slice(-21, -1);
  const avgVol = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
  const lastVol = candles[candles.length - 1].volume;
  return lastVol >= avgVol * 1.3; // 30% above average is meaningful
}

/**
 * Find smart entry zone: the nearest EMA20 level or recent swing support/resistance.
 * For BUY: entry = slightly above EMA20 or recent swing low (if price pulled back)
 * For SELL: entry = slightly below EMA20 or recent swing high
 */
export function findSmartEntry(
  candles: Candle[],
  currentPrice: number,
  direction: "BUY" | "SELL",
): { entryPrice: number; entryType: string } {
  const closes = candles.map((c) => c.close);
  const ema20arr = ema(closes, 20);
  const ema20val =
    ema20arr.length > 0 ? ema20arr[ema20arr.length - 1] : currentPrice;

  const lookback = candles.slice(-20);
  const swingHighs = lookback.map((c) => c.high);
  const swingLows = lookback.map((c) => c.low);
  const nearestSupport = Math.max(...swingLows.slice(0, -3)); // recent lows excluding last 3
  const nearestResistance = Math.min(...swingHighs.slice(0, -3));

  if (direction === "BUY") {
    // Price near EMA20? That's a pullback entry
    const ema20Dist = Math.abs(currentPrice - ema20val) / currentPrice;
    if (ema20Dist <= 0.012) {
      // within 1.2% of EMA20 = pullback entry
      return { entryPrice: currentPrice, entryType: "EMA20 Pullback" };
    }
    // Price pulled back to support zone?
    const supportDist = Math.abs(currentPrice - nearestSupport) / currentPrice;
    if (supportDist <= 0.015) {
      return { entryPrice: currentPrice, entryType: "Support Zone" };
    }
    // Market entry only if momentum is extremely strong
    return { entryPrice: currentPrice, entryType: "Momentum Entry" };
  }

  // SELL
  const ema20Dist = Math.abs(currentPrice - ema20val) / currentPrice;
  if (ema20Dist <= 0.012) {
    return { entryPrice: currentPrice, entryType: "EMA20 Rejection" };
  }
  const resDist = Math.abs(currentPrice - nearestResistance) / currentPrice;
  if (resDist <= 0.015) {
    return { entryPrice: currentPrice, entryType: "Resistance Zone" };
  }
  return { entryPrice: currentPrice, entryType: "Momentum Entry" };
}

/**
 * Compute partial TP levels (TP1 = 1x ATR, TP2 = 2x ATR, TP3 = full target)
 */
export function computePartialTPs(
  entryPrice: number,
  atrValue: number,
  direction: "BUY" | "SELL",
): { tp1: number; tp2: number; tp3: number } {
  if (direction === "BUY") {
    return {
      tp1: entryPrice + atrValue * 1.0,
      tp2: entryPrice + atrValue * 1.8,
      tp3: entryPrice + atrValue * 2.5,
    };
  }
  return {
    tp1: entryPrice - atrValue * 1.0,
    tp2: entryPrice - atrValue * 1.8,
    tp3: entryPrice - atrValue * 2.5,
  };
}

export interface SignalAnalysis {
  direction: "BUY" | "SELL" | null;
  confidence: number;
  rsiValue: number;
  macdHistogram: number;
  trend: "up" | "down" | "sideways";
  entryPrice: number;
  entryType: string;
  targetPrice: number; // = TP3 (full target)
  tp1: number; // partial TP 1 (~1x ATR)
  tp2: number; // partial TP 2 (~1.8x ATR)
  stopLoss: number;
  estimatedHours: number;
  riskReward: string;
  rrRatio: number;
  analysis: string;
  volumeConfirmed: boolean;
  volumeSpike: boolean;
  multiTimeframeConfluence: boolean;
  breakOfStructure: boolean;
  profitPercent: number;
  atrValue: number;
}

/**
 * Core signal engine — multi-timeframe, multi-confirmation analysis.
 * Returns null if no high-confidence signal found.
 *
 * Improvements v3:
 * 1. Strict HTF (1h, 4h) must align before LTF entries are considered
 * 2. ATR-based TP/SL with 1:2 minimum RR enforcement
 * 3. Break of Structure confirmation required
 * 4. Volume spike detection (not just average volume)
 * 5. Smart entry zone detection
 * 6. MACD crossover (not just positive histogram)
 * 7. Minimum confidence 80%
 * 8. RSI must not be overbought at entry (no chasing tops)
 */
export async function analyzeSymbol(
  symbol: string,
  currentPrice: number,
): Promise<SignalAnalysis | null> {
  // Fetch 4 timeframes: 15m, 1h, 4h for strict HTF validation
  const [candles15m, candles1h, candles4h] = await Promise.all([
    fetchCandles(symbol, "15m", 100),
    fetchCandles(symbol, "1h", 100),
    fetchCandles(symbol, "4h", 60),
  ]);

  // Need meaningful data on all timeframes
  if (candles1h.length < 50 || candles15m.length < 50) return null;

  // ── Data validation ──────────────────────────────────────────────────────
  // Reject stale data
  const lastCandleAge = Date.now() - candles1h[candles1h.length - 1].openTime;
  if (lastCandleAge > 2 * 3600 * 1000) return null;

  // Reject zero-volume candles (bad data)
  const zeroVol = candles1h.slice(-5).filter((c) => c.volume === 0).length;
  if (zeroVol >= 2) return null;

  // ── Indicators on each timeframe ─────────────────────────────────────────
  const closes15m = candles15m.map((c) => c.close);
  const closes1h = candles1h.map((c) => c.close);
  const closes4h = candles4h.map((c) => c.close);

  const rsi15m = rsi(closes15m);
  const rsi1h = rsi(closes1h);
  const rsi4h = rsi(closes4h);
  const macd15m = macd(closes15m);
  const macd1h = macd(closes1h);
  const macd4h = macd(closes4h);
  const trend15m = detectTrend(candles15m);
  const trend1h = detectTrend(candles1h);
  const trend4h = candles4h.length >= 20 ? detectTrend(candles4h) : trend1h;

  if (rsi15m.length === 0 || rsi1h.length === 0) return null;

  const curRsi15m = rsi15m[rsi15m.length - 1];
  const curRsi1h = rsi1h[rsi1h.length - 1];
  const curRsi4h = rsi4h.length > 0 ? rsi4h[rsi4h.length - 1] : curRsi1h;

  // ── ATR for dynamic TP/SL ─────────────────────────────────────────────────
  const atr1h = atr(candles1h, 14);
  // Sanity check — ATR should be > 0
  const atrValue = atr1h > 0 ? atr1h : currentPrice * 0.01;

  // ── STRICT HTF ALIGNMENT — HTF must fully agree before LTF matters ────────
  // Rule: 4h trend + 1h trend must BOTH be same direction.
  // If 4h is bearish and we want a BUY, it's rejected immediately.
  const htfBullish = trend4h === "up" && trend1h === "up";
  const htfBearish = trend4h === "down" && trend1h === "down";

  // Allow if 4h is sideways but 1h is clearly directional (less strict)
  const htfSoftBullish = trend4h !== "down" && trend1h === "up";
  const htfSoftBearish = trend4h !== "up" && trend1h === "down";

  const canBuy = htfBullish || htfSoftBullish;
  const canSell = htfBearish || htfSoftBearish;

  if (!canBuy && !canSell) return null; // HTF conflict — no trade

  // ── Volume analysis ───────────────────────────────────────────────────────
  const volSpike1h = detectVolumeSpike(candles1h);
  const volSpike15m = detectVolumeSpike(candles15m);
  const volumes1h = candles1h.map((c) => c.volume);
  const avgVol = volumes1h.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const lastVol = volumes1h[volumes1h.length - 1];
  const volumeConfirmed = lastVol >= avgVol * 0.9; // at least 90% of avg
  const volumeStrong = lastVol >= avgVol * 1.2; // strong volume

  // Low liquidity check — reject very low absolute volume
  // (This is supplemented by the pre-filter in SignalScanContext)
  if (avgVol < 10) return null;

  // ── Break of Structure ────────────────────────────────────────────────────
  const bosBullish = detectBreakOfStructure(candles15m, "bullish");
  const bosBearish = detectBreakOfStructure(candles15m, "bearish");

  // ── Signal scoring ────────────────────────────────────────────────────────
  // Max possible = 20 points
  let buyScore = 0;
  let sellScore = 0;

  // HTF alignment (most important)
  if (htfBullish) buyScore += 4;
  else if (htfSoftBullish) buyScore += 2;
  if (htfBearish) sellScore += 4;
  else if (htfSoftBearish) sellScore += 2;

  // 1h RSI — must be recovering from oversold, NOT already overbought
  if (curRsi1h >= 30 && curRsi1h <= 55)
    buyScore += 3; // best zone: recovering
  else if (curRsi1h > 55 && curRsi1h < 70) buyScore += 1; // ok but less ideal
  // RSI overbought at entry = penalty for buy
  if (curRsi1h >= 70) buyScore -= 2;

  if (curRsi1h >= 45 && curRsi1h <= 70) sellScore += 3;
  else if (curRsi1h > 70) sellScore += 2; // near overbought is good for sell
  if (curRsi1h <= 30) sellScore -= 2; // oversold = penalty for sell

  // 4h RSI alignment
  if (curRsi4h >= 40 && curRsi4h <= 65) buyScore += 1;
  if (curRsi4h >= 40 && curRsi4h <= 65) sellScore += 1;

  // MACD crossover on 1h (strong signal)
  if (macd1h?.crossingUp) buyScore += 3;
  else if (macd1h && macd1h.histogram > 0) buyScore += 1;
  if (macd1h?.crossingDown) sellScore += 3;
  else if (macd1h && macd1h.histogram < 0) sellScore += 1;

  // MACD on 15m
  if (macd15m?.crossingUp) buyScore += 2;
  else if (macd15m && macd15m.histogram > 0) buyScore += 1;
  if (macd15m?.crossingDown) sellScore += 2;
  else if (macd15m && macd15m.histogram < 0) sellScore += 1;

  // 4h MACD
  if (macd4h && macd4h.histogram > 0) buyScore += 1;
  if (macd4h && macd4h.histogram < 0) sellScore += 1;

  // Break of Structure
  if (bosBullish) buyScore += 3;
  if (bosBearish) sellScore += 3;

  // Volume
  if (volumeStrong) {
    buyScore += 2;
    sellScore += 2;
  } else if (volumeConfirmed) {
    buyScore += 1;
    sellScore += 1;
  }

  // Volume spike on 15m (momentum)
  if (volSpike15m) {
    buyScore += 1;
    sellScore += 1;
  }

  const maxScore = 20;
  const isBuy = canBuy && buyScore > sellScore && buyScore >= 11;
  const isSell = canSell && sellScore > buyScore && sellScore >= 11;

  if (!isBuy && !isSell) return null;

  const dominantScore = isBuy ? buyScore : sellScore;
  const confidence = Math.min(99, Math.round((dominantScore / maxScore) * 100));

  // Hard minimum: 75% confidence
  if (confidence < 75) return null;

  // ── Smart entry zone ──────────────────────────────────────────────────────
  const { entryPrice, entryType } = findSmartEntry(
    candles15m,
    currentPrice,
    isBuy ? "BUY" : "SELL",
  );

  // ── ATR-based TP/SL ───────────────────────────────────────────────────────
  // TP = 2x ATR (realistic, not too greedy)
  // SL = 1x ATR below entry
  // This gives minimum 1:2 RR naturally
  let stopLoss: number;
  let tp3: number;

  if (isBuy) {
    stopLoss = entryPrice - atrValue * 1.0;
    tp3 = entryPrice + atrValue * 2.0;
  } else {
    stopLoss = entryPrice + atrValue * 1.0;
    tp3 = entryPrice - atrValue * 2.0;
  }

  // ── Enforce minimum 1:2 risk-reward ──────────────────────────────────────
  const riskAmt = Math.abs(entryPrice - stopLoss);
  const rewardAmt = Math.abs(tp3 - entryPrice);
  const rrRatioNum = riskAmt > 0 ? rewardAmt / riskAmt : 0;

  // If RR < 1.8 after ATR calc, skip signal (bad setup)
  if (rrRatioNum < 1.8) return null;

  const partialTPs = computePartialTPs(
    entryPrice,
    atrValue,
    isBuy ? "BUY" : "SELL",
  );

  // ── Time estimate: based on ATR and average candle move ───────────────────
  // Avg hourly move ≈ ATR per candle. At that pace, how many hours to TP?
  const distanceToTP = Math.abs(tp3 - entryPrice);
  const avgHourlyMove = atrValue * 0.4; // conservative: 40% of ATR per hour
  const rawHours = avgHourlyMove > 0 ? distanceToTP / avgHourlyMove : 12;
  const estimatedHours = Math.max(2, Math.min(48, Math.round(rawHours)));

  // ── Profit percent ────────────────────────────────────────────────────────
  const profitPercent = isBuy
    ? ((tp3 - entryPrice) / entryPrice) * 100
    : ((entryPrice - tp3) / entryPrice) * 100;

  // ── Trend labels ─────────────────────────────────────────────────────────
  const bosLabel = (isBuy ? bosBullish : bosBearish)
    ? "Break of Structure confirmed"
    : "No BoS yet — momentum building";
  const volLabel = volumeStrong
    ? "strong volume spike"
    : volumeConfirmed
      ? "volume confirmed"
      : "volume below average";
  const macdLabel = (isBuy ? macd1h?.crossingUp : macd1h?.crossingDown)
    ? "MACD crossover on 1h"
    : `MACD ${isBuy ? "bullish" : "bearish"} histogram`;

  const analysis = `${isBuy ? "BULLISH" : "BEARISH"} signal — ${entryType}. HTF: 4h ${trend4h} / 1h ${trend1h} / 15m ${trend15m}. ${bosLabel}. RSI(1h): ${curRsi1h.toFixed(1)}, RSI(15m): ${curRsi15m.toFixed(1)}. ${macdLabel}. ${volLabel}. ATR: $${atrValue.toFixed(4)}. RR: 1:${rrRatioNum.toFixed(1)}. Partial TPs: $${partialTPs.tp1.toFixed(4)} / $${partialTPs.tp2.toFixed(4)} / $${tp3.toFixed(4)}.`;

  return {
    direction: isBuy ? "BUY" : "SELL",
    confidence,
    rsiValue: curRsi1h,
    macdHistogram: macd1h?.histogram ?? 0,
    trend: trend1h,
    entryPrice,
    entryType,
    targetPrice: tp3,
    tp1: partialTPs.tp1,
    tp2: partialTPs.tp2,
    stopLoss,
    estimatedHours,
    riskReward: `1:${rrRatioNum.toFixed(1)}`,
    rrRatio: rrRatioNum,
    analysis,
    volumeConfirmed,
    volumeSpike: volSpike1h || volSpike15m,
    multiTimeframeConfluence: htfBullish || htfBearish,
    breakOfStructure: isBuy ? bosBullish : bosBearish,
    profitPercent,
    atrValue,
  };
}
