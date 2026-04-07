# Waltz Bots

## Current State
- User accounts are created by admin via AdminPanel and stored in `localStorage` (`wb_users`, `wb_user_passwords`)
- Passwords are NEVER pushed to the ICP backend canister — only profile metadata is saved
- Login checks `localStorage` for password; on a different device, `wb_user_passwords` is empty so login always fails
- Tracked trades are stored in `localStorage` under `wb_tracked_<uid>` — never synced to cloud
- 30-second sync only pushes `AppUserProfile` (no password, no tracked trades) to backend
- Backend `AppUserProfile` has: uid, username, subscriptionExpiry, status — no password field
- Backend has no tracked trade storage at all
- AdminPanel shows user list but no per-user tracked trades, UID detail, or subscription info inline

## Requested Changes (Diff)

### Add
- `UserCredential` type in backend: `{ uid: Text; username: Text; passwordHash: Text; subscriptionType: Text }`
- `TrackedTradeRecord` type in backend: `{ tradeId: Text; uid: Text; tradeJson: Text; updatedAt: Time.Time }`
- Backend endpoints: `saveUserCredential`, `getUserCredential`, `getAllUserCredentials`, `deleteUserCredential`
- Backend endpoints: `saveTrackedTrade`, `getTrackedTradesForUser`, `deleteTrackedTrade`, `getAllTrackedTrades`
- AuthContext: on `addUser`, save credential to backend immediately
- AuthContext: on `login`, if local password not found → fetch credential from backend by username, verify, then proceed
- AuthContext: 30-second sync pushes full user data + credentials to backend
- TrackingPage: on every add/remove/update of tracked trade, sync to backend under user's uid
- TrackingPage: on load, pull tracked trades from backend if local is empty
- AdminPanel: per-user row shows UID, subscription type, expiry, status, and tracked trade count with detail expandable section

### Modify
- `AuthContext.tsx`: add cloud credential save/retrieve; fix login to check cloud fallback for both user profile and password
- `TrackingPage.tsx`: add cloud sync for tracked trades (save on change, load on mount)
- `AdminPanel.tsx`: UsersTab table shows UID column, tracked trades count, expandable detail view
- `main.mo`: add credential and tracked-trade storage with appropriate access control

### Remove
- Nothing removed; localStorage remains as cache layer

## Implementation Plan
1. Update `main.mo` to add `UserCredential` and `TrackedTradeRecord` types, maps, and CRUD endpoints
2. Regenerate backend bindings (done automatically by build pipeline)
3. Update `AuthContext.tsx` to save credential on user creation and check cloud on login failure
4. Update `TrackingPage.tsx` to sync tracked trades to backend on add/remove and load from backend on mount
5. Update `AdminPanel.tsx` UsersTab to show full user detail (UID, subscription, tracked trades)
