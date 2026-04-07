import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";



actor {
  // Include authentication mixin.
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ---- NEW TYPES ----

  public type UserCredential = {
    uid : Text;
    username : Text;
    passwordHash : Text;
    subscriptionType : Text;
    createdAt : Time.Time;
  };

  public type TrackedTradeRecord = {
    tradeId : Text;
    uid : Text;
    tradeJson : Text;
    updatedAt : Time.Time;
  };

  // ---- NEW PERSISTENT STATE ----

  let userCredentials = Map.empty<Text, UserCredential>();
  let usernameToUid = Map.empty<Text, Text>();
  let trackedTrades = Map.empty<Text, TrackedTradeRecord>();

  // ---- USER CREDENTIALS ----

  public shared ({ caller }) func saveUserCredential(cred : UserCredential) : async () {
    let existing = userCredentials.get(cred.uid);
    switch (existing) {
      case (null) {
        userCredentials.add(cred.uid, cred);
        usernameToUid.add(cred.username, cred.uid);
      };
      case (?existingCred) {
        userCredentials.add(cred.uid, cred);
        if (existingCred.username != cred.username) {
          usernameToUid.remove(existingCred.username);
          usernameToUid.add(cred.username, cred.uid);
        };
      };
    };
  };

  public query ({ caller }) func getUserCredentialByUid(uid : Text) : async ?UserCredential {
    userCredentials.get(uid);
  };

  public query ({ caller }) func getUserCredentialByUsername(username : Text) : async ?UserCredential {
    let uid = usernameToUid.get(username);
    switch (uid) {
      case (null) { null };
      case (?uid) { userCredentials.get(uid) };
    };
  };

  public query ({ caller }) func getAllUserCredentials() : async [UserCredential] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    userCredentials.values().toArray();
  };

  public shared ({ caller }) func deleteUserCredential(uid : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };

    let cred = userCredentials.get(uid);
    switch (cred) {
      case (null) { () };
      case (?cred) {
        userCredentials.remove(uid);
        usernameToUid.remove(cred.username);
      };
    };
  };

  // ---- TRACKED TRADES ----

  public shared ({ caller }) func saveTrackedTrade(record : TrackedTradeRecord) : async () {
    trackedTrades.add(record.tradeId, record);
  };

  public query ({ caller }) func getTrackedTradesForUser(uid : Text) : async [TrackedTradeRecord] {
    trackedTrades.values().filter(func(x) { x.uid == uid }).toArray();
  };

  public shared ({ caller }) func deleteTrackedTrade(tradeId : Text) : async () {
    trackedTrades.remove(tradeId);
  };

  public query ({ caller }) func getAllTrackedTrades() : async [TrackedTradeRecord] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    trackedTrades.values().toArray();
  };

  // ---- EXISTING TYPES ----

  public type UserProfile = {
    username : Text;
    subscriptionExpiry : Time.Time;
    status : SubscriptionStatus;
  };

  // Application-specific user profile with UID
  public type AppUserProfile = {
    uid : Text;
    username : Text;
    subscriptionExpiry : Time.Time;
    status : SubscriptionStatus;
  };

  public type TradingSignal = {
    coinName : Text;
    direction : Direction;
    entryPrice : Float;
    targetPrice : Float;
    stopLoss : Float;
    timestamp : Time.Time;
    signalStatus : SignalStatus;
  };

  public type ScanReport = {
    totalCoinsScanned : Nat;
    totalSignalsGenerated : Nat;
    winRate : Float;
    activeSignalsCount : Nat;
  };

  public type TrendingCoin = {
    name : Text;
    symbol : Text;
    currentPrice : Float;
    change24h : Float;
    predictedTarget : Float;
    category : CoinCategory;
  };

  public type NewsPost = {
    title : Text;
    contentSummary : Text;
    timestamp : Time.Time;
    postCategory : PostCategory;
  };

  public type MarketStatus = {
    sentiment : MarketSentiment;
    btcDominance : Float;
    marketCap : Float;
  };

  public type SubscriptionStatus = {
    #active;
    #expired;
    #trial;
  };

  public type Direction = {
    #buy;
    #sell;
  };

  public type SignalStatus = {
    #active;
    #completed;
    #cancelled;
  };

  public type CoinCategory = {
    #trending;
    #hundredX;
  };

  public type PostCategory = {
    #news;
    #post;
  };

  public type MarketSentiment = {
    #bullish;
    #bearish;
    #neutral;
  };

  // ---- EXISTING PERSISTENT STATE ----

  let userProfiles = Map.empty<Principal, UserProfile>();
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

  // ---- REQUIRED USER PROFILE FUNCTIONS (Principal-based) ----

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

  // ---- APP-SPECIFIC USER PROFILE MANAGEMENT (admin-only writes) ----

  public shared ({ caller }) func addAppUserProfile(profile : AppUserProfile) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add user profiles");
    };
    appUserProfiles.add(profile.uid, profile);
  };

  public query func getAppUserProfile(uid : Text) : async ?AppUserProfile {
    appUserProfiles.get(uid);
  };

  public query func getAllAppUserProfiles() : async [AppUserProfile] {
    appUserProfiles.values().toArray();
  };

  public shared ({ caller }) func addTradingSignal(signal : TradingSignal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add trading signals");
    };
    tradingSignals.add(signal.coinName, signal);
  };

  public query func getTradingSignal(coinName : Text) : async ?TradingSignal {
    tradingSignals.get(coinName);
  };

  public query func getAllTradingSignals() : async [TradingSignal] {
    tradingSignals.values().toArray();
  };

  public shared ({ caller }) func addTrendingCoin(coin : TrendingCoin) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add trending coins");
    };
    trendingCoins.add(coin.name, coin);
  };

  public query func getTrendingCoin(name : Text) : async ?TrendingCoin {
    trendingCoins.get(name);
  };

  public query func getAllTrendingCoins() : async [TrendingCoin] {
    trendingCoins.values().toArray();
  };

  public shared ({ caller }) func addNewsPost(post : NewsPost) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add news posts");
    };
    newsPosts.add(post.title, post);
  };

  public query func getNewsPost(title : Text) : async ?NewsPost {
    newsPosts.get(title);
  };

  public query func getAllNewsPosts() : async [NewsPost] {
    newsPosts.values().toArray();
  };

  public shared ({ caller }) func updateMarketStatus(status : MarketStatus) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update market status");
    };
    marketStatus := status;
  };

  public query func getMarketStatus() : async MarketStatus {
    marketStatus;
  };

  // ---- INIT SEED DATA ----

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
