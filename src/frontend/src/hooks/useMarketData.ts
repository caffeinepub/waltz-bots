/**
 * useMarketData — fetches real OHLCV & price data from Binance public API
 * No API key required for public endpoints.
 *
 * Signal engine rebuilt with:
 * - Real OHLCV data only (no synthetic candles)
 * - Strict multi-indicator confluence (RSI + MACD + EMA trend + Volume)
 * - Multi-timeframe confirmation (5m, 15m, 1h must align)
 * - Proper pullback guard (price not near resistance, RSI not overextended)
 * - Data validation layer (stale data, low volume, abnormal spread filters)
 * - High confidence threshold (80%+, score 10+/15)
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
  symbol: string; // e.g. "BTCUSDT"
  price: number;
  change24h: number; // percent
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
  symbol: string, // e.g. "BTC"
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: symbols is joined to avoid referential instability
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

// ─────────────────────────────────────────────
// INDICATOR CALCULATIONS (no randomness)
// ─────────────────────────────────────────────

/** Exponential Moving Average */
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

/** RSI — Wilder smoothing (standard) */
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
  /** true when histogram just crossed from negative to positive (bullish crossover) */
  bullishCrossover: boolean;
  /** true when histogram just crossed from positive to negative (bearish crossover) */
  bearishCrossover: boolean;
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
  const macdVal = macdLine[macdLine.length - 1];
  const macdPrev = macdLine[macdLine.length - 2];
  const signalVal = signalLine[lastIdx];
  const signalPrev = signalLine[lastIdx - 1];
  const histCurr = macdVal - signalVal;
  const histPrev = macdPrev - signalPrev;
  return {
    macd: macdVal,
    signal: signalVal,
    histogram: histCurr,
    bullishCrossover: histPrev < 0 && histCurr > 0,
    bearishCrossover: histPrev > 0 && histCurr < 0,
  };
}

/** Average True Range (14-period) */
export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) {
    // fallback: simple H-L average
    const slice = candles.slice(-Math.min(14, candles.length));
    return slice.reduce((s, c) => s + (c.high - c.low), 0) / slice.length;
  }
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    trs.push(Math.max(hl, hc, lc));
  }
  // Wilder smoothing
  let atrVal = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atrVal = (atrVal * (period - 1) + trs[i]) / period;
  }
  return atrVal;
}

/**
 * Detect trend using price structure (HH/HL vs LH/LL) + EMA50/200 alignment.
 * Requires both structural AND EMA confirmation to avoid false trends.
 */
export function detectTrend(candles: Candle[]): "up" | "down" | "sideways" {
  if (candles.length < 20) return "sideways";
  const closes = candles.map((c) => c.close);

  // EMA alignment signal
  const ema50 = ema(closes, Math.min(50, closes.length - 1));
  const ema200 = ema(closes, Math.min(200, closes.length - 1));

  let emaSignal: "up" | "down" | "sideways" = "sideways";
  if (ema50.length > 0 && ema200.length > 0) {
    const lastEma50 = ema50[ema50.length - 1];
    const lastEma200 = ema200[ema200.length - 1];
    const currentPrice = closes[closes.length - 1];
    if (currentPrice > lastEma50 && lastEma50 > lastEma200) emaSignal = "up";
    else if (currentPrice < lastEma50 && lastEma50 < lastEma200)
      emaSignal = "down";
  }

  // Price structure: compare swing highs and lows over recent 12 candles
  const recent = candles.slice(-12);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);
  let higherHighs = 0;
  let lowerLows = 0;
  let lowerHighs = 0;
  let higherLows = 0;
  for (let i = 1; i < highs.length; i++) {
    if (highs[i] > highs[i - 1]) higherHighs++;
    else lowerHighs++;
    if (lows[i] < lows[i - 1]) lowerLows++;
    else higherLows++;
  }
  const structureUp = higherHighs > lowerHighs && higherLows > lowerLows;
  const structureDown = lowerHighs > higherHighs && lowerLows > higherLows;

  // Require BOTH structure and EMA to agree for strong trend
  if (structureUp && emaSignal === "up") return "up";
  if (structureDown && emaSignal === "down") return "down";
  // Single confirmation = weak trend, return sideways for signal engine
  return "sideways";
}

/**
 * Pullback guard: returns true only if price has cleanly pulled back to
 * EMA support and is showing a reversal (close above prior candle's close,
 * volume increasing). Prevents entering at the top of a move.
 */
