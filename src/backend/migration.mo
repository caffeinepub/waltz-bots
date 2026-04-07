import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    appUserProfiles : Map.Map<Text, OldAppUserProfile>;
    tradingSignals : Map.Map<Text, OldTradingSignal>;
    scanReport : ScanReport;
    trendingCoins : Map.Map<Text, OldTrendingCoin>;
    newsPosts : Map.Map<Text, OldNewsPost>;
    marketStatus : MarketStatus;
  };

  type OldUserProfile = {
    username : Text;
    subscriptionExpiry : Time.Time;
    status : SubscriptionStatus;
  };

  type OldAppUserProfile = {
    uid : Text;
    username : Text;
    subscriptionExpiry : Time.Time;
    status : SubscriptionStatus;
  };

  type OldTradingSignal = {
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

  type OldTrendingCoin = {
    name : Text;
    symbol : Text;
    currentPrice : Float;
    change24h : Float;
    predictedTarget : Float;
    category : CoinCategory;
  };

  type OldNewsPost = {
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

  // The new fields (empty at migration point but added to actor).
  type NewUserCredential = {
    uid : Text;
    username : Text;
    passwordHash : Text;
    subscriptionType : Text;
    createdAt : Time.Time;
  };

  type NewTrackedTradeRecord = {
    tradeId : Text;
    uid : Text;
    tradeJson : Text;
    updatedAt : Time.Time;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    appUserProfiles : Map.Map<Text, OldAppUserProfile>;
    tradingSignals : Map.Map<Text, OldTradingSignal>;
    scanReport : ScanReport;
    trendingCoins : Map.Map<Text, OldTrendingCoin>;
    newsPosts : Map.Map<Text, OldNewsPost>;
    marketStatus : MarketStatus;
    userCredentials : Map.Map<Text, NewUserCredential>;
    usernameToUid : Map.Map<Text, Text>;
    trackedTrades : Map.Map<Text, NewTrackedTradeRecord>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      userCredentials = Map.empty<Text, NewUserCredential>();
      usernameToUid = Map.empty<Text, Text>();
      trackedTrades = Map.empty<Text, NewTrackedTradeRecord>();
    };
  };
};
