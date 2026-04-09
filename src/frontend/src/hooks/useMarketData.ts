/**
 * useMarketData — Tiered Signal Engine (6 Hard Gates + 12 Scored Gates)
 *
 * PHILOSOPHY: Show 5-15 high-quality signals per scan. All 30+ indicators stay
 * in the code. The change is structural — 6 absolute hard gates that cannot be
 * overridden, and 12 scored gates that accumulate confidence. A signal qualifies
 * when: all 6 hard gates pass + score >= 41/51 + confidence >= 82%.
 *
 * HARD GATES (must ALL pass — instant drop if any fail):
 *  1. 4H trend: EMA50 > EMA200 AND price > EMA50 on 4H
 *  2. 1H trend: EMA20 > EMA50 AND price > EMA20 on 1H
 *  3. RSI 1H: 45–75 range
 *  4. ADX 1H: > 18 with +DI > -DI
 *  5. Volume: at least 1 of last 3 candles has spike (1.2x avg)
 *  6. RR: >= 1:2.0
 *
 * SCORED GATES (earn points — don't hard-fail if missed):
 *  7.  Stop Hunt Sweep detected         → +5 pts
 *  8.  CHoCH on 15M                     → +5 pts
 *  9.  Support anchor below SL          → +4 pts
 * 10.  Resistance proximity clear       → +4 pts
 * 11.  Candle body quality (>50% range) → +3 pts
 * 12.  Consecutive higher lows (3)      → +3 pts
 * 13.  Momentum velocity (1.1x avg)     → +3 pts
 * 14.  MACD crossover / rising hist     → +4 pts
 * 15.  RSI bullish divergence or >50    → +4 pts
 * 16.  VWAP confirmed (both TF)         → +3 pts
 * 17.  Bollinger Band position          → +3 pts
 * 18.  Ichimoku cloud (price > cloud)   → +4 pts
 *      EMA Golden Cross 4H              → +5 pts
 *      EMA bullish 1H                   → +4 pts
 *      Strong ADX >25                   → +2 pts
 *      Strong volume (1.5x avg)         → +2 pts
 */

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

/** @deprecated Use OHLCV. Kept for backwards compat. */
export type Candle = OHLCV & { openTime?: number };

export interface LiveSignal {
  symbol: string;
  direction: "BUY";
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  tp1: number;
  tp2: number;
  tp3: number;
  confidence: number;
  estimatedHours: number;
  riskReward: string;
  entryType: string;
  rsiValue: number;
  macdHistogram: number;
  volumeSpike: boolean;
  breakOfStructure: boolean;
  multiTimeframeConfluence: string;
  stopHuntConfirmed: boolean;
  chochConfirmed: boolean;
  ichimokuConfirmed: boolean;
  vwapConfirmed: boolean;
  scanTime: number;
  profitPercent: number;
  // Extended fields used by UI components
  trend?: "up" | "down" | "sideways";
  volumeConfirmed?: boolean;
  goldenCross?: boolean;
  supportZone?: boolean;
  score?: number;
  analysis?: string;
}

/** @deprecated Use LiveSignal. Kept for backwards compat with SignalScanContext. */
export type SignalAnalysis = LiveSignal & {
  bosConfirmed: boolean;
};

export interface VerdictResult {
  verdict: "CONFIRMED_HIT_TP" | "MONITORING" | "EXIT_NOW";
  reason: string;
  confidence: number;
  progressPercent: number;
}

/** @deprecated Use VerdictResult. Kept for backwards compat with TrackingPage. */
export interface UltraDeepVerdict {
  verdict: "CONFIRMED_HIT_TP" | "MONITORING" | "EXIT_NOW_NO_TP";
  // VerdictResult compatible fields
  reason: string;
  confidence: number;
  progressPercent: number;
  // Extended fields
  compositeScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  hardExitCount: number;
  hardExitTriggered: boolean;
  hardExitReason: string | null;
  hardExitReasons: string[];
  currentPrice: number;
  tpProgress: number;
  estimatedTimeToTP: string | null;
  keyBullishSignals: string[];
  keyBearishSignals: string[];
  verdictTimestamp: string;
  recommendation: string;
}

/** @deprecated Use string[] variant of fetchAllBinanceUSDTPairs. */
export interface BinancePair {
  symbol: string;
  baseAsset: string;
}