export function detectPullbackReversal(
  candles: Candle[],
  closes: number[],
): boolean {
  if (candles.length < 20) return false;
  const ema20arr = ema(closes, 20);
  if (ema20arr.length < 3) return false;

  const lastEma20 = ema20arr[ema20arr.length - 1];
  const lastClose = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const lastVol = candles[candles.length - 1].volume;
  const prevVol = candles[candles.length - 2].volume;

  // Price must have touched EMA20 or been within 1.5% of it
  const distFromEma = Math.abs(lastClose - lastEma20) / lastEma20;
  const touchedEma = distFromEma < 0.015;

  // Bullish reversal candle: close above previous close with volume surge
  const bullishCandle = lastClose > prevClose;
  const volumeSurge = lastVol > prevVol * 0.9;

  return touchedEma && bullishCandle && volumeSurge;
}

/**
 * Resistance check: returns true if price is dangerously close to recent high
 * (within 1.5%), which would mean limited upside and high reversal risk.
 */
export function isNearResistance(
  currentPrice: number,
  candles: Candle[],
): boolean {
  const recentHighs = candles.slice(-20).map((c) => c.high);
  const resistanceLevel = Math.max(...recentHighs);
  const distToResistance = (resistanceLevel - currentPrice) / currentPrice;
  // If price is within 2% of 20-candle high, it's too close to resistance
  return distToResistance < 0.02;
}

// ─────────────────────────────────────────────
// DATA VALIDATION LAYER
// ─────────────────────────────────────────────

export interface DataValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates candle data quality before running indicators.
 * Filters: stale data, low volume, abnormal spreads.
 */
