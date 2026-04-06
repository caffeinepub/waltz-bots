# Waltz Bots — Signal Engine Rebuild for 80-90% Win Rate

## Current State
- Signal engine fetches real OHLCV from Binance, uses 15 hard gates (EMA Golden Cross, 4H trend, RSI, MACD crossover, BoS, volume spike, pullback guard, support zone, etc.)
- Score threshold: 9/15, confidence minimum: 82%
- Scans all 1800+ Binance USDT pairs via a 3-step pipeline (volume filter → quick pre-filter → full analysis)
- Signals appear on SignalsPage, no expiry logic
- No win rate tracker shown on the UI
- TrackingPage has Mark TP Hit / Mark SL Hit buttons, Update Verdict runs liveReanalysis()
- Tracked trades store win/loss in tradeHistory via localStorage

## Requested Changes (Diff)

### Add
- **Signal expiry**: each signal has a generatedAt timestamp. After 8 hours, the signal is silently removed from the displayed list (no record, no toast, just disappears).
- **Win rate tracker widget** on the SignalsPage: visible to all users, pulls win/loss data from `wb_trade_analysis_<uid>` localStorage key. Shows: total trades, wins, losses, win rate %. Updates live.
- **Momentum-first filter**: signals only fire when price is already actively moving with volume (not just positioned for a potential move). Require that the last 3 candles on 1h are trending in the signal direction AND volume is above average.
- **Short TP timeframe**: ATR-based TP sized for 2-8 hour completion. Use tighter ATR multipliers (TP = 1.2–1.8x ATR instead of 2.2x) so targets are realistically reachable within hours not days. Estimated hours must be capped at 8h max.
- **Score threshold tuned for 5-15 signals**: lower score gate from 9/15 to 7/15 but add the momentum-first checks as hard gates. This trades one strict filter type for another — same quality bar, more throughput.

### Modify
- `useMarketData.ts` — `analyzeSymbol()`: reduce TP multiplier from 2.2x ATR to between 1.2x–1.8x ATR depending on volatility. Cap `estimatedHours` at 8. Add 3-candle momentum check as hard gate. Reduce score gate to 7/15.
- `useMarketData.ts` — `quickPreFilter()`: keep existing pre-filter logic, no changes needed.
- `SignalScanContext.tsx` — stream signals immediately as found (already doing this), no structural changes needed.
- `SignalsPage.tsx` — add win rate tracker widget above the filter tabs. Widget reads from `wb_trade_analysis_<uid>` (or `wb_trade_analysis_guest`). Show: Win Rate %, Wins, Losses, Total. Refresh every 30 seconds.
- `SignalsPage.tsx` — add signal expiry logic: filter out any signal where `Date.now() - signal.generatedAt > 8 * 3600 * 1000` before rendering. No toast, no record — just silently removed from the displayed list.

### Remove
- Nothing removed from existing functionality

## Implementation Plan
1. Modify `useMarketData.ts` — `analyzeSymbol()`:
   - Add 3-candle momentum hard gate: last 3 closes on 1h must all be above their respective opens (bullish momentum underway) OR last 3 closes must form consecutive higher closes.
   - Reduce TP multiplier: use `Math.max(atr1h * 1.2, stopDistance * 2.0)` for volatile coins (atrPct > 2%) and `atr1h * 1.5` for less volatile ones.
   - Cap `estimatedHours` at 8.
   - Lower score gate from 9 to 7 (momentum gate now compensates).
   - Confidence minimum stays at 82%.
2. Modify `SignalsPage.tsx`:
   - Add win rate tracker widget: reads localStorage `wb_trade_analysis_<uid>`, computes stats, displays in a card above filter tabs. Auto-refreshes every 30s.
   - Add expiry filter: before rendering, filter out signals older than 8h.
3. No changes needed to `SignalScanContext.tsx`, `TrackingPage.tsx`, or backend.