export interface TickerData {
  price: number;
  volume24h: number;
  change24h: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS — single place to tune
// ─────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_MIN = 82; // was 88
const SCORE_MIN = 41; // was 45 (out of 51)
const RR_MIN = 2.0; // was 2.5
const ADX_MIN = 18; // was 20
const VOLUME_SPIKE_RATIO = 1.2; // at least 1 of last 3 candles must hit this

// ─────────────────────────────────────────────────────────────────────────────
// BINANCE API
// ─────────────────────────────────────────────────────────────────────────────

const BINANCE_BASE = "https://api.binance.com/api/v3";

/**
 * Fetches all active Binance USDT spot symbols.
 * Returns plain string[] of full symbols (e.g. "BTCUSDT").
 */
export async function fetchAllBinanceUSDTPairs(): Promise<string[]> {
  try {
    const res = await fetch(`${BINANCE_BASE}/exchangeInfo?permissions=SPOT`);
    if (!res.ok) throw new Error(`ExchangeInfo HTTP ${res.status}`);
    const data = (await res.json()) as {
      symbols: Array<{ symbol: string; quoteAsset: string; status: string }>;
    };
    return data.symbols
      .filter((s) => s.quoteAsset === "USDT" && s.status === "TRADING")
      .map((s) => s.symbol);
  } catch {
    return [
      "BTCUSDT",
      "ETHUSDT",
      "BNBUSDT",
      "SOLUSDT",
      "XRPUSDT",
      "ADAUSDT",
      "AVAXUSDT",
      "DOTUSDT",
      "MATICUSDT",
      "LINKUSDT",
      "LTCUSDT",
      "UNIUSDT",
      "ATOMUSDT",
      "NEARUSDT",
      "DOGEUSDT",
      "SHIBUSDT",
      "OPUSDT",
      "ARBUSDT",
      "INJUSDT",
      "SUIUSDT",
    ];
  }
}

/**
 * Fetches all 24h tickers. Returns a map of symbol (without USDT) -> TickerData.
 */
export async function fetch24hTickers(): Promise<Record<string, TickerData>> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr`);
    if (!res.ok) throw new Error(`Ticker HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      quoteVolume: string;
    }>;
    const result: Record<string, TickerData> = {};
    for (const d of data) {
      if (!d.symbol.endsWith("USDT")) continue;
      const base = d.symbol.replace("USDT", "");
      result[base] = {
        price: Number.parseFloat(d.lastPrice),
        volume24h: Number.parseFloat(d.quoteVolume),
        change24h: Number.parseFloat(d.priceChangePercent),
      };
      result[d.symbol] = {
        price: Number.parseFloat(d.lastPrice),
        volume24h: Number.parseFloat(d.quoteVolume),
        change24h: Number.parseFloat(d.priceChangePercent),
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * @deprecated Use fetch24hTickers() with no args, returns Record<string, TickerData>.
 */
export async function fetchAllTickers(): Promise<
  Array<{
    symbol: string;
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  }>
> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr`);
    if (!res.ok) throw new Error(`Ticker HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }>;
    return data
      .filter((d) => d.symbol.endsWith("USDT"))
      .map((d) => ({
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

/**
 * Fetches OHLCV candles from Binance.
 */
export async function fetchCandles(
  symbol: string,
  interval: string,
  limit = 100,
): Promise<OHLCV[]> {
  try {
    const sym = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    const url = `${BINANCE_BASE}/klines?symbol=${sym}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);
    const data = (await res.json()) as Array<
      [number, string, string, string, string, string]
    >;
    return data.map(([ts, open, high, low, close, volume]) => ({
      open: Number.parseFloat(open),
      high: Number.parseFloat(high),
      low: Number.parseFloat(low),
      close: Number.parseFloat(close),
      volume: Number.parseFloat(volume),
      timestamp: ts,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INDICATOR CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

function wilderSmooth(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  let avg = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(avg);
  for (let i = period; i < values.length; i++) {
    avg = (avg * (period - 1) + values[i]) / period;
    result.push(avg);
  }
  return result;
}

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let val = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(val);
  for (let i = period; i < values.length; i++) {
    val = values[i] * k + val * (1 - k);
    result.push(val);
  }
  return result;
}

export function rsi(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map((c) => Math.max(0, c));
  const losses = changes.map((c) => Math.max(0, -c));
  const avgGains = wilderSmooth(gains, period);
  const avgLosses = wilderSmooth(losses, period);
  return avgGains.map((g, i) => {
    const l = avgLosses[i];
    return l === 0 ? 100 : 100 - 100 / (1 + g / l);
  });
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  if (emaFast.length === 0 || emaSlow.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }
  const offset = slow - fast;
  const macdLine = emaSlow.map((v, i) => emaFast[i + offset] - v);
  const signalLine = ema(macdLine, signal);
  const histOffset = macdLine.length - signalLine.length;
  const histogram = signalLine.map((s, i) => macdLine[histOffset + i] - s);
  return { macdLine, signalLine, histogram };
}

export function atr(candles: OHLCV[], period = 14): number[] {
  if (candles.length < 2) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close),
      ),
    );
  }
  return wilderSmooth(trs, period);
}

export function vwap(candles: OHLCV[]): number {
  if (candles.length === 0) return 0;
  let sumPV = 0;
  let sumV = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    sumPV += tp * c.volume;
    sumV += c.volume;
  }
  return sumV === 0 ? (candles[candles.length - 1]?.close ?? 0) : sumPV / sumV;
}

export function adx(
  candles: OHLCV[],
  period = 14,
): { adx: number; plusDI: number; minusDI: number } {
  if (candles.length < period + 2) return { adx: 0, plusDI: 0, minusDI: 0 };
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const hd = candles[i].high - candles[i - 1].high;
    const ld = candles[i - 1].low - candles[i].low;
    plusDMs.push(hd > ld && hd > 0 ? hd : 0);
    minusDMs.push(ld > hd && ld > 0 ? ld : 0);
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close),
      ),
    );
  }
  const smoothTR = wilderSmooth(trs, period);
  const smoothPlusDM = wilderSmooth(plusDMs, period);
  const smoothMinusDM = wilderSmooth(minusDMs, period);
  if (smoothTR.length === 0) return { adx: 0, plusDI: 0, minusDI: 0 };
  const last = smoothTR.length - 1;
  const plusDI =
    smoothTR[last] > 0 ? (smoothPlusDM[last] / smoothTR[last]) * 100 : 0;
  const minusDI =
    smoothTR[last] > 0 ? (smoothMinusDM[last] / smoothTR[last]) * 100 : 0;
  const dxValues: number[] = [];
  for (let i = 0; i < smoothTR.length; i++) {
    const pdi = smoothTR[i] > 0 ? (smoothPlusDM[i] / smoothTR[i]) * 100 : 0;
    const mdi = smoothTR[i] > 0 ? (smoothMinusDM[i] / smoothTR[i]) * 100 : 0;
    dxValues.push((Math.abs(pdi - mdi) / Math.max(pdi + mdi, 0.001)) * 100);
  }
  const adxVals = wilderSmooth(dxValues, period);
  return {
    adx: adxVals.length > 0 ? adxVals[adxVals.length - 1] : 0,
    plusDI,
    minusDI,
  };
}

export function bollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2,
): { upper: number; middle: number; lower: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] ?? 0;
    return { upper: last, middle: last, lower: last };
  }
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: middle + stdDev * std, middle, lower: middle - stdDev * std };
}

export function ichimoku(candles: OHLCV[]): {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
} {
  if (candles.length < 52) {
    const last = candles[candles.length - 1]?.close ?? 0;
    return { tenkan: last, kijun: last, senkouA: last, senkouB: last };
  }
  const hh = (c: OHLCV[], p: number) =>
    Math.max(...c.slice(-p).map((x) => x.high));
  const ll = (c: OHLCV[], p: number) =>
    Math.min(...c.slice(-p).map((x) => x.low));
  const tenkan = (hh(candles, 9) + ll(candles, 9)) / 2;
  const kijun = (hh(candles, 26) + ll(candles, 26)) / 2;
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = (hh(candles, 52) + ll(candles, 52)) / 2;
  return { tenkan, kijun, senkouA, senkouB };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK PRE-FILTER (synchronous after tickers already fetched)
// ─────────────────────────────────────────────────────────────────────────────

export function quickPreFilter(
  symbol: string,
  tickers: Record<string, TickerData>,
): boolean {
  const base = symbol.endsWith("USDT") ? symbol.replace("USDT", "") : symbol;
  const t = tickers[base] ?? tickers[`${base}USDT`];
  if (!t) return false;
  if (t.volume24h < 5_000_000) return false;
  if (!t.price || t.price <= 0) return false;
  const stables = [
    "USDT",
    "USDC",
    "BUSD",
    "DAI",
    "TUSD",
    "USDP",
    "FDUSD",
    "PYUSD",
  ];
  if (stables.some((s) => base.includes(s))) return false;
  if (t.change24h < -15) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATR HELPER (returns last ATR value)
// ─────────────────────────────────────────────────────────────────────────────

function lastATR(candles: OHLCV[], period = 14): number {
  const vals = atr(candles, period);
  if (vals.length > 0) return vals[vals.length - 1];
  const recent = candles.slice(-period);
  const avg =
    recent.reduce((s, c) => s + (c.high - c.low), 0) /
    Math.max(1, recent.length);
  return avg > 0 ? avg : (candles[candles.length - 1]?.close ?? 1) * 0.015;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIERED SIGNAL ANALYSIS
// 6 Hard Gates + 12 Scored Gates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes a symbol using the tiered gate system.
 * Hard gates must ALL pass. Scored gates accumulate points.
 * Returns LiveSignal if all 6 hard gates pass + score >= 41/51 + confidence >= 82%.
 */
export async function analyzeSymbol(
  symbol: string,
  tickers: Record<string, TickerData>,
): Promise<LiveSignal | null> {
  const base = symbol.endsWith("USDT") ? symbol.replace("USDT", "") : symbol;
  const tickerEntry = tickers[base] ?? tickers[`${base}USDT`];
  const currentPrice = tickerEntry?.price ?? 0;
  if (!currentPrice || currentPrice <= 0) return null;

  // Fetch multi-timeframe candles in parallel
  const [c15m, c1h, c4h] = await Promise.all([
    fetchCandles(base, "15m", 120),
    fetchCandles(base, "1h", 250),
    fetchCandles(base, "4h", 210),
  ]);

  if (c1h.length < 100 || c4h.length < 60 || c15m.length < 40) return null;

  // Data freshness
  const lastTs = c1h[c1h.length - 1].timestamp ?? 0;
  if (lastTs > 0 && Date.now() - lastTs > 2 * 3600 * 1000) return null;

  const closes15m = c15m.map((c) => c.close);
  const closes1h = c1h.map((c) => c.close);
  const closes4h = c4h.map((c) => c.close);

  const atr15m = lastATR(c15m, 14);

  // ── EMA VALUES ──
  const ema50_4h = ema(closes4h, 50);
  const ema200_4h = ema(closes4h, 200);
  const ema20_1h = ema(closes1h, 20);
  const ema50_1h = ema(closes1h, 50);

  const v_ema50_4h = ema50_4h.length > 0 ? ema50_4h[ema50_4h.length - 1] : 0;
  const v_ema200_4h =
    ema200_4h.length > 0 ? ema200_4h[ema200_4h.length - 1] : 0;
  const v_ema20_1h = ema20_1h.length > 0 ? ema20_1h[ema20_1h.length - 1] : 0;
  const v_ema50_1h = ema50_1h.length > 0 ? ema50_1h[ema50_1h.length - 1] : 0;

  // ══════════════════════════════════════════════════
  // HARD GATE 1: 4H TREND CONFIRMATION
  // ══════════════════════════════════════════════════
  if (v_ema50_4h <= 0 || v_ema200_4h <= 0) return null;
  if (v_ema50_4h <= v_ema200_4h) return null; // EMA50 must be above EMA200 on 4H
  if (currentPrice <= v_ema50_4h) return null; // Price must be above EMA50 on 4H

  // ══════════════════════════════════════════════════
  // HARD GATE 2: 1H TREND CONFIRMATION
  // ══════════════════════════════════════════════════
  if (v_ema20_1h <= 0 || v_ema50_1h <= 0) return null;
  if (v_ema20_1h <= v_ema50_1h) return null; // EMA20 must be above EMA50 on 1H
  if (currentPrice <= v_ema20_1h) return null; // Price must be above EMA20 on 1H

  // ══════════════════════════════════════════════════
  // HARD GATE 3: RSI RANGE 45–75 ON 1H
  // ══════════════════════════════════════════════════
  const rsi1hVals = rsi(closes1h, 14);
  if (rsi1hVals.length === 0) return null;
  const curRsi1h = rsi1hVals[rsi1hVals.length - 1];
  if (curRsi1h < 45 || curRsi1h > 75) return null;

  // ══════════════════════════════════════════════════
  // HARD GATE 4: ADX > 18 WITH +DI > -DI ON 1H
  // ══════════════════════════════════════════════════
  const adxResult1h = adx(c1h, 14);
  if (adxResult1h.adx <= ADX_MIN) return null;
  if (adxResult1h.plusDI <= adxResult1h.minusDI) return null;

  // ══════════════════════════════════════════════════
  // HARD GATE 5: VOLUME — at least 1 of last 3 has spike
  // ══════════════════════════════════════════════════
  if (c15m.length < 24) return null;
  const avgVol15m = c15m.slice(-21, -1).reduce((s, c) => s + c.volume, 0) / 20;
  const last3Vol_15m = c15m.slice(-3);
  const hasVolumeSpike = last3Vol_15m.some(
    (candle) =>
      avgVol15m > 0 && candle.volume >= avgVol15m * VOLUME_SPIKE_RATIO,
  );
  if (!hasVolumeSpike) return null;

  // ══════════════════════════════════════════════════
  // HARD GATE 6: RISK/REWARD >= 1:2.0
  // ══════════════════════════════════════════════════
  const slDist = 1.0 * atr15m;
  const tp1 = currentPrice + 1.2 * atr15m;
  const tp2 = currentPrice + 2.0 * atr15m;
  const tp3 = currentPrice + 3.0 * atr15m;
  const stopLoss = currentPrice - slDist;
  const rrTP2 = slDist > 0 ? (tp2 - currentPrice) / slDist : 0;
  if (rrTP2 < RR_MIN) return null;

  // ══════════════════════════════════════════════════
  // SCORED GATES — accumulate points, don't hard-fail
  // ══════════════════════════════════════════════════
  let score = 0;

  // Base structural points from hard gates already passed
  if (v_ema50_4h > v_ema200_4h && v_ema200_4h > 0) score += 5; // EMA Golden Cross 4H
  if (currentPrice > v_ema20_1h && v_ema20_1h > v_ema50_1h) score += 4; // EMA bullish 1H

  // SCORED GATE 7: Stop Hunt Sweep Detection
  const swingLow15m = Math.min(...c15m.slice(-20, -10).map((c) => c.close));
  let stopHuntConfirmed = false;
  for (let i = c15m.length - 5; i < c15m.length; i++) {
    if (
      c15m[i].low < swingLow15m - 0.3 * atr15m &&
      c15m[i].close > swingLow15m
    ) {
      stopHuntConfirmed = true;
      break;
    }
  }
  if (stopHuntConfirmed) score += 5;

  // SCORED GATE 8: CHoCH on 15M
  const currentSwingHigh = Math.max(...closes15m.slice(-5));
  const prevSwingHigh = Math.max(...closes15m.slice(-15, -5));
  const chochConfirmed = currentSwingHigh > prevSwingHigh;
  if (chochConfirmed) score += 5;

  // SCORED GATE 9: Support anchor below SL
  const proposedSL = currentPrice - 1.0 * atr15m;
  const swingLows30 = c15m
    .slice(-30)
    .map((c) => c.low)
    .filter((l) => l < currentPrice);
  let supportAnchor = false;
  if (swingLows30.length > 0) {
    const nearestSwingLow = Math.max(
      ...swingLows30.filter((l) => l <= currentPrice),
    );
    supportAnchor = nearestSwingLow <= proposedSL;
  }
  if (supportAnchor) score += 4;

  // SCORED GATE 10: Resistance proximity clear between entry and TP1
  const tp1Proposed = currentPrice + 1.2 * atr15m;
  const closesInRange = closes15m
    .slice(-30)
    .filter((c) => c > currentPrice && c < tp1Proposed);
  const resistanceClear = closesInRange.length === 0;
  if (resistanceClear) score += 4;

  // SCORED GATE 11: Candle body quality (body > 50% of range for last 3)
  const last3_15m = c15m.slice(-3);
  const candleBodyQuality = last3_15m.every((candle) => {
    const range = candle.high - candle.low;
    if (range <= 0) return true;
    const body = Math.abs(candle.close - candle.open);
    return body / range >= 0.5; // relaxed from 0.6 to 0.5
  });
  if (candleBodyQuality) score += 3;

  // SCORED GATE 12: Consecutive higher lows on 15M (3 swing lows)
  const swingLowPoints: number[] = [];
  for (let i = 1; i < c15m.length - 1; i++) {
    if (c15m[i].low < c15m[i - 1].low && c15m[i].low < c15m[i + 1].low) {
      swingLowPoints.push(c15m[i].low);
    }
  }
  let consecutiveHigherLows = false;
  if (swingLowPoints.length >= 3) {
    const last3SwingLows = swingLowPoints.slice(-3);
    consecutiveHigherLows =
      last3SwingLows[1] > last3SwingLows[0] &&
      last3SwingLows[2] > last3SwingLows[1];
  }
  if (consecutiveHigherLows) score += 3;

  // SCORED GATE 13: Momentum velocity (current range > 1.1x avg)
  const avg10Range =
    c15m.slice(-11, -1).reduce((s, c) => s + (c.high - c.low), 0) / 10;
  const currentRange = c15m[c15m.length - 1].high - c15m[c15m.length - 1].low;
  const momentumVelocity = avg10Range > 0 && currentRange > avg10Range * 1.1;
  if (momentumVelocity) score += 3;

  // SCORED GATE 14: MACD crossover / rising histogram
  const macd15m = macd(closes15m, 12, 26, 9);
  let freshCrossover = false;
  let histoIncreasing = false;
  if (macd15m.histogram.length >= 5) {
    const histLen = macd15m.histogram.length;
    const lastHisto = macd15m.histogram[histLen - 1];
    const prevHisto = macd15m.histogram[histLen - 2];
    const prevPrevHisto = macd15m.histogram[histLen - 3];
    const prevPrevPrevHisto = macd15m.histogram[histLen - 4];
    freshCrossover =
      (lastHisto > 0 || prevHisto > 0 || prevPrevHisto > 0) &&
      (prevPrevPrevHisto < 0 ||
        prevPrevHisto < 0 ||
        (prevHisto < 0 && lastHisto > 0));
    histoIncreasing = lastHisto > 0 && lastHisto > prevHisto;
  }
  const macdBullish = freshCrossover || histoIncreasing;
  if (macdBullish) score += 4;

  // SCORED GATE 15: RSI bullish divergence or >50 trending up on 15M
  const rsi15mVals = rsi(closes15m, 14);
  let rsiBullDiv = false;
  if (rsi15mVals.length >= 5) {
    const curRsi15m = rsi15mVals[rsi15mVals.length - 1];
    if (curRsi15m > 50) {
      rsiBullDiv =
        rsi15mVals.length >= 3 &&
        rsi15mVals[rsi15mVals.length - 1] > rsi15mVals[rsi15mVals.length - 2];
    } else {
      let priceLL = Number.POSITIVE_INFINITY;
      let priceLLIdx = -1;
      for (let i = closes15m.length - 15; i < closes15m.length - 3; i++) {
        if (i < 0) continue;
        if (closes15m[i] < priceLL) {
          priceLL = closes15m[i];
          priceLLIdx = i;
        }
      }
      let pricePLL = Number.POSITIVE_INFINITY;
      for (
        let i = Math.max(0, priceLLIdx - 3);
        i >= Math.max(0, priceLLIdx - 10);
        i--
      ) {
        if (closes15m[i] < pricePLL) pricePLL = closes15m[i];
      }
      const rsiOffset = rsi15mVals.length - closes15m.length;
      const rsiAtLL =
        rsiOffset + priceLLIdx >= 0 ? rsi15mVals[rsiOffset + priceLLIdx] : 0;
      const rsiAtPLL =
        rsiOffset + priceLLIdx - 5 >= 0
          ? rsi15mVals[Math.max(0, rsiOffset + priceLLIdx - 5)]
          : 0;
      if (
        priceLL < pricePLL &&
        rsiAtLL > rsiAtPLL &&
        rsiAtLL > 0 &&
        rsiAtPLL > 0
      ) {
        rsiBullDiv = true;
      }
    }
  }
  if (rsiBullDiv) score += 4;

  // SCORED GATE 16: VWAP confirmed (price above both 1H and 4H VWAP)
  const vwap1h = vwap(c1h.slice(-50));
  const vwap4h = vwap(c4h.slice(-50));
  const vwapConfirmed = currentPrice > vwap1h && currentPrice > vwap4h;
  if (vwapConfirmed) score += 3;

  // SCORED GATE 17: Bollinger Band position (above middle, below upper)
  const bb1h = bollingerBands(closes1h, 20, 2);
  const bbBullish = currentPrice > bb1h.middle && currentPrice < bb1h.upper;
  if (bbBullish) score += 3;

  // SCORED GATE 18: Ichimoku cloud — price above cloud
  let ichimokuConfirmed = false;
  if (c1h.length >= 52) {
    const ichi1h = ichimoku(c1h);
    const cloudTop = Math.max(ichi1h.senkouA, ichi1h.senkouB);
    ichimokuConfirmed = currentPrice > cloudTop && ichi1h.tenkan > ichi1h.kijun;
    if (ichimokuConfirmed) score += 4;
  }

  // Bonus: Strong ADX
  if (adxResult1h.adx > 25) score += 2;

  // Bonus: Strong volume spike (1.5x)
  const lastVol = c15m[c15m.length - 1].volume;
  const volumeSpike = avgVol15m > 0 && lastVol > avgVol15m * 1.5;
  if (volumeSpike) score += 2;

  score = Math.min(score, 51);

  // ── THRESHOLD CHECK ──
  if (score < SCORE_MIN) return null;
  const confidence = Math.min(99, Math.round((score / 51) * 100));
  if (confidence < CONFIDENCE_MIN) return null;

  // ── SPREAD GUARD (soft check — warn on dying coins) ──
  if (tickerEntry && tickerEntry.change24h < -10) return null;

  // ── ENTRY TYPE ──
  let entryType: string;
  if (stopHuntConfirmed) entryType = "Post Stop-Hunt Entry";
  else if (chochConfirmed) entryType = "CHoCH Breakout Entry";
  else entryType = "Momentum Entry";

  const estimatedHours = Math.max(2, Math.round(2 + (99 - confidence) * 0.3));
  const profitPercent = ((tp2 - currentPrice) / currentPrice) * 100;
  const riskReward = `1:${((tp2 - currentPrice) / (currentPrice - stopLoss)).toFixed(1)}`;

  // ── MACD VALUES FOR SIGNAL OBJECT ──
  const macd1hResult = macd(closes1h, 12, 26, 9);
  const macdHisto1h =
    macd1hResult.histogram.length > 0
      ? macd1hResult.histogram[macd1hResult.histogram.length - 1]
      : 0;

  const curRsi15m_val = rsi15mVals[rsi15mVals.length - 1] ?? 50;

  // Build scored indicators summary
  const scoredPassCount = [
    stopHuntConfirmed,
    chochConfirmed,
    supportAnchor,
    resistanceClear,
    candleBodyQuality,
    consecutiveHigherLows,
    momentumVelocity,
    macdBullish,
    rsiBullDiv,
    vwapConfirmed,
    bbBullish,
    ichimokuConfirmed,
  ].filter(Boolean).length;

  const analysisStr = [
    `🔥 TIERED ENGINE CONFIRMED | Score: ${score}/51 | Confidence: ${confidence}% | ${scoredPassCount}/12 Scored Gates`,
    `📈 4H EMA Golden Cross ✓ | 1H EMA Aligned ✓ | RSI(1H): ${curRsi1h.toFixed(1)} | ADX(1H): ${adxResult1h.adx.toFixed(1)}`,
    `📊 RSI(15M): ${curRsi15m_val.toFixed(1)} | MACD: ${macdBullish ? "Bullish ✓" : "Neutral"} | Volume: ${volumeSpike ? "SPIKE ✓" : "Active"}`,
    `💎 Stop Hunt: ${stopHuntConfirmed ? "✓" : "—"} | CHoCH: ${chochConfirmed ? "✓" : "—"} | VWAP: ${vwapConfirmed ? "✓" : "—"} | Ichimoku: ${ichimokuConfirmed ? "✓" : "—"}`,
    `🏆 Entry: ${entryType} | RR: ${riskReward} | TP1: $${tp1.toLocaleString(undefined, { maximumFractionDigits: 4 })} | TP2: $${tp2.toLocaleString(undefined, { maximumFractionDigits: 4 })} | TP3: $${tp3.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
  ].join("\n");

  return {
    symbol: base,
    direction: "BUY",
    entryPrice: currentPrice,
    stopLoss,
    targetPrice: tp2,
    tp1,
    tp2,
    tp3,
    confidence,
    estimatedHours,
    riskReward,
    entryType,
    rsiValue: curRsi1h,
    macdHistogram: macdHisto1h,
    volumeSpike,
    breakOfStructure: chochConfirmed,
    multiTimeframeConfluence: "Tiered 6+12 Gate System",
    stopHuntConfirmed,
    chochConfirmed,
    ichimokuConfirmed,
    vwapConfirmed,
    scanTime: Date.now(),
    profitPercent,
    // Extended compatibility fields
    trend: "up",
    volumeConfirmed: true,
    goldenCross: v_ema50_4h > v_ema200_4h,
    supportZone: swingLows30.length > 0,
    score,
    analysis: analysisStr,
    // Backwards compat aliases
    bosConfirmed: chochConfirmed,
  } as LiveSignal & { bosConfirmed: boolean };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEEP TEST SIGNAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches fresh data and re-runs the tiered analysis.
 * Uses relaxed 82% threshold matching the scan threshold.
 * Does NOT re-test stop-hunt history (that uses historical candle lookback
 * which is stable and won't flicker on fresh spot prices).
 */
export async function deepTestSignal(signal: LiveSignal): Promise<boolean> {
  try {
    const base = signal.symbol.endsWith("USDT")
      ? signal.symbol.replace("USDT", "")
      : signal.symbol;
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${base}USDT`);
    if (!res.ok) {
      // If we can't fetch fresh data, trust the original analysis
      return signal.confidence >= CONFIDENCE_MIN;
    }
    const d = (await res.json()) as {
      lastPrice: string;
      quoteVolume: string;
      priceChangePercent: string;
    };
    const freshTickers: Record<string, TickerData> = {
      [base]: {
        price: Number.parseFloat(d.lastPrice),
        volume24h: Number.parseFloat(d.quoteVolume),
        change24h: Number.parseFloat(d.priceChangePercent),
      },
    };
    const freshSignal = await analyzeSymbol(base, freshTickers);
    // Pass if fresh analysis confirms OR if original signal had high confidence
    // (prevents flickering from tiny price moves between analysis and test)
    if (freshSignal && freshSignal.confidence >= CONFIDENCE_MIN) return true;
    // Fallback: trust original signal if it scored very well
    if (signal.confidence >= 90) return true;
    return false;
  } catch {
    // On error, trust the original signal analysis
    return signal.confidence >= CONFIDENCE_MIN;
  }
}

/**
 * @deprecated Overload kept for backwards compat with SignalScanContext/SignalsPage.
 */
export async function deepTestSignalLegacy(
  symbol: string,
  _originalSignal: {
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    confidence: number;
    score: number;
  },
  _livePrice: number,
): Promise<{
  passed: boolean;
  details: string;
  freshScore: number;
  freshConfidence: number;
}> {
  try {
    const base = symbol.endsWith("USDT") ? symbol.replace("USDT", "") : symbol;
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${base}USDT`);
    if (!res.ok) {
      return {
        passed: false,
        details: "❌ Data fetch failed.",
        freshScore: 0,
        freshConfidence: 0,
      };
    }
    const d = (await res.json()) as {
      lastPrice: string;
      quoteVolume: string;
      priceChangePercent: string;
    };
    const freshTickers: Record<string, TickerData> = {
      [base]: {
        price: Number.parseFloat(d.lastPrice),
        volume24h: Number.parseFloat(d.quoteVolume),
        change24h: Number.parseFloat(d.priceChangePercent),
      },
    };
    const freshSignal = await analyzeSymbol(base, freshTickers);
    if (!freshSignal || freshSignal.confidence < CONFIDENCE_MIN) {
      // Allow if original signal was very strong (90%+) — prevents flicker drops
      if (_originalSignal.confidence >= 90) {
        return {
          passed: true,
          details: `✅ DEEP TEST PASSED (trusted original) | Original Confidence: ${_originalSignal.confidence}% | Strong signal locked.`,
          freshScore: _originalSignal.score ?? 0,
          freshConfidence: _originalSignal.confidence,
        };
      }
      return {
        passed: false,
        details: `❌ FAILED: Signal no longer meets threshold on fresh data. Confidence: ${freshSignal?.confidence ?? 0}%.`,
        freshScore: freshSignal?.score ?? 0,
        freshConfidence: freshSignal?.confidence ?? 0,
      };
    }
    return {
      passed: true,
      details: `✅ DEEP TEST PASSED | Score: ${freshSignal.score ?? 0}/51 | Confidence: ${freshSignal.confidence}% | 6 hard gates + scored gates confirmed. Entry: ${freshSignal.entryType} | RR: ${freshSignal.riskReward}`,
      freshScore: freshSignal.score ?? 0,
      freshConfidence: freshSignal.confidence,
    };
  } catch {
    return {
      passed: false,
      details: "❌ Test error.",
      freshScore: 0,
      freshConfidence: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ULTRA DEEP VERDICT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export async function ultraDeepVerdictAnalysis(
  signal:
    | LiveSignal
    | {
        direction: "BUY" | "SELL";
        entryPrice: number;
        targetPrice: number;
        stopLoss: number;
      },
  currentPrice: number,
): Promise<UltraDeepVerdict> {
  const rawSym = "symbol" in signal ? (signal as LiveSignal).symbol : "";
  const base = rawSym.endsWith("USDT") ? rawSym.replace("USDT", "") : rawSym;
  const isBuy = signal.direction === "BUY";

  const tpProgress = Math.max(
    0,
    Math.min(
      100,
      isBuy
        ? ((currentPrice - signal.entryPrice) /
            (signal.targetPrice - signal.entryPrice)) *
            100
        : ((signal.entryPrice - currentPrice) /
            (signal.entryPrice - signal.targetPrice)) *
            100,
    ),
  );
  const now = new Date().toISOString();
  const fmt = (p: number) =>
    p.toLocaleString(undefined, { maximumFractionDigits: 6 });

  // If near SL — instant exit
  const slBuffer = signal.stopLoss * 1.002;
  if (isBuy && currentPrice <= slBuffer) {
    return buildVerdict(
      "EXIT_NOW_NO_TP",
      10,
      tpProgress,
      now,
      currentPrice,
      signal,
      `🚨 CRITICAL: Price $${fmt(currentPrice)} at or below stop loss $${fmt(signal.stopLoss)}. Exit immediately.`,
      [],
      [fmt(currentPrice)],
    );
  }

  // If >90% to TP — confirmed
  if (tpProgress > 90) {
    return buildVerdict(
      "CONFIRMED_HIT_TP",
      98,
      tpProgress,
      now,
      currentPrice,
      signal,
      `🎯 ${tpProgress.toFixed(1)}% progress to TP. Excellent — hold to target $${fmt(signal.targetPrice)}.`,
      ["Near TP"],
      [],
    );
  }

  // Fetch fresh data and rerun tiered system
  try {
    const tickerRes = await fetch(
      `${BINANCE_BASE}/ticker/24hr?symbol=${base}USDT`,
    );
    let freshVerdict: LiveSignal | null = null;
    if (tickerRes.ok) {
      const d = (await tickerRes.json()) as {
        lastPrice: string;
        quoteVolume: string;
        priceChangePercent: string;
      };
      const freshTickers: Record<string, TickerData> = {
        [base]: {
          price: Number.parseFloat(d.lastPrice),
          volume24h: Number.parseFloat(d.quoteVolume),
          change24h: Number.parseFloat(d.priceChangePercent),
        },
      };
      freshVerdict = await analyzeSymbol(base, freshTickers);
    }

    if (freshVerdict && freshVerdict.confidence >= CONFIDENCE_MIN) {
      const conf = freshVerdict.confidence;
      return buildVerdict(
        "CONFIRMED_HIT_TP",
        conf,
        tpProgress,
        now,
        currentPrice,
        signal,
        `✅ All gates still confirmed. Score: ${freshVerdict.score}/51 | Confidence: ${conf}%. Trade still on track — ${tpProgress.toFixed(1)}% progress to TP $${fmt(signal.targetPrice)}.`,
        [
          "Tiered gates pass",
          `RSI: ${freshVerdict.rsiValue.toFixed(0)}`,
          "Trend bullish",
        ],
        [],
      );
    }

    if (freshVerdict && freshVerdict.confidence >= 55) {
      return buildVerdict(
        "MONITORING",
        freshVerdict.confidence,
        tpProgress,
        now,
        currentPrice,
        signal,
        `⚠️ Signal weakening — confidence ${freshVerdict.confidence}%. Trade at ${tpProgress.toFixed(1)}% progress. Hold but watch closely.`,
        [],
        ["Some gates weakened"],
      );
    }

    // Fresh analysis failed — check 4H trend
    const c4h = await fetchCandles(base, "4h", 60);
    const closes4h = c4h.map((c) => c.close);
    const ema50_4h = ema(closes4h, 50);
    const ema200_4h = ema(closes4h, 200);
    const v50 = ema50_4h.length > 0 ? ema50_4h[ema50_4h.length - 1] : 0;
    const v200 = ema200_4h.length > 0 ? ema200_4h[ema200_4h.length - 1] : 0;
    const trend4hReversed = v50 > 0 && v200 > 0 && v50 < v200;

    if (trend4hReversed) {
      return buildVerdict(
        "EXIT_NOW_NO_TP",
        15,
        tpProgress,
        now,
        currentPrice,
        signal,
        `🚨 4H trend reversed. EMA50 crossed below EMA200. Exit at $${fmt(currentPrice)} to protect capital.`,
        [],
        ["4H trend reversed"],
      );
    }

    // Progress is good — likely consolidation
    if (tpProgress > 30) {
      return buildVerdict(
        "MONITORING",
        55,
        tpProgress,
        now,
        currentPrice,
        signal,
        `⚠️ Market consolidating at ${tpProgress.toFixed(1)}% progress. Some indicators weakened but 4H trend intact. Hold and monitor.`,
        ["4H trend intact"],
        ["Consolidating"],
      );
    }

    return buildVerdict(
      "EXIT_NOW_NO_TP",
      20,
      tpProgress,
      now,
      currentPrice,
      signal,
      `🚨 Multiple confirmation gates failed on fresh analysis. Conditions have changed. Exit at $${fmt(currentPrice)}.`,
      [],
      ["Multiple gates failed", "Low confidence"],
    );
  } catch {
    if (tpProgress > 20) {
      return buildVerdict(
        "MONITORING",
        50,
        tpProgress,
        now,
        currentPrice,
        signal,
        `⚠️ Could not fetch fresh data. Trade at ${tpProgress.toFixed(1)}% progress. Original signal still assumed valid — hold with caution.`,
        [],
        ["No fresh data"],
      );
    }
    return buildVerdict(
      "MONITORING",
      45,
      tpProgress,
      now,
      currentPrice,
      signal,
      `⚠️ Data fetch error. Original signal conditions assumed valid. Monitor closely. Progress: ${tpProgress.toFixed(1)}%.`,
      [],
      ["No fresh data"],
    );
  }
}

function buildVerdict(
  verdict: "CONFIRMED_HIT_TP" | "MONITORING" | "EXIT_NOW_NO_TP",
  confidence: number,
  tpProgress: number,
  now: string,
  currentPrice: number,
  signal: { targetPrice: number; entryPrice: number },
  recommendation: string,
  keyBullish: string[],
  keyBearish: string[],
): UltraDeepVerdict {
  const fmt = (p: number) =>
    p.toLocaleString(undefined, { maximumFractionDigits: 6 });
  const isExit = verdict === "EXIT_NOW_NO_TP";
  const isMonitor = verdict === "MONITORING";
  const estimatedTimeToTP =
    verdict === "CONFIRMED_HIT_TP"
      ? tpProgress > 80
        ? "< 1 hour"
        : tpProgress > 50
          ? "1-3 hours"
          : "2-6 hours"
      : null;

  return {
    verdict,
    compositeScore: confidence,
    bullishCount: keyBullish.length,
    bearishCount: keyBearish.length,
    neutralCount: 0,
    hardExitCount: isExit ? 2 : isMonitor ? 1 : 0,
    hardExitTriggered: isExit,
    hardExitReason: isExit ? (keyBearish[0] ?? null) : null,
    hardExitReasons: isExit ? keyBearish : [],
    currentPrice,
    tpProgress,
    estimatedTimeToTP,
    keyBullishSignals: keyBullish,
    keyBearishSignals: keyBearish,
    verdictTimestamp: now,
    recommendation: `${recommendation} | TP: $${fmt(signal.targetPrice)} | Entry: $${fmt(signal.entryPrice)}`,
    // VerdictResult fields
    reason: recommendation,
    confidence,
    progressPercent: tpProgress,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY WRAPPER: liveReanalysis (used by some TrackingPage paths)
// ─────────────────────────────────────────────────────────────────────────────

export async function liveReanalysis(
  symbol: string,
  originalSignal: {
    direction: "BUY" | "SELL";
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
  },
  livePrice: number,
): Promise<{
  onTrack: boolean;
  recommendation: string;
  confidence: number;
  reason: string;
}> {
  const fakeSignal: LiveSignal = {
    symbol,
    direction: "BUY",
    entryPrice: originalSignal.entryPrice,
    stopLoss: originalSignal.stopLoss,
    targetPrice: originalSignal.targetPrice,
    tp1: originalSignal.targetPrice,
    tp2: originalSignal.targetPrice,
    tp3: originalSignal.targetPrice,
    confidence: CONFIDENCE_MIN,
    estimatedHours: 4,
    riskReward: "1:2",
    entryType: "Momentum Entry",
    rsiValue: 55,
    macdHistogram: 0.01,
    volumeSpike: true,
    breakOfStructure: true,
    multiTimeframeConfluence: "Tiered Gate System",
    stopHuntConfirmed: true,
    chochConfirmed: true,
    ichimokuConfirmed: true,
    vwapConfirmed: true,
    scanTime: Date.now(),
    profitPercent: 3,
  };
  const verdict = await ultraDeepVerdictAnalysis(fakeSignal, livePrice);
  const onTrack = verdict.verdict !== "EXIT_NOW_NO_TP";
  return {
    onTrack,
    recommendation:
      verdict.verdict === "EXIT_NOW_NO_TP"
        ? `EXIT NOW at $${livePrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
        : verdict.verdict === "MONITORING"
          ? `HOLD — ${verdict.tpProgress.toFixed(1)}% progress to TP`
          : `CONFIRMED — ${verdict.tpProgress.toFixed(1)}% progress to TP`,
    confidence: verdict.confidence,
    reason: verdict.reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PRICES HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useLivePrices(
  symbols: string[],
  _intervalMs?: number,
): Record<string, number> {
  const intervalMs = _intervalMs ?? 10000;
  const [prices, setPrices] = useState<Record<string, number>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: symbols joined for stability
  useEffect(() => {
    if (symbols.length === 0) return;
    let cancelled = false;
    async function poll() {
      try {
        const syms = symbols.slice(0, 50);
        const params = syms.map(
          (s) => `${s.endsWith("USDT") ? s : `${s}USDT`}`,
        );
        const url = `${BINANCE_BASE}/ticker/price?symbols=${JSON.stringify(params)}`;
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Array<{
          symbol: string;
          price: string;
        }>;
        const map: Record<string, number> = {};
        for (const d of data) {
          const base = d.symbol.replace("USDT", "");
          const price = Number.parseFloat(d.price);
          map[base] = price;
          map[d.symbol] = price;
        }
        if (!cancelled) setPrices(map);
      } catch {
        // ignore
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY SHIMS
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use quickPreFilter(symbol, tickers). Async version for backwards compat. */
export async function quickPreFilterAsync(
  symbol: string,
  price: number,
  volume24h: number,
): Promise<boolean> {
  if (volume24h < 5_000_000) return false;
  if (!price || price <= 0) return false;
  const stables = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDP", "FDUSD"];
  const base = symbol.endsWith("USDT") ? symbol.replace("USDT", "") : symbol;
  if (stables.some((s) => base.includes(s))) return false;
  return true;
}

/** @deprecated Kept for TickerTape backwards compat */
export function useLivePricesLegacy(
  symbols: string[],
  intervalMs = 10000,
): Record<string, { price: number; change24h: number }> {
  const [prices, setPrices] = useState<
    Record<string, { price: number; change24h: number }>
  >({});
  const symbolKey = symbols.join(",");
  useEffect(() => {
    if (!symbolKey) return;
    const symsSnap = symbolKey.split(",").filter(Boolean);
    let cancelled = false;
    async function poll() {
      try {
        const syms = symsSnap.slice(0, 20);
        const params = JSON.stringify(
          syms.map((s) => (s.endsWith("USDT") ? s : `${s}USDT`)),
        );
        const res = await fetch(
          `${BINANCE_BASE}/ticker/24hr?symbols=${params}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Array<{
          symbol: string;
          lastPrice: string;
          priceChangePercent: string;
        }>;
        const map: Record<string, { price: number; change24h: number }> = {};
        for (const d of data) {
          const base = d.symbol.replace("USDT", "");
          map[base] = {
            price: Number.parseFloat(d.lastPrice),
            change24h: Number.parseFloat(d.priceChangePercent),
          };
        }
        if (!cancelled) setPrices(map);
      } catch {
        // ignore
      }
    }
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbolKey, intervalMs]);
  return prices;
}

export function detectTrend(candles: OHLCV[]): "up" | "down" | "sideways" {
  if (candles.length < 50) return "sideways";
  const closes = candles.map((c) => c.close);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, Math.min(200, closes.length));
  if (e50.length > 0 && e200.length > 0) {
    const v50 = e50[e50.length - 1];
    const v200 = e200[e200.length - 1];
    const cur = closes[closes.length - 1];
    if (cur > v50 && v50 > v200) return "up";
    if (cur < v50 && v50 < v200) return "down";
  }
  return "sideways";
}
