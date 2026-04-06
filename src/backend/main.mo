import Map "mo:core/Map";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Set "mo:core/Set";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type for Principal-based authentication (required by frontend)
  public type UserProfile = {
    username : Text;
    subscriptionExpiry : Time.Time;
    status : SubscriptionStatus;
  };

  // Application-specific user profile with UID
  type AppUserProfile = {
    uid : Text;
    username : Text;
    subscriptionExpiry : Time.Time;
    status : SubscriptionStatus;
  };

  type TradingSignal = {
    coinName : Text;
    direction : Direction;
    entryPrice : Float;
    targetPrice : Float;
    stopLoss : Float;
    timestamp : Time.Time;
    signalStatus : SignalStatus;
  };

  type ScanReport = {
    totalCoinsScanned : Nat;
    totalSignalsGenerated : Nat;
    winRate : Float;
    activeSignalsCount : Nat;
  };

  type TrendingCoin = {
    name : Text;
    symbol : Text;
    currentPrice : Float;
    change24h : Float;
    predictedTarget : Float;
    category : CoinCategory;
  };

  type NewsPost = {
    title : Text;
    contentSummary : Text;
    timestamp : Time.Time;
    postCategory : PostCategory;
  };

  type MarketStatus = {
    sentiment : MarketSentiment;
    btcDominance : Float;
    marketCap : Float;
  };

  type SubscriptionStatus = {
    #active;
    #expired;
    #trial;
  };

  type Direction = {
    #buy;
    #sell;
  };

  type SignalStatus = {
    #active;
    #completed;
    #cancelled;
  };

  type CoinCategory = {
    #trending;
    #hundredX;
  };

  type PostCategory = {
    #news;
    #post;
  };

  type MarketSentiment = {
    #bullish;
    #bearish;
    #neutral;
  };

  module MarketSentiment {
    public func compare(x : MarketSentiment, y : MarketSentiment) : Order.Order {
      func rank(s : MarketSentiment) : Nat {
        switch (s) {
          case (#bullish) { 0 };
          case (#bearish) { 1 };
          case (#neutral) { 2 };
        };
      };
      Nat.compare(rank(x), rank(y));
    };
  };

  module SignalStatus {
    public func compare(x : SignalStatus, y : SignalStatus) : Order.Order {
      func rank(s : SignalStatus) : Nat {
        switch (s) {
          case (#active) { 0 };
          case (#completed) { 1 };
          case (#cancelled) { 2 };
        };
      };
      Nat.compare(rank(x), rank(y));
    };
  };

  module SubscriptionStatus {
    public func compare(x : SubscriptionStatus, y : SubscriptionStatus) : Order.Order {
      func rank(s : SubscriptionStatus) : Nat {
        switch (s) {
          case (#active) { 0 };
          case (#expired) { 1 };
          case (#trial) { 2 };
        };
      };
      Nat.compare(rank(x), rank(y));
    };
  };

  module Direction {
    public func compare(x : Direction, y : Direction) : Order.Order {
      func rank(d : Direction) : Nat {
        switch (d) {
          case (#buy) { 0 };
          case (#sell) { 1 };
        };
      };
      Nat.compare(rank(x), rank(y));
    };
  };

  module CoinCategory {
    public func compare(x : CoinCategory, y : CoinCategory) : Order.Order {
      func rank(c : CoinCategory) : Nat {
        switch (c) {
          case (#trending) { 0 };
          case (#hundredX) { 1 };
        };
      };
      Nat.compare(rank(x), rank(y));
    };
  };

  module PostCategory {
    public func compare(x : PostCategory, y : PostCategory) : Order.Order {
      func rank(p : PostCategory) : Nat {
        switch (p) {
          case (#news) { 0 };
          case (#post) { 1 };
        };
      };
      Nat.compare(rank(x), rank(y));
    };
  };

  module AppUserProfile {
    public func compare(a : AppUserProfile, b : AppUserProfile) : Order.Order {
      Text.compare(a.uid, b.uid);
    };

    public func compareBySubscriptionExpiry(a : AppUserProfile, b : AppUserProfile) : Order.Order {
      Int.compare(b.subscriptionExpiry, a.subscriptionExpiry);
    };

    public func compareByStatus(a : AppUserProfile, b : AppUserProfile) : Order.Order {
      SubscriptionStatus.compare(a.status, b.status);
    };
  };

  module TradingSignal {
    public func compare(a : TradingSignal, b : TradingSignal) : Order.Order {
      Text.compare(a.coinName, b.coinName);
    };

    public func compareByTimestamp(a : TradingSignal, b : TradingSignal) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };

    public func compareByStatus(a : TradingSignal, b : TradingSignal) : Order.Order {
      SignalStatus.compare(a.signalStatus, b.signalStatus);
    };
  };

  module TrendingCoin {
    public func compare(a : TrendingCoin, b : TrendingCoin) : Order.Order {
      Text.compare(a.name, b.name);
    };

    public func compareByPrice(a : TrendingCoin, b : TrendingCoin) : Order.Order {
      Float.compare(b.currentPrice, a.currentPrice);
    };

    public func compareByCategory(a : TrendingCoin, b : TrendingCoin) : Order.Order {
      CoinCategory.compare(a.category, b.category);
    };
  };

  module NewsPost {
    public func compare(a : NewsPost, b : NewsPost) : Order.Order {
      Text.compare(a.title, b.title);
    };

    public func compareByTimestamp(a : NewsPost, b : NewsPost) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };

    public func compareByCategory(a : NewsPost, b : NewsPost) : Order.Order {
      PostCategory.compare(a.postCategory, b.postCategory);
    };
  };

  // Principal-based user profiles (for authentication system)
  let userProfiles = Map.empty<Principal, UserProfile>();
  
  // Application-specific user profiles with UIDs
  let appUserProfiles = Map.empty<Text, AppUserProfile>();
  
  let tradingSignals = Map.empty<Text, TradingSignal>();
  let scanReport : ScanReport = {
    totalCoinsScanned = 1000;
    totalSignalsGenerated = 200;
    winRate = 0.75;
    activeSignalsCount = 50;
  };
  let trendingCoins = Map.empty<Text, TrendingCoin>();
  let newsPosts = Map.empty<Text, NewsPost>();
  var marketStatus : MarketStatus = {
    sentiment = #bullish;
    btcDominance = 45.5;
    marketCap = 2000000000;
  };

  // Required user profile functions for authentication system
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Application-specific user profile management (admin-only writes)
  public shared ({ caller }) func addAppUserProfile(profile : AppUserProfile) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add user profiles");
    };
    appUserProfiles.add(profile.uid, profile);
  };

  public shared ({ caller }) func addTradingSignal(signal : TradingSignal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add trading signals");
    };
    tradingSignals.add(signal.coinName, signal);
  };

  public shared ({ caller }) func addTrendingCoin(coin : TrendingCoin) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add trending coins");
    };
    trendingCoins.add(coin.name, coin);
  };

  public shared ({ caller }) func addNewsPost(post : NewsPost) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add news posts");
    };
    newsPosts.add(post.title, post);
  };

  public shared ({ caller }) func updateMarketStatus(status : MarketStatus) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update market status");
    };
    marketStatus := status;
  };

  // Public read functions (no authorization required)
  public query func getAppUserProfile(uid : Text) : async ?AppUserProfile {
    appUserProfiles.get(uid);
  };

  public query func getAllAppUserProfiles() : async [AppUserProfile] {
    appUserProfiles.values().toArray().sort();
  };

  public query func getAppUserProfilesByStatus(status : SubscriptionStatus) : async [AppUserProfile] {
    let filtered = appUserProfiles.values().filter(
      func(p) { SubscriptionStatus.compare(p.status, status) == #equal }
    );
    filtered.toArray().sort();
  };

  public query func getAppUserProfilesBySubscriptionExpiry() : async [AppUserProfile] {
    appUserProfiles.values().toArray().sort(AppUserProfile.compareBySubscriptionExpiry);
  };

  public query func getTradingSignal(coinName : Text) : async ?TradingSignal {
    tradingSignals.get(coinName);
  };

  public query func getAllTradingSignals() : async [TradingSignal] {
    tradingSignals.values().toArray().sort();
  };

  public query func getTradingSignalsByStatus(status : SignalStatus) : async [TradingSignal] {
    tradingSignals.values().filter(
      func(s) { SignalStatus.compare(s.signalStatus, status) == #equal }
    ).toArray();
  };

  public query func getTradingSignalsByCoinName() : async [TradingSignal] {
    tradingSignals.values().toArray().sort();
  };

  public query func getTradingSignalsByTimestamp() : async [TradingSignal] {
    tradingSignals.values().toArray().sort(TradingSignal.compareByTimestamp);
  };

  public query func getScanReport() : async ScanReport {
    scanReport;
  };

  public query func getTrendingCoin(name : Text) : async ?TrendingCoin {
    trendingCoins.get(name);
  };

  public query func getAllTrendingCoins() : async [TrendingCoin] {
    trendingCoins.values().toArray().sort();
  };

  public query func getTrendingCoinsByCategory(category : CoinCategory) : async [TrendingCoin] {
    trendingCoins.values().filter(
      func(c) { CoinCategory.compare(c.category, category) == #equal }
    ).toArray();
  };

  public query func getTrendingCoinsByPrice() : async [TrendingCoin] {
    trendingCoins.values().toArray().sort(TrendingCoin.compareByPrice);
  };

  public query func getNewsPost(title : Text) : async ?NewsPost {
    newsPosts.get(title);
  };

  public query func getAllNewsPosts() : async [NewsPost] {
    newsPosts.values().toArray().sort();
  };

  public query func getNewsPostsByCategory(category : PostCategory) : async [NewsPost] {
    newsPosts.values().filter(
      func(p) { PostCategory.compare(p.postCategory, category) == #equal }
    ).toArray();
  };

  public query func getNewsPostsByTimestamp() : async [NewsPost] {
    newsPosts.values().toArray().sort(NewsPost.compareByTimestamp);
  };

  public query func getMarketStatus() : async MarketStatus {
    marketStatus;
  };

  // Seed data for application-specific profiles
  appUserProfiles.add(
    "1",
    {
      uid = "1";
      username = "user1";
      subscriptionExpiry = Time.now();
      status = #active;
    },
  );
  appUserProfiles.add(
    "2",
    {
      uid = "2";
      username = "user2";
      subscriptionExpiry = Time.now();
      status = #trial;
    },
  );

  tradingSignals.add(
    "BTC",
    {
      coinName = "BTC";
      direction = #buy;
      entryPrice = 50000.0;
      targetPrice = 55000.0;
      stopLoss = 48000.0;
      timestamp = Time.now();
      signalStatus = #active;
    },
  );
  tradingSignals.add(
    "ETH",
    {
      coinName = "ETH";
      direction = #sell;
      entryPrice = 3000.0;
      targetPrice = 2500.0;
      stopLoss = 3200.0;
      timestamp = Time.now();
      signalStatus = #completed;
    },
  );

  trendingCoins.add(
    "BTC",
    {
      name = "BTC";
      symbol = "BTC";
      currentPrice = 50000.0;
      change24h = 5.0;
      predictedTarget = 55000.0;
      category = #trending;
    },
  );
  trendingCoins.add(
    "DOGE",
    {
      name = "DOGE";
      symbol = "DOGE";
      currentPrice = 0.05;
      change24h = 20.0;
      predictedTarget = 0.1;
      category = #hundredX;
    },
  );

  newsPosts.add(
    "Bitcoin hits all-time high",
    {
      title = "Bitcoin hits all-time high";
      contentSummary = "Bitcoin reaches new ATH at $60k";
      timestamp = Time.now();
      postCategory = #news;
    },
  );
  newsPosts.add(
    "How to trade crypto",
    {
      title = "How to trade crypto";
      contentSummary = "A guide for beginners";
      timestamp = Time.now();
      postCategory = #post;
    },
  );
};
