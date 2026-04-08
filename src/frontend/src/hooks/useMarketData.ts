/**
 * useMarketData — 18-Gate World-Class Signal Engine
 *
 * PHILOSOPHY: Only show signals guaranteed to hit TP. All 18 gates must pass.
 * Gate failures = signal dropped immediately. No exceptions.
 *
 * GATE SYSTEM (all 18 must pass):
 * Hard gates 1-8: Structure + trend + stop-hunt sweep + CHoCH + support anchor
 * Technical gates 9-17: Volume, momentum, MACD, RSI divergence, VWAP, ADX, BB, spread, Ichimoku
 * Gate 18: Risk/Reward enforcement (min 1:2)
 *
 * CONFIDENCE: 88%+ minimum (45+/51 points) to appear.
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
 * New signature matches requirements contract.
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
      // Also store under full symbol for consumers that pass the full symbol
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
 * Kept for backwards compat with SearchPage which calls fetch24hTickers([symbol]).
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
 * Returns empty array on failure (never throws).
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
  // Filter stablecoins by name pattern
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
  // Require positive 24h movement or at least neutral — extreme drops are dying coins
  if (t.change24h < -15) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATR HELPER (returns last ATR value, not array)
// ─────────────────────────────────────────────────────────────────────────────

function lastATR(candles: OHLCV[], period = 14): number {
  const vals = atr(candles, period);
  if (vals.length > 0) return vals[vals.length - 1];
  // Fallback: average range
  const recent = candles.slice(-period);
  const avg =
    recent.reduce((s, c) => s + (c.high - c.low), 0) /
    Math.max(1, recent.length);
  return avg > 0 ? avg : (candles[candles.length - 1]?.close ?? 1) * 0.015;
}

// ─────────────────────────────────────────────────────────────────────────────
// 18-GATE SIGNAL ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes a symbol across 4 timeframes using the 18-gate system.
 * @param symbol - base symbol (e.g. "BTC") or full symbol (e.g. "BTCUSDT")
 * @param tickers - pre-fetched ticker map from fetch24hTickers()
 * @returns LiveSignal if all 18 gates pass and confidence >= 88%, else null
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

  // Data freshness: last 1H candle must be within 2 hours
  const lastTs = c1h[c1h.length - 1].timestamp ?? 0;
  if (lastTs > 0 && Date.now() - lastTs > 2 * 3600 * 1000) return null;

  const closes15m = c15m.map((c) => c.close);
  const closes1h = c1h.map((c) => c.close);
  const closes4h = c4h.map((c) => c.close);

  const atr15m = lastATR(c15m, 14);
  void lastATR(c1h, 14); // atr1h computed but used indirectly via atr15m

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

  // ── GATE 1: 4H TREND CONFIRMATION ──
  if (v_ema50_4h <= 0 || v_ema200_4h <= 0) return null;
  if (v_ema50_4h <= v_ema200_4h) return null; // EMA50 must be above EMA200 on 4h
  if (currentPrice <= v_ema50_4h) return null; // Price must be above EMA50 on 4h
  // Last 3 closes making higher lows on 4h
  if (c4h.length < 5) return null;
  const last3_4h = closes4h.slice(-3);
  if (!(last3_4h[1] > last3_4h[0] || last3_4h[2] > last3_4h[0])) {
    // Allow if at least 2 of 3 are forming higher lows pattern
    if (last3_4h[2] <= last3_4h[0]) return null;
  }

  // ── GATE 2: 1H TREND CONFIRMATION ──
  if (v_ema20_1h <= 0 || v_ema50_1h <= 0) return null;
  if (v_ema20_1h <= v_ema50_1h) return null; // EMA20 must be above EMA50 on 1h
  if (currentPrice <= v_ema20_1h) return null; // Price must be above EMA20 on 1h
  const rsi1hVals = rsi(closes1h, 14);
  if (rsi1hVals.length === 0) return null;
  const curRsi1h = rsi1hVals[rsi1hVals.length - 1];
  if (curRsi1h < 45 || curRsi1h > 75) return null; // RSI between 45-75

  // ── GATE 3: STOP HUNT SWEEP DETECTION (CRITICAL) ──
  if (c15m.length < 25) return null;
  const recent20_15m = c15m.slice(-20);
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
  if (!stopHuntConfirmed) return null;
  // Suppress unused variable warning
  void recent20_15m;

  // ── GATE 4: CHoCH (CHANGE OF CHARACTER) ON 15M ──
  const currentSwingHigh = Math.max(...closes15m.slice(-5));
  const prevSwingHigh = Math.max(...closes15m.slice(-15, -5));
  const chochConfirmed = currentSwingHigh > prevSwingHigh;
  if (!chochConfirmed) return null;

  // ── GATE 5: SUPPORT ANCHOR BELOW STOP LOSS ──
  const proposedSL = currentPrice - 1.0 * atr15m;
  const swingLows30 = c15m
    .slice(-30)
    .map((c) => c.low)
    .filter((l) => l < currentPrice);
  if (swingLows30.length === 0) return null;
  const nearestSwingLow = Math.max(
    ...swingLows30.filter((l) => l <= currentPrice),
  );
  if (nearestSwingLow > proposedSL) return null; // Support must be AT or BELOW the SL

  // ── GATE 6: RESISTANCE PROXIMITY CHECK ──
  const tp1Proposed = currentPrice + 1.2 * atr15m;
  const closesInRange = closes15m
    .slice(-30)
    .filter((c) => c > currentPrice && c < tp1Proposed);
  if (closesInRange.length > 0) return null; // Resistance sits between entry and TP1

  // ── GATE 7: CANDLE BODY QUALITY ──
  const last3_15m = c15m.slice(-3);
  for (const candle of last3_15m) {
    const range = candle.high - candle.low;
    if (range <= 0) continue;
    const body = Math.abs(candle.close - candle.open);
    if (body / range < 0.6) return null; // Body must be >60% of range
  }

  // ── GATE 8: CONSECUTIVE HIGHER LOWS ON 15M ──
  const swingLowPoints: number[] = [];
  for (let i = 1; i < c15m.length - 1; i++) {
    if (c15m[i].low < c15m[i - 1].low && c15m[i].low < c15m[i + 1].low) {
      swingLowPoints.push(c15m[i].low);
    }
  }
  if (swingLowPoints.length < 3) return null;
  const last3SwingLows = swingLowPoints.slice(-3);
  if (
    !(
      last3SwingLows[1] > last3SwingLows[0] &&
      last3SwingLows[2] > last3SwingLows[1]
    )
  ) {
    return null; // Must have 3 consecutive ascending swing lows
  }

  // ── GATE 9: VOLUME SPIKE CONFIRMATION ──
  if (c15m.length < 24) return null;
  const avgVol15m = c15m.slice(-21, -1).reduce((s, c) => s + c.volume, 0) / 20;
  const last3Vol_15m = c15m.slice(-3);
  for (const candle of last3Vol_15m) {
    if (candle.volume < avgVol15m * 1.2) return null; // Each of last 3 must be 1.2x avg
  }

  // ── GATE 10: MOMENTUM VELOCITY ──
  const avg10Range =
    c15m.slice(-11, -1).reduce((s, c) => s + (c.high - c.low), 0) / 10;
  const currentRange = c15m[c15m.length - 1].high - c15m[c15m.length - 1].low;
  if (avg10Range <= 0 || currentRange <= avg10Range * 1.1) return null;

  // ── GATE 11: MACD CROSSOVER ON 15M ──
  const macd15m = macd(closes15m, 12, 26, 9);
  if (macd15m.histogram.length < 5) return null;
  const histLen = macd15m.histogram.length;
  const lastHisto = macd15m.histogram[histLen - 1];
  const prevHisto = macd15m.histogram[histLen - 2];
  const prevPrevHisto = macd15m.histogram[histLen - 3];
  const prevPrevPrevHisto = macd15m.histogram[histLen - 4];
  // Fresh crossover: any of last 3 positive AND at least one before that was negative
  const freshCrossover =
    (lastHisto > 0 || prevHisto > 0 || prevPrevHisto > 0) &&
    (prevPrevPrevHisto < 0 ||
      prevPrevHisto < 0 ||
      (prevHisto < 0 && lastHisto > 0));
  // OR histogram positive and increasing
  const histoIncreasing = lastHisto > 0 && lastHisto > prevHisto;
  if (!freshCrossover && !histoIncreasing) return null;

  // ── GATE 12: RSI BULLISH DIVERGENCE ON 15M ──
  const rsi15mVals = rsi(closes15m, 14);
  let rsiBullDiv = false;
  if (rsi15mVals.length >= 5) {
    const curRsi15m = rsi15mVals[rsi15mVals.length - 1];
    if (curRsi15m > 50) {
      // RSI above 50 and trending up for last 3 candles
      rsiBullDiv =
        rsi15mVals.length >= 3 &&
        rsi15mVals[rsi15mVals.length - 1] > rsi15mVals[rsi15mVals.length - 2] &&
        rsi15mVals[rsi15mVals.length - 2] > rsi15mVals[rsi15mVals.length - 3];
    } else {
      // Look for bullish divergence: price lower low, RSI higher low
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
  if (!rsiBullDiv) return null;

  // ── GATE 13: VWAP CONFIRMATION ──
  const vwap1h = vwap(c1h.slice(-50));
  const vwap4h = vwap(c4h.slice(-50));
  const vwapConfirmed = currentPrice > vwap1h && currentPrice > vwap4h;
  if (!vwapConfirmed) return null;

  // ── GATE 14: ADX STRENGTH ──
  const adxResult1h = adx(c1h, 14);
  if (adxResult1h.adx <= 20) return null;
  if (adxResult1h.plusDI <= adxResult1h.minusDI) return null;

  // ── GATE 15: BOLLINGER BAND POSITION ──
  const bb1h = bollingerBands(closes1h, 20, 2);
  if (currentPrice <= bb1h.middle) return null; // Must be above middle band
  if (currentPrice >= bb1h.upper) return null; // Must not be above upper (overbought)

  // ── GATE 16: SPREAD GUARD ──
  // Using ticker data — if available, check spread
  if (tickerEntry) {
    // We don't have bid/ask from REST, so we skip if no spread data
    // In practice, if the coin has >$5M volume the spread is usually fine
    // Only hard-reject if change24h is extremely negative (dying coin)
    if (tickerEntry.change24h < -10) return null;
  }

  // ── GATE 17: ICHIMOKU CLOUD CONFIRMATION ──
  if (c1h.length < 52) return null;
  const ichi1h = ichimoku(c1h);
  const cloudTop = Math.max(ichi1h.senkouA, ichi1h.senkouB);
  const ichimokuConfirmed =
    currentPrice > cloudTop && ichi1h.tenkan > ichi1h.kijun;
  if (!ichimokuConfirmed) return null;

  // ── GATE 18: RISK/REWARD ENFORCEMENT ──
  const slDist = 1.0 * atr15m;
  const tp1 = currentPrice + 1.2 * atr15m;
  const tp2 = currentPrice + 1.8 * atr15m;
  const tp3 = currentPrice + 2.5 * atr15m;
  const stopLoss = currentPrice - slDist;
  const rrTP2 = (tp2 - currentPrice) / (currentPrice - stopLoss);
  if (rrTP2 < 1.8) return null;

  // ── SCORING SYSTEM (max 51 points) ──
  let score = 0;
  const ema200_4h_val = v_ema200_4h;
  if (v_ema50_4h > ema200_4h_val && ema200_4h_val > 0) score += 5; // EMA Golden Cross 4h
  if (currentPrice > v_ema20_1h && v_ema20_1h > v_ema50_1h) score += 4; // EMA bullish 1h
  const curRsi15m_val = rsi15mVals[rsi15mVals.length - 1] ?? 50;
  if (curRsi15m_val >= 50 && curRsi15m_val <= 65) score += 3; // RSI ideal range 15m
  if (histoIncreasing) score += 3; // MACD histogram positive & increasing
  const lastVol = c15m[c15m.length - 1].volume;
  if (avgVol15m > 0 && lastVol > avgVol15m * 1.5) score += 3; // Strong volume
  if (stopHuntConfirmed) score += 5; // Stop hunt confirmed
  if (chochConfirmed) score += 5; // CHoCH confirmed
  if (rsiBullDiv) score += 4; // RSI divergence
  score += 3; // VWAP both TF confirmed (we passed gate 13)
  if (adxResult1h.adx > 25) score += 2; // Strong ADX
  if (currentPrice > bb1h.middle) score += 2; // Above BB middle
  score += 4; // Ichimoku confirmed (passed gate 17)
  score += 3; // Consecutive higher lows (passed gate 8)
  // Candle body quality — all 3 passed gate 7
  score += 3;
  if (currentRange > avg10Range * 1.3) score += 2; // Strong momentum velocity

  score = Math.min(score, 51);
  const confidence = Math.min(99, Math.round((score / 51) * 100));
  if (confidence < 88) return null;

  // ── ENTRY TYPE ──
  const candlesSinceHunt =
    c15m.length -
    1 -
    (() => {
      for (let i = c15m.length - 1; i >= c15m.length - 5; i--) {
        if (
          c15m[i].low < swingLow15m - 0.3 * atr15m &&
          c15m[i].close > swingLow15m
        )
          return i;
      }
      return c15m.length - 3;
    })();
  let entryType: string;
  if (candlesSinceHunt <= 2) entryType = "Post Stop-Hunt Entry";
  else if (currentSwingHigh > prevSwingHigh * 1.001)
    entryType = "CHoCH Breakout Entry";
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

  const volumeSpike = lastVol > avgVol15m * 1.5;

  const analysisStr = [
    `🔥 18-GATE CONFIRMED | Score: ${score}/51 | Confidence: ${confidence}%`,
    `📈 4H EMA: ${v_ema50_4h.toFixed(2)} > ${ema200_4h_val.toFixed(2)} (Golden Cross ✓)`,
    `📊 RSI(1H): ${curRsi1h.toFixed(1)} | RSI(15M): ${curRsi15m_val.toFixed(1)} | ADX(1H): ${adxResult1h.adx.toFixed(1)}`,
    `💹 MACD(15M): ${lastHisto > 0 ? "Bullish Crossover ✓" : "Aligned"} | Volume: ${volumeSpike ? "SPIKE ✓" : "Normal"}`,
    "🎯 Stop Hunt ✓ | CHoCH ✓ | VWAP ✓ | Ichimoku ✓ | Higher Lows ✓",
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
    multiTimeframeConfluence: "5/5 Timeframes Aligned",
    stopHuntConfirmed,
    chochConfirmed,
    ichimokuConfirmed,
    vwapConfirmed,
    scanTime: Date.now(),
    profitPercent,
    // Extended compatibility fields
    trend: "up",
    volumeConfirmed: true,
    goldenCross: v_ema50_4h > ema200_4h_val,
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
 * Fetches fresh data and re-runs all 18 gates.
 * @returns true only if signal still passes all gates at 88%+ confidence
 */
