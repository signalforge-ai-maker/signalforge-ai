import { formatPrice, formatSymbol } from "./market";
import type { Language } from "./i18n";

type PortfolioPosition = {
  symbol: string;
  marketType: "spot" | "futures";
  leverage: number;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: string;
};

type PortfolioPanelProps = {
  language: Language;
  cash: number;
  position: PortfolioPosition | null;
  positionValue: number;
  currentPrice: number;
  pnl: number;
};

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

export function PortfolioPanel({
  language,
  cash,
  position,
  positionValue,
  currentPrice,
  pnl,
}: PortfolioPanelProps) {
  const totalEquity = cash + positionValue;
  const cashPercent = totalEquity > 0 ? (cash / totalEquity) * 100 : 0;
  const positionPercent =
    totalEquity > 0 ? (positionValue / totalEquity) * 100 : 0;
  const pnlPercent =
    position && position.entryPrice > 0
      ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      : 0;

  const concentrationLevel =
    positionPercent >= 50 ? "high" : positionPercent >= 30 ? "medium" : "low";

  const title = language === "zh" ? "组合概览" : "Portfolio";
  const cashLabel = language === "zh" ? "现金" : "Cash";
  const positionLabel = language === "zh" ? "持仓市值" : "Position value";
  const equityLabel = language === "zh" ? "总权益" : "Total equity";
  const allocationLabel = language === "zh" ? "资产分布" : "Allocation";
  const riskLabel = language === "zh" ? "集中度风险" : "Concentration risk";

  const riskText =
    language === "zh"
      ? concentrationLevel === "high"
        ? "偏高"
        : concentrationLevel === "medium"
          ? "中等"
          : "较低"
      : concentrationLevel === "high"
        ? "High"
        : concentrationLevel === "medium"
          ? "Medium"
          : "Low";

  return (
    <section>
      <div className="section-heading">
        <h2>{title}</h2>
        <span className={`status-pill ${concentrationLevel}`}>{riskText}</span>
      </div>

      <article className="portfolio-card">
        <div className="portfolio-grid">
          <div>
            <span>{equityLabel}</span>
            <strong>${formatUsd(totalEquity)}</strong>
          </div>

          <div>
            <span>{cashLabel}</span>
            <strong>${formatUsd(cash)}</strong>
          </div>

          <div>
            <span>{positionLabel}</span>
            <strong>${formatUsd(positionValue)}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "浮动盈亏" : "Floating PnL"}</span>
            <strong className={pnl >= 0 ? "change up" : "change down"}>
              {pnl >= 0 ? "+" : ""}${formatUsd(pnl)}
            </strong>
          </div>
        </div>

        <div className="allocation-block">
          <div className="allocation-heading">
            <span>{allocationLabel}</span>
            <strong>
              {Math.round(cashPercent)}% / {Math.round(positionPercent)}%
            </strong>
          </div>

          <div className="allocation-bar" aria-label={allocationLabel}>
            <span
              className="allocation-cash"
              style={{ width: `${cashPercent}%` }}
            />
            <span
              className="allocation-position"
              style={{ width: `${positionPercent}%` }}
            />
          </div>

          <div className="allocation-legend">
            <span>{cashLabel}</span>
            <span>{position ? formatSymbol(position.symbol) : "--"}</span>
          </div>
        </div>

        <div className="portfolio-position">
          <div>
            <span>{language === "zh" ? "当前持仓" : "Current position"}</span>
            <strong>
              {position
                ? formatSymbol(position.symbol)
                : language === "zh"
                  ? "无"
                  : "None"}
            </strong>
          </div>

          <div>
            <span>{language === "zh" ? "入场 / 现价" : "Entry / Current"}</span>
            <strong>
              {position
                ? `$${formatPrice(String(position.entryPrice))} / $${formatPrice(String(currentPrice))}`
                : "--"}
            </strong>
          </div>

          <div>
            <span>{language === "zh" ? "价格变化" : "Price change"}</span>
            <strong className={pnlPercent >= 0 ? "change up" : "change down"}>
              {position
                ? `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`
                : "--"}
            </strong>
          </div>

          <div>
            <span>{riskLabel}</span>
            <strong>{riskText}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
