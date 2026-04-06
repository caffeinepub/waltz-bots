# Waltz Bots

## Current State

- **TrackingPage.tsx**: Shows tracked trades with live price, TP Hit banner (auto), Remove button, AI verdict, Update Verdict button (re-runs analyzeSymbol), and AI chat per card. No manual "mark as TP hit" or "mark as SL hit" buttons. No trade outcome (win/loss) recording. No deep analysis log.
- **SignalsPage.tsx**: Shows signals filtered at confidence >= 45%. Does not filter out signals that historically hit stop loss. No SL-blacklist logic.
- **FeedbackPage.tsx + AdminPanel FeedbackAdminTab**: AI generates a solution (rule-based). Admin can approve/reject. Approving simply marks status as "approved" — no action is taken on the app when approved. No upgrade/improvement log linked to approvals.
- **AuthContext.tsx**: tradeHistory stores { total, wins, losses } per user. updateProfile saves to localStorage.
- **SignalScanContext.tsx**: Scans 95+ symbols, confidence threshold 45%+.

## Requested Changes (Diff)

### Add
1. **TrackingPage — Manual outcome buttons**: Each tracked trade card gets two new buttons:
   - "Mark TP Hit" (green) — manually marks trade as won
   - "Mark SL Hit" (red) — manually marks trade as lost
   Both update win/loss stats in AuthContext (updateProfile tradeHistory), mark the trade as closed (`outcome: 'win' | 'loss'`), and send it to a "Trade Analysis" log (stored as `wb_trade_analysis` in localStorage).
2. **TrackingPage — Auto SL detection banner**: When live price crosses stop loss, show a red pulsing "⛔ STOP LOSS HIT" banner (similar to existing TP Hit green banner). Auto-fire the loss outcome logic, update win/loss stats, and log to trade analysis.
3. **TrackingPage — Deep Analysis log section**: Below the tracked trades grid, show a collapsible "Trade History & Deep Analysis" section. Lists all closed trades (win/loss) from `wb_trade_analysis_<uid>`. Each entry shows: symbol, direction, entry, TP/SL hit, outcome (WIN/LOSS), time closed, and an AI analysis note about what can be learned from this trade.
4. **FeedbackPage — Approval action log**: When admin approves a feedback/complaint, log the approval with the AI solution into `wb_improvement_log` in localStorage. This log is visible in the Admin Panel > Feedback tab as "Approved Improvements" subsection — showing what has been acted on.
5. **SignalsPage — SL blacklist**: Read `wb_trade_analysis_<uid>` (or global `wb_sl_hits` list). Any symbol that has hit stop loss in tracked history is added to a blacklist. The signal scanner skips blacklisted symbols, so they never appear again in the signals list.

### Modify
1. **TrackingPage — TP Hit auto outcome**: When the auto TP Hit banner fires (live price >= TP), automatically record win outcome to tradeHistory and trade analysis log (same as manual Mark TP Hit), but only once per trade.
2. **TrackingPage — TrackedTrade interface**: Add `outcome?: 'win' | 'loss' | 'open'` and `closedAt?: string` fields.
3. **FeedbackPage — AI solution label**: Change "AI Assistant" label to "AI Rectification" to reflect that the solution is a rectification/improvement action.
4. **AdminPanel FeedbackAdminTab**: Add "Approved Improvements" subsection showing entries from `wb_improvement_log`. Each entry shows the subject, AI rectification, and date approved.
5. **SignalScanContext — confidence threshold**: Keep at 45% minimum but add hard SL blacklist filter: skip symbols in `wb_sl_hits` global key.

### Remove
- Nothing removed.

## Implementation Plan

1. **TrackingPage.tsx**:
   - Add `outcome` and `closedAt` to `TrackedTrade` interface
   - Add `closeTradeAsWin(trade)` and `closeTradeAsLoss(trade)` helper functions:
     - Save to `wb_trade_analysis_<uid>` in localStorage
     - Call `updateProfile` to increment tradeHistory wins or losses
     - Update trade in tracked list with `outcome` set and optionally remove from active tracking (keep in history but mark closed)
   - Add "Mark TP Hit" (green) and "Mark SL Hit" (red) buttons to each TrackCard that is still `outcome === undefined` or `'open'`
   - Auto-detect SL hit: same logic as TP hit useEffect — when livePrice <= stopLoss (for BUY) or livePrice >= stopLoss (for SELL), show red pulsing "⛔ STOP LOSS HIT" banner and auto-call closeTradeAsLoss once
   - Auto-detect TP hit: extend existing TP hit useEffect to also call closeTradeAsWin once
   - Add collapsible "Trade History & Deep Analysis" section below main grid, reading from `wb_trade_analysis_<uid>`

2. **FeedbackPage.tsx**:
   - Rename "AI Assistant" label to "AI Rectification" throughout

3. **AdminPanel.tsx — FeedbackAdminTab**:
   - On handleApprove: also write approved item to `wb_improvement_log` in localStorage
   - Add "Approved Improvements" subsection at bottom of FeedbackAdminTab that reads and renders `wb_improvement_log` entries

4. **SignalScanContext.tsx**:
   - Before scanning each symbol, check `wb_sl_hits` key in localStorage (array of symbol strings)
   - Skip any symbol in that blacklist
   - When `closeTradeAsLoss` fires in TrackingPage, also push symbol to `wb_sl_hits` list

5. **AuthContext.tsx**:
   - No structural changes needed — `updateProfile({ tradeHistory: ... })` already works
