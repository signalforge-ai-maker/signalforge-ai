import { useMemo } from "react"

import type { Language } from "./i18n"
import { formatPrice, formatSymbol } from "./market"

type PositionSizingPanelProps = {
  language: Language
  symbol: string
  equity: number
  entryPrice: number
  stopLossPrice: number
  maxPositionPercent: number
  riskPercent: number
  onRiskPercentChange: (value: number) => void
}

export type PositionSizingResult = {
  riskAmount: number
  quantity: number
  positionValue: number
  positionPercent: number
  isBlocked: boolean
}

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2
  })
}

export function calculatePositionSize(
  equity: number,
  entryPrice: number,
  stopLossPrice: number,
  riskPercent: number,
  maxPositionPercent: number
): PositionSizingResult {
  const safeEquity = Math.max(0, equity)
  const safeRiskPercent = Math.max(0, riskPercent)
  const riskAmount = safeEquity * (safeRiskPercent / 100)
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice)

  if (
    safeEquity === 0 ||
    entryPrice <= 0 ||
    stopLossPrice <= 0 ||
    riskPerUnit === 0
  ) {
    return {
      riskAmount,
      quantity: 0,
      positionValue: 0,
      positionPercent: 0,
      isBlocked: false
    }
  }

  const quantity = riskAmount / riskPerUnit
  const positionValue = quantity * entryPrice
  const positionPercent = (positionValue / safeEquity) * 100

  return {
    riskAmount,
    quantity,
    positionValue,
    positionPercent,
    isBlocked: positionPercent > maxPositionPercent
  }
}

export function PositionSizingPanel({
  language,
  symbol,
  equity,
  entryPrice,
  stopLossPrice,
  maxPositionPercent,
  riskPercent,
  onRiskPercentChange
}: PositionSizingPanelProps) {
  const result = useMemo(
    () =>
      calculatePositionSize(
        equity,
        entryPrice,
        stopLossPrice,
        riskPercent,
        maxPositionPercent
      ),
    [
      equity,
      entryPrice,
      stopLossPrice,
      riskPercent,
      maxPositionPercent
    ]
  )

  return (
    <section>
      <div className="section-heading">
        <h2>{language === "zh" ? "仓位计算器" : "Position sizing"}</h2>

        <span className={`status-pill ${result.isBlocked ? "high" : "low"}`}>
          {result.isBlocked
            ? language === "zh"
              ? "超限"
              : "Blocked"
            : language === "zh"
              ? "可用"
              : "Ready"}
        </span>
      </div>

      <article className="position-sizing-card">
        <div className="position-sizing-main">
          <div>
            <span>{language === "zh" ? "交易标的" : "Symbol"}</span>
            <strong>{formatSymbol(symbol)}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "账户权益" : "Equity"}</span>
            <strong>${formatUsd(equity)}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "入场价" : "Entry price"}</span>
            <strong>${formatPrice(String(entryPrice))}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "止损价" : "Stop price"}</span>
            <strong>${formatPrice(String(stopLossPrice))}</strong>
          </div>
        </div>

        <label className="position-risk-input">
          <span>
            {language === "zh" ? "单笔风险 %" : "Risk per trade %"}
          </span>

          <input
            min="0.1"
            max="10"
            step="0.1"
            type="number"
            value={riskPercent}
            onChange={(event) =>
              onRiskPercentChange(Number(event.target.value))
            }
          />
        </label>

        <div className="position-sizing-result">
          <div>
            <span>{language === "zh" ? "风险金额" : "Risk amount"}</span>
            <strong>${formatUsd(result.riskAmount)}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "建议数量" : "Suggested quantity"}</span>
            <strong>{result.quantity.toFixed(6)}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "建议仓位" : "Position value"}</span>
            <strong>${formatUsd(result.positionValue)}</strong>
          </div>

          <div>
            <span>{language === "zh" ? "仓位占比" : "Position size"}</span>

            <strong
              className={result.isBlocked ? "change down" : "change up"}
            >
              {result.positionPercent.toFixed(2)}%
            </strong>
          </div>
        </div>

        <div className="position-sizing-note">
          {result.isBlocked
            ? language === "zh"
              ? `建议仓位超过最大仓位 ${maxPositionPercent}%，请降低单笔风险。`
              : `Suggested size exceeds the ${maxPositionPercent}% position limit. Reduce the risk per trade.`
            : language === "zh"
              ? `如果价格触发止损，预计最多亏损 $${formatUsd(result.riskAmount)}。`
              : `If the stop is triggered, the estimated loss is $${formatUsd(result.riskAmount)}.`}
        </div>
      </article>
    </section>
  )
}