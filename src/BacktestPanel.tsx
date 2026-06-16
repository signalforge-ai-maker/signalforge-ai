import { useMemo } from "react"

import { runBacktest } from "./backtest"
import type { KlineRow, StrategyType } from "./market"

type BacktestPanelProps = {
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
        <h2>Backtest</h2>
        <span className="badge simulation">Simulation</span>
      </div>

      <article className="backtest-card">
        <div className="backtest-grid">
          <div>
            <span>Total return</span>
            <strong className={result.totalReturnPercent >= 0 ? "change up" : "change down"}>
              {formatPercent(result.totalReturnPercent)}
            </strong>
          </div>

          <div>
            <span>Final equity</span>
            <strong>${formatUsd(result.finalEquity)}</strong>
          </div>

          <div>
            <span>Max drawdown</span>
            <strong className="change down">
              -{result.maxDrawdownPercent.toFixed(2)}%
            </strong>
          </div>

          <div>
            <span>Win rate</span>
            <strong>{result.winRatePercent.toFixed(0)}%</strong>
          </div>
        </div>

        <p className="backtest-note">
          {closedTradeCount} closed trades based on current Kline window.
        </p>
      </article>
    </section>
  )
}