export const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr"
export const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
export const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"

export type MarketRow = {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume: string
  count: number
}

export type RadarSource = "live" | "demo"

export type ScoredMarketRow = MarketRow & {
  score: number
}

export type BotAction = "watch" | "paper-long" | "risk-off"

export type StrategyType = "momentum" | "reversal" | "grid" | "dca" | "scheduled-dca" | "rebalance" | "ai-signal"

export type BotPlan = {
  symbol: string
  strategy: StrategyType
  strategyName: string
  action: BotAction
  confidence: number
  allocationPercent: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  rationale: string
}

export type KlineInterval = "15m" | "1h" | "4h" | "1d"

export type KlineRow = {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type IndicatorPoint = {
  openTime: number
  value: number | null
}

export type ChartIndicators = {
  ma7: IndicatorPoint[]
  ma25: IndicatorPoint[]
  rsi: IndicatorPoint[]
  support: number
  resistance: number
}

export type NewsArticle = {
  title: string
  url: string
  domain: string
  seenDate: string
}

export type NewsSentiment = {
  label: "Positive" | "Neutral" | "Negative"
  score: number
  articles: NewsArticle[]
  summary: string
  source: "news" | "market"
}

export const fallbackRows: MarketRow[] = [
  { symbol: "BTCUSDT", lastPrice: "64280.12", priceChangePercent: "1.84", quoteVolume: "28500000000", count: 1854000 },
  { symbol: "ETHUSDT", lastPrice: "3182.40", priceChangePercent: "0.92", quoteVolume: "12900000000", count: 1269000 },
  { symbol: "SOLUSDT", lastPrice: "146.22", priceChangePercent: "5.31", quoteVolume: "4200000000", count: 693000 },
  { symbol: "BNBUSDT", lastPrice: "592.10", priceChangePercent: "-0.44", quoteVolume: "930000000", count: 214000 },
  { symbol: "XRPUSDT", lastPrice: "0.5981", priceChangePercent: "2.28", quoteVolume: "1700000000", count: 407000 },
  { symbol: "DOGEUSDT", lastPrice: "0.1248", priceChangePercent: "-3.42", quoteVolume: "880000000", count: 352000 }
]

export const watchlists = [
  {
    label: "Core majors",
    value: "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT"
  },
  {
    label: "High beta",
    value: "BTCUSDT,ETHUSDT,SOLUSDT,AVAXUSDT,LINKUSDT,NEARUSDT"
  },
  {
    label: "Large cap",
    value: "BTCUSDT,ETHUSDT,BNBUSDT,ADAUSDT,TRXUSDT,DOTUSDT"
  }
] as const

export const klineIntervals: KlineInterval[] = ["15m", "1h", "4h", "1d"]

export const strategyOptions: Array<{ label: string; value: StrategyType }> = [
  { label: "Momentum", value: "momentum" },
  { label: "Reversal", value: "reversal" },
  { label: "Grid", value: "grid" },
  { label: "DCA", value: "dca" },
  { label: "Scheduled DCA", value: "scheduled-dca" },
  { label: "Rebalance", value: "rebalance" },
  { label: "AI Signal", value: "ai-signal" }
]

export const strategyDetails: Record<StrategyType, { description: string; entryBias: string; risk: string }> = {
  momentum: {
    description: "Follows strong direction when price, volume, and activity are already moving together.",
    entryBias: "Buy strength",
    risk: "Late entries can chase an exhausted move."
  },
  reversal: {
    description: "Watches controlled selloffs for a possible rebound after downside pressure cools.",
    entryBias: "Buy pullback",
    risk: "A weak bounce can continue lower."
  },
  grid: {
    description: "Simulates range trading when price is calmer and liquidity is high enough.",
    entryBias: "Range base",
    risk: "Strong trends can break the grid range."
  },
  dca: {
    description: "Builds a position gradually instead of committing the full size at one price.",
    entryBias: "Accumulate",
    risk: "A long drawdown can keep tying up capital."
  },
  "scheduled-dca": {
    description: "Simulates buying a fixed amount on a fixed cadence, independent of short-term timing.",
    entryBias: "Time based",
    risk: "Keeps buying through weak market regimes unless risk limits stop it."
  },
  rebalance: {
    description: "Models rotating capital back toward target portfolio weights across selected assets.",
    entryBias: "Weight drift",
    risk: "Rebalancing too often can overtrade noisy moves."
  },
  "ai-signal": {
    description: "Combines market movement, liquidity, activity, volatility, and future news sentiment inputs into one recommendation.",
    entryBias: "Multi-factor",
    risk: "Model confidence can be wrong when inputs are incomplete or stale."
  }
}

export function formatSymbol(symbol: string) {
  return symbol.replace("USDT", "/USDT")
}

export function formatPrice(value: string) {
  const price = Number(value)
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 })
  if (price >= 1) return price.toLocaleString("en-US", { maximumFractionDigits: 2 })
  return price.toLocaleString("en-US", { maximumFractionDigits: 5 })
}

