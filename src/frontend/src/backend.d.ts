import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserCredential {
    uid: string;
    username: string;
    createdAt: Time;
    subscriptionType: string;
    passwordHash: string;
}
export interface TrendingCoin {
    currentPrice: number;
    change24h: number;
    name: string;
    predictedTarget: number;
    category: CoinCategory;
    symbol: string;
}
export type Time = bigint;
export interface AppUserProfile {
    uid: string;
    status: SubscriptionStatus;
    username: string;
    subscriptionExpiry: Time;
}
export interface MarketStatus {
    btcDominance: number;
    marketCap: number;
    sentiment: MarketSentiment;
}
export interface NewsPost {
    title: string;
    postCategory: PostCategory;
    timestamp: Time;
    contentSummary: string;
}
export interface TradingSignal {
    direction: Direction;
    targetPrice: number;
    stopLoss: number;
    timestamp: Time;
    coinName: string;
    entryPrice: number;
    signalStatus: SignalStatus;
}
export interface TrackedTradeRecord {
    uid: string;
    tradeJson: string;
    updatedAt: Time;
    tradeId: string;
}
export interface UserProfile {
    status: SubscriptionStatus;
    username: string;
    subscriptionExpiry: Time;
}
export enum CoinCategory {
    hundredX = "hundredX",
    trending = "trending"
}
export enum Direction {
    buy = "buy",
    sell = "sell"
}
export enum MarketSentiment {
    bullish = "bullish",
    bearish = "bearish",
    neutral = "neutral"
}
export enum PostCategory {
    news = "news",
    post = "post"
}
export enum SignalStatus {
    active = "active",
    cancelled = "cancelled",
    completed = "completed"
}
export enum SubscriptionStatus {
    trial = "trial",
    active = "active",
    expired = "expired"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAppUserProfile(profile: AppUserProfile): Promise<void>;
    addNewsPost(post: NewsPost): Promise<void>;
    addTradingSignal(signal: TradingSignal): Promise<void>;
    addTrendingCoin(coin: TrendingCoin): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteTrackedTrade(tradeId: string): Promise<void>;
    deleteUserCredential(uid: string): Promise<void>;
    getAllAppUserProfiles(): Promise<Array<AppUserProfile>>;
    getAllNewsPosts(): Promise<Array<NewsPost>>;
    getAllTrackedTrades(): Promise<Array<TrackedTradeRecord>>;
    getAllTradingSignals(): Promise<Array<TradingSignal>>;
    getAllTrendingCoins(): Promise<Array<TrendingCoin>>;
    getAllUserCredentials(): Promise<Array<UserCredential>>;
    getAppUserProfile(uid: string): Promise<AppUserProfile | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMarketStatus(): Promise<MarketStatus>;
    getNewsPost(title: string): Promise<NewsPost | null>;
    getTrackedTradesForUser(uid: string): Promise<Array<TrackedTradeRecord>>;
    getTradingSignal(coinName: string): Promise<TradingSignal | null>;
    getTrendingCoin(name: string): Promise<TrendingCoin | null>;
    getUserCredentialByUid(uid: string): Promise<UserCredential | null>;
    getUserCredentialByUsername(username: string): Promise<UserCredential | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveTrackedTrade(record: TrackedTradeRecord): Promise<void>;
    saveUserCredential(cred: UserCredential): Promise<void>;
    updateMarketStatus(status: MarketStatus): Promise<void>;
}
