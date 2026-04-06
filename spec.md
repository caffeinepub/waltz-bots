# Waltz Bots

## Current State
- HomePage has hardcoded past dates for 100X coin TP hit dates (e.g., 2025-09-01 which are now in the past)
- Trending coins section exists with 32 coins but only shows coins in a horizontal scroll row without entry/TP signals per card
- Market status section shows BTC dominance and total market cap but labeled as 'BTC Dominance' without broader market context (Fear & Greed, top gainers, etc.)
- FounderPage has the 'FOUNDER & CEO' badge positioned with `absolute -bottom-2` but the photo container has `z-10` and the badge has no explicit z-index, causing it to appear behind the photo border
- No Feedback & Complaint page exists
- AdminPanel has 3 tabs: Users, Posts, AI — no Feedback tab
- Sidebar has 9 nav items — no Feedback entry
- App.tsx has no 'feedback' tab route

## Requested Changes (Diff)

### Add
- FeedbackPage component: form to submit feedback/complaint (type selector, subject, message); AI bot auto-generates a suggested solution after 2s delay; feedback stored in localStorage `wb_feedback` permanently; each entry has: id, type, subject, message, aiSolution, status (pending/approved/rejected), timestamp, userName
- Admin Feedback tab in AdminPanel: 4th tab showing all submitted feedback/complaints; each row shows submitter, type, subject, AI solution, Approve/Reject buttons; approved/rejected permanently stored
- 'FEEDBACK' entry in Sidebar navigation with MessageSquare icon
- 'feedback' route in App.tsx TabId and renderPage switch

### Modify
- 100X coin TP hit dates: replace hardcoded past dates with dynamically computed future dates using `Date.now()` + offsets (3–18 months ahead), formatted as dd/mm/yyyy
- Trending coins: keep full 32-coin list but add entry price and TP signal fields per card (entry = live price, TP = live price × multiplier), show in detail dialog too
- Market status section: fetch total crypto market cap and Fear & Greed index from CoinGecko public API (`/api/v3/global`); show total market cap, BTC dominance, ETH dominance, market sentiment, 24h market change; show top 3 gainers from live data
- FounderPage badge: add `z-20` to the CEO badge div and ensure the photo container stays at `z-10`, so badge is always visually in front of the photo

### Remove
- Nothing removed

## Implementation Plan
1. Fix FounderPage badge z-index (simple CSS change)
2. Fix 100X dates in HomePage to be dynamically future-dated
3. Enhance trending coin cards to show entry + TP signal inline
4. Enhance market status to fetch from CoinGecko global API with Fear & Greed and top coins
5. Create `FeedbackPage.tsx` with AI response simulation and localStorage persistence
6. Add FeedbackAdminTab to AdminPanel as 4th tab
7. Add 'feedback' to App.tsx TabId, renderPage, and Sidebar
