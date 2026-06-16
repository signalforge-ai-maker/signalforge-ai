import type { KlineRow, StrategyType } from "./market"

export type BacktestConfig = {
  strategy: StrategyType
  initialCash: number
  orderSizePercent: number
  feeRatePercent: number
  stopLossPercent: number
  takeProfitPercent: number
}

export type BacktestTrade = {
  side: "buy" | "sell"
  price: number
  quantity: number
  value: number
  fee: number
  reason: string
  time: number
  pnl?: number
}

export type EquityPoint = {
  time: number
  equity: number
}

export type BacktestResult = {
  initialCash: number
  finalEquity: number
  totalReturnPercent: number
  maxDrawdownPercent: number
  winRatePercent: number
  trades: BacktestTrade[]
  equityCurve: EquityPoint[]
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getSma(rows: KlineRow[], index: number, period: number) {
  if (index + 1 < period) return null

  const window = rows.slice(index + 1 - period, index + 1)
  return average(window.map((row) => row.close))
}

function getMomentumSignal(rows: KlineRow[], index: number) {
  const ma7 = getSma(rows, index, 7)
  const ma25 = getSma(rows, index, 25)

  if (ma7 === null || ma25 === null) return "watch"

  const current = rows[index]
  const previous = rows[index - 1]
  const changePercent = ((current.close - previous.close) / previous.close) * 100

  if (current.close > ma7 && ma7 > ma25 && changePercent > 0) {
    return "buy"
  }

  if (current.close < ma7 || ma7 < ma25) {
    return "sell"
  }

  return "watch"
}

function getStrategySignal(rows: KlineRow[], index: number, strategy: StrategyType) {
  if (strategy === "momentum") {
    return getMomentumSignal(rows, index)
  }

  return "watch"
}

function getMaxDrawdownPercent(equityCurve: EquityPoint[]) {
  let peak = equityCurve[0]?.equity ?? 0
  let maxDrawdown = 0

  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity)

    if (peak > 0) {
      const drawdown = ((peak - point.equity) / peak) * 100
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
  }

  return maxDrawdown
}

export function runBacktest(rows: KlineRow[], config: BacktestConfig): BacktestResult {
  if (rows.length < 30 || config.initialCash <= 0) {
    return {
      initialCash: config.initialCash,
      finalEquity: config.initialCash,
      totalReturnPercent: 0,
      maxDrawdownPercent: 0,
      winRatePercent: 0,
      trades: [],
      equityCurve: []
    }
  }
  let cash = config.initialCash
  let quantity = 0
  let entryPrice = 0

  const trades: BacktestTrade[] = []
  const equityCurve: EquityPoint[] = []

  for (let index = 25; index < rows.length - 1; index += 1) {
    const signal = getStrategySignal(rows, index, config.strategy)
    const current = rows[index]
    const next = rows[index + 1]

    const positionValue = quantity * current.close
    const equity = cash + positionValue

    equityCurve.push({
      time: current.openTime,
      equity
    })

    const hasPosition = quantity > 0

    if (hasPosition) {
      const pnlPercent = ((current.close - entryPrice) / entryPrice) * 100
      const shouldStop = pnlPercent <= -config.stopLossPercent
      const shouldTakeProfit = pnlPercent >= config.takeProfitPercent
      const shouldExitBySignal = signal === "sell"

      if (shouldStop || shouldTakeProfit || shouldExitBySignal) {
        const exitPrice = next.open
        const value = quantity * exitPrice
        const fee = value * (config.feeRatePercent / 100)
        const pnl = value - quantity * entryPrice - fee

        cash += value - fee

        trades.push({
          side: "sell",
          price: exitPrice,
          quantity,
          value,
          fee,
          pnl,
          reason: shouldStop ? "Stop loss" : shouldTakeProfit ? "Take profit" : "Strategy exit",
          time: next.openTime
        })

        quantity = 0
        entryPrice = 0
      }
    }

    if (!hasPosition && signal === "buy") {
      const budget = cash * (config.orderSizePercent / 100)
      const entry = next.open
      const fee = budget * (config.feeRatePercent / 100)
      const filledQuantity = (budget - fee) / entry

      cash -= budget
      quantity = filledQuantity
      entryPrice = entry

      trades.push({
        side: "buy",
        price: entry,
        quantity: filledQuantity,
        value: budget,
        fee,
        reason: "Momentum entry",
        time: next.openTime
      })
    }
  }

  const last = rows.at(-1)
  const finalEquity = last ? cash + quantity * last.close : cash
  const totalReturnPercent = ((finalEquity - config.initialCash) / config.initialCash) * 100

  const closedTrades = trades.filter((trade) => trade.side === "sell")
  const winningTrades = closedTrades.filter((trade) => (trade.pnl ?? 0) > 0)
  const winRatePercent = closedTrades.length ? (winningTrades.length / closedTrades.length) * 100 : 0

  return {
    initialCash: config.initialCash,
    finalEquity,
    totalReturnPercent,
    maxDrawdownPercent: getMaxDrawdownPercent(equityCurve),
    winRatePercent,
    trades,
    equityCurve
  }
}
