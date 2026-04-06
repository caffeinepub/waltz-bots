import { TrendingDown, TrendingUp } from "lucide-react";
import { useLivePrices } from "../hooks/useMarketData";

const TICKER_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "ADA",
  "AVAX",
  "DOT",
  "LINK",
  "MATIC",
];

export function TickerTape() {
  const prices = useLivePrices(TICKER_SYMBOLS, 8000);

  const firstLoop = TICKER_SYMBOLS.map((sym) => ({ sym, loop: "a" }));
  const secondLoop = TICKER_SYMBOLS.map((sym) => ({ sym, loop: "b" }));
  const items = [...firstLoop, ...secondLoop];

  return (
    <div
      className="overflow-hidden py-2"
      style={{
        background: "linear-gradient(90deg, #0B1F3B, #0A254A)",
        borderBottom: "1px solid rgba(212,175,55,0.2)",
      }}
    >
      <div className="ticker-tape flex gap-0">
        {items.map(({ sym, loop }) => {
          const t = prices[sym];
          const price = t?.price ?? null;
          const change = t?.change24h ?? null;
          return (
            <div
              key={`${sym}-${loop}`}
              className="flex items-center gap-2 px-5 border-r border-white/10"
            >
              <span className="text-gold font-semibold text-xs">{sym}</span>
              <span className="text-white text-xs font-mono">
                {price === null
                  ? "--"
                  : price >= 1000
                    ? `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : price >= 1
                      ? `$${price.toFixed(2)}`
                      : `$${price.toFixed(4)}`}
              </span>
              {change !== null && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold ${
                    change >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(change).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