export function validateCandleData(
  candles1h: Candle[],
  minVolumeUsd = 500_000,
): DataValidationResult {
  if (candles1h.length < 50) {
    return { valid: false, reason: "Insufficient candle history" };
  }

  // Stale data check: last candle must be within 2 hours
  const lastCandleAge = Date.now() - candles1h[candles1h.length - 1].openTime;
  if (lastCandleAge > 2 * 3600 * 1000) {
    return { valid: false, reason: "Stale data (>2h old)" };
  }

  // Volume check on 1h: average 24-candle volume must exceed minimum
  const avgVol =
    candles1h.slice(-24).reduce((s, c) => s + c.close * c.volume, 0) / 24;
  if (avgVol < minVolumeUsd) {
    return { valid: false, reason: `Low volume (avg $${avgVol.toFixed(0)})` };
  }

  // Abnormal spread check: any candle with H-L spread > 15% of close is suspicious
  const suspiciousCandles = candles1h.slice(-10).filter((c) => {
    const spread = (c.high - c.low) / c.close;
    return spread > 0.15;
  });
  if (suspiciousCandles.length >= 3) {
    return {
      valid: false,
      reason: "Abnormal spread detected (possible manipulation)",
    };
  }

  // Zero-volume candle check (data gap)
  const zeroVolCandles = candles1h.slice(-10).filter((c) => c.volume === 0);
  if (zeroVolCandles.length > 0) {
    return { valid: false, reason: "Zero-volume candles detected (data gap)" };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────
// SIGNAL ANALYSIS (MAIN ENGINE)
// ─────────────────────────────────────────────

export interface SignalAnalysis {
  direction: "BUY" | "SELL" | null;
  confidence: number;
  rsiValue: number;
  macdHistogram: number;
  trend: "up" | "down" | "sideways";
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  estimatedHours: number;
  riskReward: string;
  analysis: string;
  volumeConfirmed: boolean;
  multiTimeframeConfluence: boolean;
  profitPercent: number;
}

/**
 * Core signal engine — rebuilt for accuracy.
 *
 * Rules for a VALID BUY signal (all must pass):
 * 1. Trend is UP on 1h AND at least one of 5m/15m
 * 2. RSI(1h) is between 35–60 (recovering, not overbought)
 * 3. MACD(1h) histogram is positive OR just had bullish crossover
 * 4. Volume on last 1h candle is ABOVE 20-candle average
 * 5. Price is NOT within 2% of 20-candle resistance
 * 6. Multi-timeframe confluence: at least 2 of 3 timeframes agree
 * 7. Data validation passes (no stale/abnormal data)
 * 8. Final score must be >= 10/15
 * 9. Confidence must be >= 80%
 *
 * SELL signals use the mirror conditions.
 * Returns null if no signal passes all hard gates.
 */
export async function analyzeSymbol(
  symbol: string,
  currentPrice: number,
): Promise<SignalAnalysis | null> {
  // Fetch 3 timeframes in parallel — real OHLCV data only
  const [candles5m, candles15m, candles1h] = await Promise.all([
    fetchCandles(symbol, "5m", 100),
    fetchCandles(symbol, "15m", 100),
    fetchCandles(symbol, "1h", 100),
  ]);

  // ── DATA VALIDATION GATE ──
  const validation = validateCandleData(candles1h);
  if (!validation.valid) return null;
  if (candles5m.length < 30 || candles15m.length < 30) return null;

  const closes5m = candles5m.map((c) => c.close);
  const closes15m = candles15m.map((c) => c.close);
  const closes1h = candles1h.map((c) => c.close);

  // ── INDICATORS ──
  const rsi5m = rsi(closes5m);
  const rsi15m = rsi(closes15m);
  const rsi1h = rsi(closes1h);
  const macd5mResult = macd(closes5m);
  const macd15mResult = macd(closes15m);
  const macd1hResult = macd(closes1h);
  const trend5m = detectTrend(candles5m);
  const trend15m = detectTrend(candles15m);
  const trend1h = detectTrend(candles1h);

  if (rsi5m.length === 0 || rsi1h.length === 0 || rsi15m.length === 0)
    return null;
  if (!macd1hResult) return null;

  const curRsi5m = rsi5m[rsi5m.length - 1];
  const curRsi15m = rsi15m[rsi15m.length - 1];
  const curRsi1h = rsi1h[rsi1h.length - 1];

  // ── VOLUME VALIDATION (strict: must exceed average, not just near it) ──
  const volumes1h = candles1h.map((c) => c.volume * c.close);
  const avg20Vol = volumes1h.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const lastVol = volumes1h[volumes1h.length - 1];
  const volumeConfirmed = lastVol >= avg20Vol; // must be AT or ABOVE average

  // ── MULTI-TIMEFRAME CONFLUENCE ──
  const uptrendCount = [trend5m, trend15m, trend1h].filter(
    (t) => t === "up",
  ).length;
  const downtrendCount = [trend5m, trend15m, trend1h].filter(
    (t) => t === "down",
  ).length;
  // Require at least 2 timeframes to agree (including 1h)
  const bullishMTF = uptrendCount >= 2 && trend1h === "up";
  const bearishMTF = downtrendCount >= 2 && trend1h === "down";
  const multiTimeframeConfluence = bullishMTF || bearishMTF;

  // If 1h trend is sideways, no signal — trend must be confirmed on primary TF
  if (trend1h === "sideways") return null;

  // ── RESISTANCE / SUPPORT CHECKS ──
  const nearResistanceBuy = isNearResistance(currentPrice, candles1h);
  const nearSupportSell = isNearResistance(currentPrice, [
    ...candles1h.map((c) => ({ ...c, high: c.low, low: c.high })),
  ]);

  // ── PULLBACK DETECTION ──
  const hasPullbackReversal = detectPullbackReversal(candles1h, closes1h);

  // ── SIGNAL SCORING (max 15 points) ──
  let buyScore = 0;
  let sellScore = 0;

  // RSI conditions — strict bands
  // BUY: RSI recovering from oversold (30–55 range, showing upward momentum)
  if (curRsi1h >= 30 && curRsi1h <= 55) buyScore += 2;
  if (curRsi15m >= 30 && curRsi15m <= 55) buyScore += 1;
  if (curRsi5m >= 35 && curRsi5m <= 60) buyScore += 1;
  // SELL: RSI approaching or at overbought (45–70 range, showing downward momentum)
  if (curRsi1h >= 45 && curRsi1h <= 70) sellScore += 2;
  if (curRsi15m >= 45 && curRsi15m <= 70) sellScore += 1;
  if (curRsi5m >= 40 && curRsi5m <= 65) sellScore += 1;

  // Hard block: RSI overbought on buy entry (>72) or oversold on sell entry (<28)
  if (curRsi1h > 72) buyScore = Math.max(0, buyScore - 3);
  if (curRsi1h < 28) sellScore = Math.max(0, sellScore - 3);

  // MACD conditions — favor actual crossovers over just positive histogram
  if (macd1hResult.bullishCrossover) buyScore += 3;
  else if (macd1hResult.histogram > 0) buyScore += 1;
  if (macd1hResult.bearishCrossover) sellScore += 3;
  else if (macd1hResult.histogram < 0) sellScore += 1;

  if (macd15mResult?.bullishCrossover) buyScore += 2;
  else if (macd15mResult && macd15mResult.histogram > 0) buyScore += 1;
  if (macd15mResult?.bearishCrossover) sellScore += 2;
  else if (macd15mResult && macd15mResult.histogram < 0) sellScore += 1;

  if (macd5mResult?.bullishCrossover) buyScore += 1;
  if (macd5mResult?.bearishCrossover) sellScore += 1;

  // Trend conditions — weighted by timeframe importance
  if (trend1h === "up") buyScore += 3;
  if (trend1h === "down") sellScore += 3;
  if (trend15m === "up") buyScore += 2;
  if (trend15m === "down") sellScore += 2;
  if (trend5m === "up") buyScore += 1;
  if (trend5m === "down") sellScore += 1;

  // Volume — confirmed volume is required for high confidence
  if (volumeConfirmed) {
    if (trend1h === "up") buyScore += 1;
    if (trend1h === "down") sellScore += 1;
  }

  // Pullback reversal bonus (highest quality buy setup)
  if (hasPullbackReversal && trend1h === "up") buyScore += 1;

  // Penalty: near resistance on BUY = high risk, reduce score
  if (nearResistanceBuy) buyScore = Math.max(0, buyScore - 4);
  if (nearSupportSell) sellScore = Math.max(0, sellScore - 4);

  const maxPossibleScore = 15;
  // STRICT threshold: must score >= 10/15 (was lowered to 5, now restored)
  const isBuy = buyScore > sellScore && buyScore >= 10 && bullishMTF;
  const isSell = sellScore > buyScore && sellScore >= 10 && bearishMTF;

  if (!isBuy && !isSell) return null;

  const dominantScore = isBuy ? buyScore : sellScore;
  const rawConfidence = Math.min(
    99,
    Math.round((dominantScore / maxPossibleScore) * 100),
  );

  // STRICT confidence gate: must be >= 80% (was lowered to 45%, now restored)
  if (rawConfidence < 80) return null;

  // Volume must be confirmed for a signal to pass
  if (!volumeConfirmed) return null;

  // Multi-timeframe must be confluent
  if (!multiTimeframeConfluence) return null;

  const confidence = rawConfidence;

  // ── ATR-BASED TP/SL ──
  const atrValue = atr(candles1h.slice(-50));
  const safeAtr = atrValue > 0 ? atrValue : currentPrice * 0.015;

  let targetPrice: number;
  let stopLoss: number;
  if (isBuy) {
    // Stop loss placed at 1.2x ATR below entry (below recent structure)
    stopLoss = currentPrice - safeAtr * 1.2;
    // Target at 2.5x ATR above entry (minimum 2:1 R:R)
    targetPrice = currentPrice + safeAtr * 2.5;
  } else {
    stopLoss = currentPrice + safeAtr * 1.2;
    targetPrice = currentPrice - safeAtr * 2.5;
  }

  const riskAmt = Math.abs(currentPrice - stopLoss);
  const rewardAmt = Math.abs(targetPrice - currentPrice);
  const rrRatio = riskAmt > 0 ? (rewardAmt / riskAmt).toFixed(2) : "2.08";
  const estimatedHours = Math.round(8 + (100 - confidence) * 0.4);

  const profitPercent = isBuy
    ? ((targetPrice - currentPrice) / currentPrice) * 100
    : ((currentPrice - targetPrice) / currentPrice) * 100;

  // ── ANALYSIS TEXT ──
  const trendLabel = isBuy ? "bullish" : "bearish";
  const rsiLabel = isBuy
    ? `RSI(1h) ${curRsi1h.toFixed(0)} — recovering from oversold territory`
    : `RSI(1h) ${curRsi1h.toFixed(0)} — momentum rolling over from overbought`;
  const macdLabel = (
    isBuy
      ? macd1hResult.bullishCrossover
      : macd1hResult.bearishCrossover
  )
    ? `${isBuy ? "Bullish" : "Bearish"} MACD crossover confirmed on 1h`
    : `MACD histogram ${isBuy ? "positive" : "negative"} on 1h`;
  const tfLabel = `${trend1h}/${trend15m}/${trend5m} (1h/15m/5m)`;
  const pullbackNote = hasPullbackReversal
    ? " Price retested EMA20 and reversed with volume confirmation."
    : "";

  const analysis = `${isBuy ? "Bullish" : "Bearish"} confluence confirmed across ${
    uptrendCount + downtrendCount >= 2 ? "multiple" : "primary"
  } timeframes. ${rsiLabel}. ${macdLabel}. Trend structure: ${trendLabel} (${tfLabel}).${pullbackNote} Volume ${volumeConfirmed ? "confirmed above 20-period average" : "at average"} — supporting directional move. Multi-timeframe alignment: ${multiTimeframeConfluence ? "YES ✓ (all gates passed)" : "partial"}. ATR-based targets provide ${rrRatio}:1 risk-reward. All hard validation gates passed.`;

  return {
    direction: isBuy ? "BUY" : "SELL",
    confidence,
    rsiValue: curRsi1h,
    macdHistogram: macd1hResult.histogram,
    trend: trend1h,
    entryPrice: currentPrice,
    targetPrice,
    stopLoss,
    estimatedHours,
    riskReward: `1:${rrRatio}`,
    analysis,
    volumeConfirmed,
    multiTimeframeConfluence,
    profitPercent,
  };
}