export function formatVolume(value: string) {
  const volume = Number(value)
  if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(1)}B`
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(0)}M`
  return `$${volume.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

function clampScore(value: number) {
  return Math.min(100, Math.max(-100, Math.round(value)))
}

function getNewsQuery(symbol: string) {
  const asset = symbol.replace("USDT", "")
  const names: Record<string, string> = {
    BTC: "Bitcoin OR BTC",
    ETH: "Ethereum OR ETH",
    SOL: "Solana OR SOL",
    BNB: "BNB",
    XRP: "XRP",
    DOGE: "Dogecoin OR DOGE",
    AVAX: "Avalanche OR AVAX",
    LINK: "Chainlink OR LINK",
    NEAR: "NEAR Protocol OR NEAR",
    ADA: "Cardano OR ADA",
    TRX: "Tron OR TRX",
    DOT: "Polkadot OR DOT"
  }

  return `(${names[asset] ?? asset}) crypto`
}

function scoreHeadline(title: string) {
  const lowerTitle = title.toLowerCase()
  const positiveWords = ["rally", "surge", "gain", "jump", "bull", "record", "approval", "inflow", "adoption", "partnership", "launch"]
  const negativeWords = ["crash", "fall", "drop", "hack", "lawsuit", "ban", "outflow", "fraud", "risk", "selloff", "probe", "liquidation"]
  const positiveScore = positiveWords.filter((word) => lowerTitle.includes(word)).length * 18
  const negativeScore = negativeWords.filter((word) => lowerTitle.includes(word)).length * 18

  return positiveScore - negativeScore
}

export function analyzeNewsSentiment(articles: NewsArticle[]): NewsSentiment {
  if (!articles.length) {
    return {
      label: "Neutral",
      score: 0,
      articles,
      summary: "No fresh headlines were found for this asset.",
      source: "news"
    }
  }

  const rawScore = articles.reduce((sum, article) => sum + scoreHeadline(article.title), 0) / Math.max(articles.length, 1)
  const score = clampScore(rawScore)
  const label = score >= 12 ? "Positive" : score <= -12 ? "Negative" : "Neutral"
  const summary =
    label === "Positive"
      ? "Recent headlines lean constructive for this asset."
      : label === "Negative"
        ? "Recent headlines lean cautious or risk-heavy."
        : "Recent headlines are mixed or low-signal."

  return {
    label,
    score,
    articles,
    summary,
    source: "news"
  }
}

export function buildMarketSentiment(row?: MarketRow): NewsSentiment {
  if (!row) {
    return {
      label: "Neutral",
      score: 0,
      articles: [],
      summary: "News source is offline, so sentiment is using market-only fallback data.",
      source: "market"
    }
  }

  const change = Number(row.priceChangePercent)
  const volume = Number(row.quoteVolume)
  const volumeBias = volume >= 1_000_000_000 ? 10 : volume >= 300_000_000 ? 4 : -4
  const score = clampScore(change * 10 + volumeBias)
  const label = score >= 12 ? "Positive" : score <= -12 ? "Negative" : "Neutral"

  return {
    label,
    score,
    articles: [],
    summary: "News source is offline; this fallback sentiment uses 24h price change and liquidity only.",
    source: "market"
  }
}

export function scoreAsset(row: MarketRow) {
  const change = Number(row.priceChangePercent)
  const volume = Number(row.quoteVolume)
  const trades = Number(row.count)
  const momentumScore = Math.min(Math.abs(change) * 9, 45)
  const volumeScore = Math.min(Math.log10(Math.max(volume, 1)) * 4, 35)
  const activityScore = Math.min(Math.log10(Math.max(trades, 1)) * 3, 20)
  return Math.round(momentumScore + volumeScore + activityScore)
}

export function scoreAssetForStrategy(row: MarketRow, strategy: StrategyType) {
  const baseScore = scoreAsset(row)
  const change = Number(row.priceChangePercent)
  const volume = Number(row.quoteVolume)

  if (strategy === "reversal") {
    const reversalFit = change <= -1 && change >= -5 ? 28 : -16
    const panicPenalty = change < -7 ? -34 : 0
    return Math.max(0, baseScore + reversalFit + panicPenalty)
  }

  if (strategy === "grid") {
    const rangeFit = Math.abs(change) <= 2.5 ? 30 : -22
    const liquidityFit = volume >= 300_000_000 ? 12 : -6
    return Math.max(0, baseScore + rangeFit + liquidityFit)
  }

  if (strategy === "dca") {
    const accumulationFit = change >= -5 && change <= 2 ? 24 : -14
    const crashPenalty = change < -8 ? -36 : 0
    return Math.max(0, baseScore + accumulationFit + crashPenalty)
  }

  if (strategy === "scheduled-dca") {
    const steadyAssetFit = Math.abs(change) <= 6 ? 18 : -18
    const liquidityFit = volume >= 500_000_000 ? 16 : -8
    return Math.max(0, baseScore + steadyAssetFit + liquidityFit)
  }

  if (strategy === "rebalance") {
    const driftFit = Math.abs(change) >= 1.5 && Math.abs(change) <= 7 ? 20 : -8
    const liquidityFit = volume >= 500_000_000 ? 14 : -10
    return Math.max(0, baseScore + driftFit + liquidityFit)
  }

  if (strategy === "ai-signal") {
    const volatilityFit = Math.abs(change) <= 6 ? 10 : -18
    const directionFit = change > -4 ? 10 : -12
    const liquidityFit = volume >= 300_000_000 ? 12 : -8
    return Math.max(0, baseScore + volatilityFit + directionFit + liquidityFit)
  }

  return baseScore
}

export function getTopSignal(rows: MarketRow[], strategy: StrategyType = "momentum"): ScoredMarketRow | undefined {
  return rows
    .map((row) => ({ ...row, score: scoreAssetForStrategy(row, strategy) }))
    .sort((a, b) => b.score - a.score)[0]
}

export function scoreMarketRow(row: MarketRow, strategy: StrategyType = "momentum"): ScoredMarketRow {
  return { ...row, score: scoreAssetForStrategy(row, strategy) }
}

export function buildReason(row: MarketRow, score: number) {
  const change = Number(row.priceChangePercent)
  const direction = change >= 0 ? "upside momentum" : "downside pressure"
  const risk = Math.abs(change) >= 4 ? "elevated volatility" : "moderate volatility"
  return `${direction} with ${formatVolume(row.quoteVolume)} 24h volume. Score ${score}/100; ${risk}.`
}

export function buildBotPlan(row?: ScoredMarketRow, strategy: StrategyType = "momentum"): BotPlan | undefined {
  if (!row) return undefined

  const change = Number(row.priceChangePercent)
  const price = Number(row.lastPrice)
  const volume = Number(row.quoteVolume)
  const confidence = Math.max(0, Math.min(row.score, 100))
  const highRiskMove = Math.abs(change) >= 5
  const strategyName = strategyOptions.find((option) => option.value === strategy)?.label ?? "Momentum"
  let action: BotAction = "watch"
  let allocationPercent = 0
  let stopLoss = price * 0.97
  let takeProfit = price * 1.045
  let rationale = "Signal quality is not strong enough; the bot keeps watching."

  if (strategy === "reversal") {
    const controlledSelloff = change <= -1 && change >= -5
    action = change <= -7 ? "risk-off" : confidence >= 60 && controlledSelloff ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? 3 : 0
    stopLoss = price * 0.97
    takeProfit = price * 1.04
    rationale =
      action === "paper-long"
        ? "Selloff is controlled and activity remains healthy, so the bot tests a simulated reversal entry."
        : action === "risk-off"
          ? "The drop is too sharp, so reversal mode avoids catching a falling market."
          : "No clean reversal setup yet; the bot keeps observing."
  } else if (strategy === "grid") {
    const rangeMarket = Math.abs(change) <= 2.5 && volume >= 300_000_000
    action = Math.abs(change) >= 6 ? "risk-off" : confidence >= 55 && rangeMarket ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? 2 : 0
    stopLoss = price * 0.965
    takeProfit = price * 1.018
    rationale =
      action === "paper-long"
        ? "Price is moving inside a liquid range, so the bot simulates a small grid base position."
        : action === "risk-off"
          ? "Market is moving too strongly for a range grid."
          : "Grid mode needs a calmer, more liquid range."
  } else if (strategy === "dca") {
    const accumulationWindow = change >= -5 && change <= 2
    action = change <= -8 ? "risk-off" : confidence >= 58 && accumulationWindow ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? 2 : 0
    stopLoss = price * 0.94
    takeProfit = price * 1.055
    rationale =
      action === "paper-long"
        ? "Price is inside an accumulation window, so the bot simulates the first DCA tranche."
        : action === "risk-off"
          ? "The drawdown is too aggressive, so DCA mode pauses new simulated buys."
          : "DCA mode is waiting for a better accumulation window."
  } else if (strategy === "scheduled-dca") {
    const liquidEnough = volume >= 500_000_000
    action = Math.abs(change) >= 8 ? "risk-off" : confidence >= 52 && liquidEnough ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? 1 : 0
    stopLoss = price * 0.9
    takeProfit = price * 1.08
    rationale =
      action === "paper-long"
        ? "Scheduled DCA simulates a small fixed tranche because the asset is liquid enough for recurring buys."
        : action === "risk-off"
          ? "Volatility is too high, so the scheduled tranche is paused by risk rules."
          : "Scheduled DCA is waiting for enough liquidity before the next simulated tranche."
  } else if (strategy === "rebalance") {
    const tradableDrift = Math.abs(change) >= 1.5 && volume >= 500_000_000
    action = Math.abs(change) >= 9 ? "risk-off" : confidence >= 55 && tradableDrift ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? 2 : 0
    stopLoss = price * 0.96
    takeProfit = price * 1.035
    rationale =
      action === "paper-long"
        ? "Portfolio drift is meaningful enough to simulate a small rebalance toward the target mix."
        : action === "risk-off"
          ? "Move is too extreme for a clean rebalance."
          : "Rebalance mode needs clearer weight drift or stronger liquidity."
  } else if (strategy === "ai-signal") {
    const modelReady = volume >= 300_000_000 && Math.abs(change) <= 6
    action = change <= -7 ? "risk-off" : confidence >= 65 && modelReady ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? Math.min(4, Math.max(1, Math.round(confidence / 28))) : 0
    stopLoss = price * 0.965
    takeProfit = price * 1.05
    rationale =
      action === "paper-long"
        ? "AI Signal mode combines price action, liquidity, activity, and volatility into a simulated long recommendation."
        : action === "risk-off"
          ? "Downside pressure is too high for the AI signal to recommend a new entry."
          : "AI Signal mode is waiting for stronger multi-factor confirmation."
  } else {
    action = highRiskMove ? "risk-off" : confidence >= 68 && change > 0 ? "paper-long" : "watch"
    allocationPercent = action === "paper-long" ? Math.min(5, Math.max(1, Math.round(confidence / 20))) : 0
    stopLoss = price * (highRiskMove ? 0.96 : 0.97)
    takeProfit = price * 1.045
    rationale =
      action === "paper-long"
        ? "Momentum and activity are strong enough for a small simulated long."
        : action === "risk-off"
          ? "Volatility is elevated, so the bot avoids opening a new paper position."
          : "Signal quality is not strong enough; the bot keeps watching."
  }

  return {
    symbol: row.symbol,
    strategy,
    strategyName,
    action,
    confidence,
    allocationPercent,
    entryPrice: price,
    stopLoss,
    takeProfit,
    rationale
  }
}

export async function fetchMarketRows(symbols: string[]): Promise<MarketRow[]> {
  const response = await fetch(BINANCE_TICKER_URL)
  if (!response.ok) throw new Error(`Market API returned ${response.status}`)

  const rows = (await response.json()) as MarketRow[]
  const filtered = rows
    .filter((row) => symbols.includes(row.symbol))
    .sort((a, b) => scoreAsset(b) - scoreAsset(a))

  if (!filtered.length) throw new Error("No matching symbols returned")
  return filtered
}

export async function fetchKlines(symbol: string, interval: KlineInterval): Promise<KlineRow[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: "60"
  })
  const response = await fetch(`${BINANCE_KLINES_URL}?${params.toString()}`)
  if (!response.ok) throw new Error(`Kline API returned ${response.status}`)

  const rows = (await response.json()) as unknown[][]
  return rows.map((row) => ({
    openTime: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5])
  }))
}

export async function fetchNewsSentiment(symbol: string): Promise<NewsSentiment> {
  const params = new URLSearchParams({
    query: getNewsQuery(symbol),
    mode: "artlist",
    format: "json",
    maxrecords: "8",
    sort: "datedesc"
  })
  const response = await fetch(`${GDELT_DOC_URL}?${params.toString()}`)
  if (!response.ok) throw new Error(`News API returned ${response.status}`)

  const payload = (await response.json()) as {
    articles?: Array<{
      title?: string
      url?: string
      domain?: string
      seendate?: string
    }>
  }
  const articles = (payload.articles ?? [])
    .filter((article) => article.title && article.url)
    .map((article) => ({
      title: article.title ?? "",
      url: article.url ?? "",
      domain: article.domain ?? "news",
      seenDate: article.seendate ?? ""
    }))

  return analyzeNewsSentiment(articles)
}

export function calculateSma(rows: KlineRow[], period: number): IndicatorPoint[] {
  return rows.map((row, index) => {
    if (index + 1 < period) return { openTime: row.openTime, value: null }

    const window = rows.slice(index + 1 - period, index + 1)
    const average = window.reduce((sum, item) => sum + item.close, 0) / period
    return { openTime: row.openTime, value: average }
  })
}

export function calculateRsi(rows: KlineRow[], period = 14): IndicatorPoint[] {
  return rows.map((row, index) => {
    if (index < period) return { openTime: row.openTime, value: null }

    const window = rows.slice(index + 1 - period, index + 1)
    let gains = 0
    let losses = 0

    window.forEach((item, windowIndex) => {
      if (windowIndex === 0) return
      const previous = window[windowIndex - 1]
      const delta = item.close - previous.close
      if (delta >= 0) gains += delta
      else losses += Math.abs(delta)
    })

    const averageGain = gains / period
    const averageLoss = losses / period
    const value = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss)
    return { openTime: row.openTime, value }
  })
}

export function calculateChartIndicators(rows: KlineRow[]): ChartIndicators {
  const recentRows = rows.slice(-30)
  const support = Math.min(...recentRows.map((row) => row.low))
  const resistance = Math.max(...recentRows.map((row) => row.high))

  return {
    ma7: calculateSma(rows, 7),
    ma25: calculateSma(rows, 25),
    rsi: calculateRsi(rows),
    support,
    resistance
  }
}
