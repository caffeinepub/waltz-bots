/**
 * useActor — stub hook for backend actor.
 * The backend canister is empty; all methods return empty/null gracefully.
 * Data is persisted locally in localStorage with cloud sync disabled.
 */

// ── Local backend-like types (since the canister doesn't export them) ──
export interface AppUserProfile {
  uid: string;
  username: string;
  status: SubscriptionStatus;
  subscriptionExpiry: bigint;
}

export type SubscriptionStatus = "active" | "expired" | "trial";

export interface UserCredential {
  uid: string;
  username: string;
  passwordHash: string;
  subscriptionType: string;
  createdAt: bigint;
}

export interface TrackedTradeRecord {
  tradeId: string;
  uid: string; // user ID who owns the trade
  userId?: string; // alias for uid
  tradeJson: string;
  savedAt?: bigint;
  updatedAt?: bigint;
}

export interface TradingSignalRecord {
  coinName: string;
  direction: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timestamp: bigint;
  signalStatus: string;
}

export interface TrendingCoinRecord {
  symbol: string;
  name: string;
  category: string;
  priceUsd: number;
  currentPrice?: number;
  change24h?: number;
  predictedTarget?: number;
}

export interface NewsPostRecord {
  title: string;
  postCategory: string;
  timestamp: bigint;
  contentSummary: string;
}

export interface MarketStatusRecord {
  sentiment: string;
  btcDominance: number;
  marketCap: number;
}

/** Stub actor — all methods are no-ops returning empty data */
const stubActor = {
  // User credentials
  getAllAppUserProfiles: async (): Promise<AppUserProfile[]> => [],
  getAllUserCredentials: async (): Promise<UserCredential[]> => [],
  getUserCredentialByUsername: async (
    _username: string,
  ): Promise<UserCredential | null> => null,
  addAppUserProfile: async (_profile: AppUserProfile): Promise<void> => {},
  saveUserCredential: async (_cred: UserCredential): Promise<void> => {},
  deleteUserCredential: async (_uid: string): Promise<void> => {},

  // Tracked trades
  getAllTrackedTrades: async (): Promise<TrackedTradeRecord[]> => [],
  getTrackedTradesForUser: async (
    _userId: string,
  ): Promise<TrackedTradeRecord[]> => [],
  saveTrackedTrade: async (_record: TrackedTradeRecord): Promise<void> => {},
  deleteTrackedTrade: async (_tradeId: string): Promise<void> => {},

  // Trading signals
  addTradingSignal: async (_signal: TradingSignalRecord): Promise<void> => {},

  // Market data
  getAllTrendingCoins: async (): Promise<TrendingCoinRecord[]> => [],
  getAllNewsPosts: async (): Promise<NewsPostRecord[]> => [],
  getMarketStatus: async (): Promise<MarketStatusRecord | null> => null,
};

export type StubActor = typeof stubActor;

export function useActor(): { actor: StubActor; isFetching: boolean } {
  return { actor: stubActor, isFetching: false };
}
