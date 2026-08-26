import { useMemo, useState } from "react";

import { formatPrice, formatSymbol, type StrategyType } from "./market";
import type { Language } from "./i18n";

type JournalOrder = {
  id: string;
  symbol: string;
  marketType: "spot" | "futures";
  leverage: number;
  side: "open" | "close";
  price: number;
  size: number;
  pnl?: number;
  reason: string;
  timestamp: string;
};

type TradeJournalPanelProps = {
  language: Language;
  orders: JournalOrder[];
  strategy: StrategyType;
};

function text(language: Language, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

function getClosedOrders(orders: JournalOrder[]) {
  return orders.filter(
    (order) => order.side === "close" && typeof order.pnl === "number",
  );
}

function getAveragePnl(orders: JournalOrder[]) {
  const closeOrders = getClosedOrders(orders);
  if (!closeOrders.length) return 0;

  return (
    closeOrders.reduce((sum, order) => sum + (order.pnl ?? 0), 0) /
    closeOrders.length
  );
}

function getWinRate(orders: JournalOrder[]) {
  const closeOrders = getClosedOrders(orders);
  if (!closeOrders.length) return 0;

  const wins = closeOrders.filter((order) => (order.pnl ?? 0) > 0);
  return (wins.length / closeOrders.length) * 100;
}

export function TradeJournalPanel({
  language,
  orders,
  strategy,
}: TradeJournalPanelProps) {
  const [note, setNote] = useState("");

  const closeOrders = useMemo(() => getClosedOrders(orders), [orders]);
  const averagePnl = useMemo(() => getAveragePnl(orders), [orders]);
  const winRate = useMemo(() => getWinRate(orders), [orders]);

  const bestTrade = useMemo(() => {
    return [...closeOrders].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0))[0];
  }, [closeOrders]);

  const worstTrade = useMemo(() => {
    return [...closeOrders].sort((a, b) => (a.pnl ?? 0) - (b.pnl ?? 0))[0];
  }, [closeOrders]);

  return (
    <section>
      <div className="section-heading">
        <h2>{text(language, "Trade journal", "交易日志")}</h2>
        <span className="badge simulation">
          {closeOrders.length} {text(language, "closed", "已完成")}
        </span>
      </div>

      <article className="journal-card">
        <div className="journal-grid">
          <div>
            <span>{text(language, "Win rate", "胜率")}</span>
            <strong>{winRate.toFixed(0)}%</strong>
          </div>

          <div>
            <span>{text(language, "Average Pnl", "平均盈亏")}</span>
            <strong className={averagePnl >= 0 ? "change up" : "change down"}>
              {averagePnl >= 0 ? "+" : ""}${averagePnl.toFixed(2)}
            </strong>
          </div>

          <div>
            <span>{text(language, "Best trade", "最佳交易")}</span>
            <strong>
              {bestTrade
                ? `${formatSymbol(bestTrade.symbol)} + $${Math.abs(bestTrade.pnl ?? 0).toFixed(2)}`
                : "--"}
            </strong>
          </div>

          <div>
            <span>{text(language, "Worst trade", "最差交易")}</span>
            <strong>
              {worstTrade
                ? `${formatSymbol(worstTrade.symbol)} -$${Math.abs(worstTrade.pnl ?? 0).toFixed(2)}`
                : "--"}
            </strong>
          </div>
        </div>

        <label className="journal-note">
          <span>{text(language, "Review note", "复盘备注")}</span>
          <textarea
            rows={3}
            placeholder={text(
              language,
              "What did this stratey do well or poorly?",
              "这次策略哪里做得好？哪里需要改？",
            )}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="journal-list">
          {closeOrders.length ? (
            closeOrders.map((order) => (
              <div key={order.id} className="journal-row">
                <div>
                  <strong>{formatSymbol(order.symbol)}</strong>
                  <span>
                    {text(language, "Strategy", "策略")}: {strategy}
                  </span>
                  <span>
                    {order.reason} · {order.timestamp}
                  </span>
                </div>

                <div>
                  <strong>${formatPrice(String(order.price))}</strong>
                  <span
                    className={
                      (order.pnl ?? 0) >= 0 ? "change up" : "change down"
                    }
                  >
                    {(order.pnl ?? 0) >= 0 ? "+" : ""}$
                    {(order.pnl ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-history">
              {text(language, "No closed trades yet.", "暂无已完成交易")}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