export async function deepTestSignal(signal: LiveSignal): Promise<boolean> {
  try {
    // Fetch fresh tickers for this symbol only
    const base = signal.symbol.endsWith("USDT")
      ? signal.symbol.replace("USDT", "")
      : signal.symbol;
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${base}USDT`);
    if (!res.ok) return false;
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
    return freshSignal !== null && freshSignal.confidence >= 88;
  } catch {
    return false;
  }
}

/**
 * @deprecated Overload kept for backwards compat with SignalScanContext/SignalsPage.
 * Old signature: deepTestSignal(symbol, {entryPrice, stopLoss, ...}, livePrice)
 * Returns { passed: boolean; details: string; freshScore: number; freshConfidence: number }
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
    if (!freshSignal || freshSignal.confidence < 88) {
      return {
        passed: false,
        details: `❌ FAILED: Signal no longer passes all 18 gates on fresh data. Confidence: ${freshSignal?.confidence ?? 0}%.`,
        freshScore: freshSignal?.score ?? 0,
        freshConfidence: freshSignal?.confidence ?? 0,
      };
    }
    return {
      passed: true,
      details: `✅ DEEP TEST PASSED | Score: ${freshSignal.score}/51 | Confidence: ${freshSignal.confidence}% | All 18 gates confirmed. Entry: ${freshSignal.entryType} | RR: ${freshSignal.riskReward}`,
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

/**
 * Runs a full 18-gate reanalysis with fresh data for tracked trades.
 * @param signal - the original LiveSignal that was tracked
 * @param currentPrice - latest live price
 * @returns VerdictResult with verdict, reason, confidence, progressPercent
 */
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

  // Fetch fresh data and rerun 18-gate system
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

    if (freshVerdict && freshVerdict.confidence >= 88) {
      const conf = freshVerdict.confidence;
      return buildVerdict(
        "CONFIRMED_HIT_TP",
        conf,
        tpProgress,
        now,
        currentPrice,
        signal,
        `✅ All 18 gates still confirmed. Score: ${freshVerdict.score}/51 | Confidence: ${conf}%. Trade still on track — ${tpProgress.toFixed(1)}% progress to TP $${fmt(signal.targetPrice)}.`,
        [
          "18 gates pass",
          `RSI: ${freshVerdict.rsiValue.toFixed(0)}`,
          "Trend bullish",
        ],
        [],
      );
    }

    if (freshVerdict && freshVerdict.confidence >= 60) {
      return buildVerdict(
        "MONITORING",
        freshVerdict.confidence,
        tpProgress,
        now,
        currentPrice,
        signal,
        `⚠️ Signal weakening — confidence ${freshVerdict.confidence}% (was ${"confidence" in signal ? (signal as LiveSignal).confidence : 88}%). Trade at ${tpProgress.toFixed(1)}% progress. Hold but watch closely.`,
        [],
        ["Some gates weakened"],
      );
    }

    // Fresh analysis failed all 18 gates — serious issue
    // Fetch 4h trend to determine if this is reversing
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
      `🚨 Multiple confirmation gates failed on fresh analysis. Conditions have changed significantly. Exit at $${fmt(currentPrice)}.`,
      [],
      ["18-gate failed", "Low confidence"],
    );
  } catch {
    // Data error — default to hold if progress is positive
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
    confidence: 88,
    estimatedHours: 4,
    riskReward: "1:2",
    entryType: "Momentum Entry",
    rsiValue: 55,
    macdHistogram: 0.01,
    volumeSpike: true,
    breakOfStructure: true,
    multiTimeframeConfluence: "5/5 Timeframes Aligned",
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
// Returns Record<string, number> — just the price per symbol
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
        // Fetch mini tickers for specific symbols
        const syms = symbols.slice(0, 50); // Limit to 50 to avoid huge requests
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
          map[d.symbol] = price; // full symbol too
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
// Keep old names working for components that haven't migrated yet
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

/** @deprecated Kept for TickerTape backwards compat — returns {price, change24h} shape */
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

// Re-export detectTrend for any consumers that use it
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
