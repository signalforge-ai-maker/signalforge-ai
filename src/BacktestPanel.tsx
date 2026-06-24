import { useMemo } from "react"

import { runBacktest } from "./backtest"
import { t, type Language } from "./i18n"
import type { KlineRow, StrategyType } from "./market"
import type { EquityPoint } from "./backtest"

function EquityCurveChart({ language, points }: { language: Language; points: EquityPoint[] }) {
  const width = 320
  const height = 88
  const padding = 8

  if (points.length < 2) {
    return (
      <div className="equity-placeholder">
        {language === "zh" ? "权益曲线数据不足。" : "Not enough equity data."}
      </div>
    )
  }

  const values = points.map((point) => point.equity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const xStep = (width -padding * 2) /Math.max(points.length -1, 1)

  const path = points
    .map((point, index) => {
      const x = padding + index * xStep
      const y = padding + ((max - point.equity) / range) * (height - padding * 2)

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")

  const endValue = points.at(-1)?.equity ?? 0
  const startValue = points[0]?.equity ?? 0
  const isUp = endValue >= startValue

  return (
    <div className="equity-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Backtest equity curve">
        <line className="equity-grid" x1={padding} x2={width - padding} y1={padding} y2={padding} />
        <line className="equity-grid" x1={padding} x2={width - padding} y1={height / 2} y2={height / 2} />
        <line className="equity-grid" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <path className={isUp ? "equity-line up" : "equity-line down"} d={path} />
      </svg>

      <div className="equity-range">
        <span>${formatUsd(min)}</span>
        <strong className={isUp ? "change up" : "change down"}>
          ${formatUsd(endValue)}
        </strong>
        <span>${formatUsd(max)}</span>
      </div>
    </div>
  )
 }

type BacktestPanelProps = {
  language: Language
  rows: KlineRow[]
  strategy: StrategyType
  orderSizePercent: number
  stopLossPercent: number
  takeProfitPercent: number
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  })
}

export function BacktestPanel({
  language,
  rows,
  strategy,
  orderSizePercent,
  stopLossPercent,
  takeProfitPercent
}: BacktestPanelProps) {
  const result = useMemo(() => {
    return runBacktest(rows, {
      strategy,
      initialCash: 10000,
      orderSizePercent,
      feeRatePercent: 0.1,
      stopLossPercent,
      takeProfitPercent
    })
  }, [orderSizePercent, rows, stopLossPercent, strategy, takeProfitPercent])

  const closedTradeCount = result.trades.filter((trade) => trade.side === "sell").length

  return (
    <section className="backtest-panel">
      <div className="section-heading">
        <h2>{t(language, "backtest")}</h2>
        <span className="badge simulation">{t(language, "simulation")}</span>
      </div>

      <article className="backtest-card">
        <div className="backtest-grid">
          <div>
            <span>{t(language, "totalReturn")}</span>
            <strong className={result.totalReturnPercent >= 0 ? "change up" : "change down"}>
              {formatPercent(result.totalReturnPercent)}
            </strong>
          </div>

          <div>
            <span>{t(language, "finalEquity")}</span>
            <strong>${formatUsd(result.finalEquity)}</strong>
          </div>

          <div>
            <span>{t(language, "maxDrawdown")}</span>
            <strong className="change down">
              -{result.maxDrawdownPercent.toFixed(2)}%
            </strong>
          </div>

          <div>
            <span>{t(language, "winRate")}</span>
            <strong>{result.winRatePercent.toFixed(0)}%</strong>
          </div>
        </div>
        <EquityCurveChart language={language} points={result.equityCurve} />
        <p className="backtest-note">
          {language === "zh"
            ? `基于当前K线窗口，共 ${closedTradeCount} 笔已平仓交易。`
            : `${closedTradeCount} closed trades based on current Kline window.`}
        </p>
      </article>
    </section>
  )
}
