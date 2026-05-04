import { useCallback, useEffect, useMemo, useState } from "react"

import iconUrl from "data-base64:~../assets/icon-48.png"

import {
  buildBotPlan,
  buildReason,
  buildMarketSentiment,
  calculateChartIndicators,
  fallbackRows,
  fetchKlines,
  fetchMarketRows,
  fetchNewsSentiment,
  formatPrice,
  formatSymbol,
  formatVolume,
  getTopSignal,
  klineIntervals,
  scoreMarketRow,
  strategyDetails,
  strategyOptions,
  type ChartIndicators,
  type KlineInterval,
  type KlineRow,
  type MarketRow,
  type NewsSentiment,
  type RadarSource,
  type StrategyType,
  watchlists
} from "~src/market"

import "~src/popup.css"

type RadarState = "Scanning" | "Live scan" | "Demo data"
type ChartState = "Loading" | "Ready" | "Demo" | "Error"
type NewsState = "Loading" | "Ready" | "Error"

type PaperPosition = {
  symbol: string
  marketType: MarketType
  leverage: number
  quantity: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  openedAt: string
}

type BotSettings = {
  marketType: MarketType
  strategyType: StrategyType
  leverage: number
  orderSizePercent: number
  stopLossPercent: number
  takeProfitPercent: number
  autoPaperTrading: boolean
}

type MarketType = "spot" | "futures"
type ExecutionMode = "alert-only" | "manual-confirm" | "auto-execute"

type RiskSettings = {
  dailyMaxLossPercent: number
  maxPositionPercent: number
  pauseAfterLosses: number
  executionMode: ExecutionMode
}

type RiskCheckStatus = "allowed" | "needs-confirmation" | "blocked"

type RiskCheck = {
  status: RiskCheckStatus
  label: string
  reason: string
  realizedLossPercent: number
  consecutiveLosses: number
}

type OrderEvent = {
  id: string
  symbol: string
  marketType: MarketType
  leverage: number
  side: "open" | "close"
  price: number
  size: number
  pnl?: number
  reason: string
  timestamp: string
}

type PersistedBotState = {
  watchlist: string
  tradeTarget: string
  klineInterval: KlineInterval
  botSettings: BotSettings
  riskSettings: RiskSettings
  paperCash: number
  paperPosition: PaperPosition | null
  orderHistory: OrderEvent[]
}

const STORAGE_KEY = "signalforge.paperBotState"

function getSignalBadge(signal?: MarketRow) {
  if (!signal) return { label: "Neutral", mode: "" }

  const change = Number(signal.priceChangePercent)
  if (Math.abs(change) >= 4) return { label: "High activity", mode: "hot" }
  if (change < -2) return { label: "Risk watch", mode: "risk" }
  return { label: "Neutral", mode: "" }
}

function getSentimentClass(label?: string) {
  if (label === "Positive") return "positive"
  if (label === "Negative") return "negative"
  return "neutral"
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatUsd(value: number) {
  const digits = value >= 1000 ? 0 : 2

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  })
}

function getBotActionLabel(action?: string) {
  if (action === "paper-long") return "Paper long"
  if (action === "risk-off") return "Risk-off"
  return "Watch"
}

function getMarketLabel(marketType: MarketType, leverage: number) {
  return marketType === "futures" ? `Futures ${leverage}x` : "Spot"
}

function getExecutionModeLabel(mode: ExecutionMode) {
  if (mode === "manual-confirm") return "Manual confirm"
  if (mode === "auto-execute") return "Auto execute"
  return "Alert only"
}

function getRiskCheckClass(status: RiskCheckStatus) {
  if (status === "allowed") return "allowed"
  if (status === "needs-confirmation") return "confirm"
  return "blocked"
}

function normalizeExecutionMode(value?: string): ExecutionMode {
  if (value === "manual-confirm" || value === "auto-execute" || value === "alert-only") {
    return value
  }

  return "manual-confirm"
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function canUseChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local)
}

function normalizeStrategyType(value?: string): StrategyType {
  if (
    value === "reversal" ||
    value === "grid" ||
    value === "dca" ||
    value === "scheduled-dca" ||
    value === "rebalance" ||
    value === "ai-signal" ||
    value === "momentum"
  ) {
    return value
  }

  return "momentum"
}

function AssetRow({ row }: { row: MarketRow }) {
  const change = Number(row.priceChangePercent)

  return (
    <article className="asset-row">
      <div className="asset-main">
        <span className="symbol">{formatSymbol(row.symbol)}</span>
        <span className="price">${formatPrice(row.lastPrice)}</span>
      </div>
      <div className="asset-metrics">
        <strong className={change >= 0 ? "change up" : "change down"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </strong>
        <span className="volume">{formatVolume(row.quoteVolume)}</span>
      </div>
    </article>
  )
}

function buildPath(points: Array<{ x: number; y: number; value: number | null }>) {
  return points
    .filter((point) => point.value !== null)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
}

function CandlestickChart({ indicators, rows }: { indicators: ChartIndicators; rows: KlineRow[] }) {
  const width = 320
  const priceHeight = 132
  const volumeHeight = 34
  const rsiHeight = 44
  const gap = 10
  const height = priceHeight + volumeHeight + rsiHeight + gap * 2
  const padding = 10
  const candleWidth = 6
  const lows = rows.map((row) => row.low)
  const highs = rows.map((row) => row.high)
  const indicatorValues = [...indicators.ma7, ...indicators.ma25]
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  const min = Math.min(...lows, indicators.support, ...indicatorValues)
  const max = Math.max(...highs, indicators.resistance, ...indicatorValues)
  const maxVolume = Math.max(...rows.map((row) => row.volume), 1)
  const range = max - min || 1
  const xStep = (width - padding * 2) / Math.max(rows.length - 1, 1)
  const priceYFor = (price: number) => padding + ((max - price) / range) * (priceHeight - padding * 2)
  const volumeTop = priceHeight + gap
  const rsiTop = volumeTop + volumeHeight + gap
  const rsiYFor = (value: number) => rsiTop + ((100 - value) / 100) * rsiHeight
  const ma7Path = buildPath(indicators.ma7.map((point, index) => ({
    x: padding + index * xStep,
    y: point.value === null ? 0 : priceYFor(point.value),
    value: point.value
  })))
  const ma25Path = buildPath(indicators.ma25.map((point, index) => ({
    x: padding + index * xStep,
    y: point.value === null ? 0 : priceYFor(point.value),
    value: point.value
  })))
  const rsiPath = buildPath(indicators.rsi.map((point, index) => ({
    x: padding + index * xStep,
    y: point.value === null ? 0 : rsiYFor(point.value),
    value: point.value
  })))
  const last = rows.at(-1)
  const lastRsi = indicators.rsi.findLast((point) => point.value !== null)?.value

  return (
    <div className="chart-frame">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Candlestick chart">
        <line className="chart-grid-line" x1={padding} x2={width - padding} y1={padding} y2={padding} />
        <line className="chart-grid-line" x1={padding} x2={width - padding} y1={priceHeight / 2} y2={priceHeight / 2} />
        <line className="chart-grid-line" x1={padding} x2={width - padding} y1={priceHeight - padding} y2={priceHeight - padding} />
        <line className="support-line" x1={padding} x2={width - padding} y1={priceYFor(indicators.support)} y2={priceYFor(indicators.support)} />
        <line className="resistance-line" x1={padding} x2={width - padding} y1={priceYFor(indicators.resistance)} y2={priceYFor(indicators.resistance)} />
        <text className="chart-level-label support" x={width - padding} y={priceYFor(indicators.support) - 3}>S</text>
        <text className="chart-level-label resistance" x={width - padding} y={priceYFor(indicators.resistance) + 10}>R</text>
        {rows.map((row, index) => {
          const x = padding + index * xStep
          const openY = priceYFor(row.open)
          const closeY = priceYFor(row.close)
          const highY = priceYFor(row.high)
          const lowY = priceYFor(row.low)
          const up = row.close >= row.open
          const bodyTop = Math.min(openY, closeY)
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2)
          const volumeBarHeight = Math.max((row.volume / maxVolume) * volumeHeight, 1)

          return (
            <g key={row.openTime}>
              <g className={up ? "candle up" : "candle down"}>
                <line x1={x} x2={x} y1={highY} y2={lowY} />
                <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" />
              </g>
              <rect
                className={up ? "volume-bar up" : "volume-bar down"}
                x={x - candleWidth / 2}
                y={volumeTop + volumeHeight - volumeBarHeight}
                width={candleWidth}
                height={volumeBarHeight}
                rx="1"
              />
            </g>
          )
        })}
        <path className="ma-line ma7" d={ma7Path} />
        <path className="ma-line ma25" d={ma25Path} />
        <line className="rsi-guide overbought" x1={padding} x2={width - padding} y1={rsiYFor(70)} y2={rsiYFor(70)} />
        <line className="rsi-guide oversold" x1={padding} x2={width - padding} y1={rsiYFor(30)} y2={rsiYFor(30)} />
        <path className="rsi-line" d={rsiPath} />
      </svg>
      <div className="indicator-legend">
        <span className="ma7">MA7</span>
        <span className="ma25">MA25</span>
        <span>RSI {lastRsi === undefined ? "--" : lastRsi.toFixed(0)}</span>
        <span>S ${formatPrice(String(indicators.support))}</span>
        <span>R ${formatPrice(String(indicators.resistance))}</span>
      </div>
      {last ? (
        <div className="chart-price-row">
          <span>Range ${formatPrice(String(min))} - ${formatPrice(String(max))}</span>
          <strong className={last.close >= last.open ? "change up" : "change down"}>
            ${formatPrice(String(last.close))}
          </strong>
        </div>
      ) : null}
    </div>
  )
}

function Popup() {
  const [storageReady, setStorageReady] = useState(false)
  const [watchlist, setWatchlist] = useState<string>(watchlists[0].value)
  const [tradeTarget, setTradeTarget] = useState("auto")
  const [rows, setRows] = useState<MarketRow[]>([])
  const [source, setSource] = useState<RadarSource>("live")
  const [radarState, setRadarState] = useState<RadarState>("Scanning")
  const [chartState, setChartState] = useState<ChartState>("Loading")
  const [chartError, setChartError] = useState("")
  const [klineInterval, setKlineInterval] = useState<KlineInterval>("1h")
  const [klines, setKlines] = useState<KlineRow[]>([])
  const [newsState, setNewsState] = useState<NewsState>("Loading")
  const [newsSentiment, setNewsSentiment] = useState<NewsSentiment | null>(null)
  const [newsError, setNewsError] = useState("")
  const [updatedAt, setUpdatedAt] = useState("--")
  const [error, setError] = useState("")
  const [botSettings, setBotSettings] = useState<BotSettings>({
    marketType: "spot",
    strategyType: "momentum",
    leverage: 3,
    orderSizePercent: 5,
    stopLossPercent: 3,
    takeProfitPercent: 4.5,
    autoPaperTrading: false
  })
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    dailyMaxLossPercent: 3,
    maxPositionPercent: 10,
    pauseAfterLosses: 3,
    executionMode: "manual-confirm"
  })

  const symbols = useMemo(() => watchlist.split(","), [watchlist])
  const topSignal = useMemo(() => getTopSignal(rows), [rows])
  const strategySignal = useMemo(() => getTopSignal(rows, botSettings.strategyType), [botSettings.strategyType, rows])
  const selectedStrategyDetail = strategyDetails[botSettings.strategyType]
  const selectedSignal = useMemo(() => {
    if (tradeTarget === "auto") return strategySignal

    const selectedRow = rows.find((row) => row.symbol === tradeTarget)
    return selectedRow ? scoreMarketRow(selectedRow, botSettings.strategyType) : undefined
  }, [botSettings.strategyType, rows, strategySignal, tradeTarget])
  const chartSymbol = selectedSignal?.symbol ?? topSignal?.symbol ?? symbols[0]
  const chartIndicators = useMemo(() => (klines.length ? calculateChartIndicators(klines) : undefined), [klines])
  const badge = getSignalBadge(topSignal)
  const [paperCash, setPaperCash] = useState(10000)
  const [paperPosition, setPaperPosition] = useState<PaperPosition | null>(null)
  const [orderHistory, setOrderHistory] = useState<OrderEvent[]>([])
  const [lastAutoEntryKey, setLastAutoEntryKey] = useState("")
  const botPlan = useMemo(
    () => buildBotPlan(selectedSignal, botSettings.strategyType),
    [botSettings.strategyType, selectedSignal]
  )

  useEffect(() => {
    if (!canUseChromeStorage()) {
      setStorageReady(true)
      return
    }

    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const saved = result[STORAGE_KEY] as Partial<PersistedBotState> | undefined
      if (saved?.watchlist) setWatchlist(saved.watchlist)
      if (saved?.tradeTarget) setTradeTarget(saved.tradeTarget)
      if (saved?.klineInterval && klineIntervals.includes(saved.klineInterval)) {
        setKlineInterval(saved.klineInterval)
      }
      if (saved?.botSettings) {
        setBotSettings((settings) => ({
          ...settings,
          ...saved.botSettings,
          strategyType: normalizeStrategyType(saved.botSettings?.strategyType)
        }))
      }
      if (saved?.riskSettings) {
        setRiskSettings((settings) => ({
          ...settings,
          ...saved.riskSettings,
          executionMode: normalizeExecutionMode(saved.riskSettings?.executionMode)
        }))
      }
      if (typeof saved?.paperCash === "number") setPaperCash(saved.paperCash)
      if (saved?.paperPosition) setPaperPosition(saved.paperPosition)
      if (Array.isArray(saved?.orderHistory)) setOrderHistory(saved.orderHistory.slice(0, 6))
      setStorageReady(true)
    })
  }, [])

  useEffect(() => {
    if (!storageReady || !canUseChromeStorage()) return

    const state: PersistedBotState = {
      watchlist,
      tradeTarget,
      klineInterval,
      botSettings,
      riskSettings,
      paperCash,
      paperPosition,
      orderHistory
    }

    chrome.storage.local.set({ [STORAGE_KEY]: state })
  }, [botSettings, klineInterval, orderHistory, paperCash, paperPosition, riskSettings, storageReady, tradeTarget, watchlist])

  const configuredBotPlan = useMemo(() => {
    if (!botPlan) return undefined
    const sentimentBoost = botSettings.strategyType === "ai-signal" && newsSentiment ? Math.round(newsSentiment.score / 5) : 0
    const confidence = clamp(botPlan.confidence + sentimentBoost, 0, 100)
    const action =
      botSettings.strategyType === "ai-signal" && newsSentiment?.label === "Negative" && newsSentiment.score <= -35
        ? "risk-off"
        : botPlan.action
    const rationale =
      botSettings.strategyType === "ai-signal" && newsSentiment
        ? `${botPlan.rationale} News sentiment is ${newsSentiment.label.toLowerCase()} (${newsSentiment.score}).`
        : botPlan.rationale

    return {
      ...botPlan,
      action,
      confidence,
      rationale,
      allocationPercent: botSettings.orderSizePercent,
      stopLoss: botPlan.entryPrice * (1 - botSettings.stopLossPercent / 100),
      takeProfit: botPlan.entryPrice * (1 + botSettings.takeProfitPercent / 100)
    }
  }, [botPlan, botSettings, newsSentiment])

  const currentPositionRow = paperPosition ? rows.find((row) => row.symbol === paperPosition.symbol) : undefined
  const currentPositionPrice = Number(currentPositionRow?.lastPrice ?? paperPosition?.entryPrice ?? 0)
  const positionValue = paperPosition ? paperPosition.quantity * currentPositionPrice : 0
  const positionCost = paperPosition ? paperPosition.quantity * paperPosition.entryPrice : 0
  const paperPnl = paperPosition ? positionValue - positionCost : 0
  const equity = paperCash + positionValue
  const stopLossPrice = paperPosition?.stopLoss ?? 0
  const takeProfitPrice = paperPosition?.takeProfit ?? 0
  const riskCheck = useMemo<RiskCheck>(() => {
    const closedOrders = orderHistory.filter((order) => order.side === "close" && typeof order.pnl === "number")
    const realizedPnl = closedOrders.reduce((sum, order) => sum + (order.pnl ?? 0), 0)
    const realizedLossPercent = Math.max(0, (-realizedPnl / 10000) * 100)
    let consecutiveLosses = 0

    for (const order of closedOrders) {
      if ((order.pnl ?? 0) < 0) consecutiveLosses += 1
      else break
    }

    if (realizedLossPercent >= riskSettings.dailyMaxLossPercent) {
      return {
        status: "blocked",
        label: "Blocked",
        reason: "Daily loss limit reached.",
        realizedLossPercent,
        consecutiveLosses
      }
    }

    if (consecutiveLosses >= riskSettings.pauseAfterLosses) {
      return {
        status: "blocked",
        label: "Blocked",
        reason: "Consecutive loss pause is active.",
        realizedLossPercent,
        consecutiveLosses
      }
    }

    if ((configuredBotPlan?.allocationPercent ?? 0) > riskSettings.maxPositionPercent) {
      return {
        status: "blocked",
        label: "Blocked",
        reason: "Planned position is above the max position limit.",
        realizedLossPercent,
        consecutiveLosses
      }
    }

    if (riskSettings.executionMode === "alert-only") {
      return {
        status: "blocked",
        label: "Alert only",
        reason: "Signals are allowed, but order execution is disabled.",
        realizedLossPercent,
        consecutiveLosses
      }
    }

    if (riskSettings.executionMode === "manual-confirm") {
      return {
        status: "needs-confirmation",
        label: "Needs confirmation",
        reason: "Manual click is required before any paper entry.",
        realizedLossPercent,
        consecutiveLosses
      }
    }

    return {
      status: "allowed",
      label: "Allowed",
      reason: "Risk limits allow automated paper execution.",
      realizedLossPercent,
      consecutiveLosses
    }
  }, [configuredBotPlan?.allocationPercent, orderHistory, riskSettings])

  const updateBotSetting = useCallback(
    (key: keyof BotSettings, value: number | boolean | MarketType | StrategyType) => {
      setBotSettings((settings) => ({
        ...settings,
        [key]:
          key === "marketType" || key === "strategyType"
            ? value
            : key === "leverage"
            ? clamp(Number(value), 1, 20)
            : key === "orderSizePercent"
            ? clamp(Number(value), 1, 20)
            : key === "stopLossPercent"
              ? clamp(Number(value), 0.5, 20)
              : key === "takeProfitPercent"
                ? clamp(Number(value), 0.5, 50)
                : value
      }))
    },
    []
  )

  const updateRiskSetting = useCallback(
    (key: keyof RiskSettings, value: number | ExecutionMode) => {
      setRiskSettings((settings) => ({
        ...settings,
        [key]:
          key === "executionMode"
            ? value
            : key === "dailyMaxLossPercent"
              ? clamp(Number(value), 0.5, 20)
              : key === "maxPositionPercent"
                ? clamp(Number(value), 1, 50)
                : clamp(Number(value), 1, 10)
      }))
    },
    []
  )

  const addOrderEvent = useCallback((event: Omit<OrderEvent, "id" | "timestamp">) => {
    setOrderHistory((history) => [
      {
        ...event,
        id: `${Date.now()}-${event.side}-${event.symbol}`,
        timestamp: formatTime(new Date())
      },
      ...history
    ].slice(0, 6))
  }, [])

  const openPaperPosition = useCallback((reason = "Manual paper entry", source: "manual" | "auto" = "manual") => {
    if (!configuredBotPlan || configuredBotPlan.action !== "paper-long" || paperPosition) return
    if (riskCheck.status === "blocked") return
    if (source === "auto" && riskCheck.status !== "allowed") return

    const budget = paperCash * (configuredBotPlan.allocationPercent / 100)
    if (budget <= 0 || configuredBotPlan.entryPrice <= 0) return

    setPaperCash((cash) => cash - budget)
    setPaperPosition({
      symbol: configuredBotPlan.symbol,
      marketType: botSettings.marketType,
      leverage: botSettings.marketType === "futures" ? botSettings.leverage : 1,
      quantity: budget / configuredBotPlan.entryPrice,
      entryPrice: configuredBotPlan.entryPrice,
      stopLoss: configuredBotPlan.stopLoss,
      takeProfit: configuredBotPlan.takeProfit,
      openedAt: formatTime(new Date())
    })
    addOrderEvent({
      symbol: configuredBotPlan.symbol,
      marketType: botSettings.marketType,
      leverage: botSettings.marketType === "futures" ? botSettings.leverage : 1,
      side: "open",
      price: configuredBotPlan.entryPrice,
      size: budget,
      reason
    })
  }, [addOrderEvent, botSettings.leverage, botSettings.marketType, configuredBotPlan, paperCash, paperPosition, riskCheck.status])

  const closePaperPosition = useCallback((reason = "Manual paper close") => {
    if (!paperPosition) return

    setPaperCash((cash) => cash + positionValue)
    addOrderEvent({
      symbol: paperPosition.symbol,
      marketType: paperPosition.marketType,
      leverage: paperPosition.leverage,
      side: "close",
      price: currentPositionPrice,
      size: positionValue,
      pnl: paperPnl,
      reason
    })
    setPaperPosition(null)
  }, [addOrderEvent, currentPositionPrice, paperPnl, paperPosition, positionValue])

  useEffect(() => {
    if (!botSettings.autoPaperTrading || !configuredBotPlan || paperPosition) return
    if (configuredBotPlan.action !== "paper-long") return

    const autoEntryKey = `${configuredBotPlan.symbol}:${configuredBotPlan.entryPrice}:${configuredBotPlan.confidence}`
    if (autoEntryKey === lastAutoEntryKey) return

    setLastAutoEntryKey(autoEntryKey)
    openPaperPosition("Auto paper entry", "auto")
  }, [botSettings.autoPaperTrading, configuredBotPlan, lastAutoEntryKey, openPaperPosition, paperPosition])

  useEffect(() => {
    if (!paperPosition || !stopLossPrice || !takeProfitPrice || !currentPositionPrice) return
    if (currentPositionPrice <= stopLossPrice) {
      closePaperPosition("Stop loss")
    }
    if (currentPositionPrice >= takeProfitPrice) {
      closePaperPosition("Take profit")
    }
  }, [closePaperPosition, currentPositionPrice, paperPosition, stopLossPrice, takeProfitPrice])

  const loadMarketData = useCallback(async () => {
    setRadarState("Scanning")
    setError("")

    try {
      const marketRows = await fetchMarketRows(symbols)
      setRows(marketRows)
      if (tradeTarget !== "auto" && !marketRows.some((row) => row.symbol === tradeTarget)) {
        setTradeTarget("auto")
      }
      setSource("live")
      setRadarState("Live scan")
    } catch (caughtError) {
      console.warn(caughtError)
      setRows(fallbackRows)
      setSource("demo")
      setRadarState("Demo data")
      setError("Live market data is unavailable. Showing demo rows.")
    } finally {
      setUpdatedAt(formatTime(new Date()))
    }
  }, [symbols, tradeTarget])

  useEffect(() => {
    void loadMarketData()
  }, [loadMarketData])

  const loadKlines = useCallback(async () => {
    if (!chartSymbol) return

    setChartState("Loading")
    setChartError("")

    try {
      const rows = await fetchKlines(chartSymbol, klineInterval)
      setKlines(rows)
      setChartState("Ready")
    } catch (caughtError) {
      console.warn(caughtError)
      setKlines([])
      setChartState("Error")
      setChartError("Kline data is unavailable.")
    }
  }, [chartSymbol, klineInterval])

  useEffect(() => {
    void loadKlines()
  }, [loadKlines])

  const loadNewsSentiment = useCallback(async () => {
    if (!chartSymbol) return

    setNewsState("Loading")
    setNewsError("")

    try {
      const sentiment = await fetchNewsSentiment(chartSymbol)
      setNewsSentiment(sentiment)
      setNewsState("Ready")
    } catch (caughtError) {
      console.warn(caughtError)
      const fallbackSentiment = buildMarketSentiment(selectedSignal)
      setNewsSentiment(fallbackSentiment)
      setNewsState("Error")
      setNewsError("News source is offline. Showing market-only fallback.")
    }
  }, [chartSymbol, selectedSignal])

  useEffect(() => {
    void loadNewsSentiment()
  }, [loadNewsSentiment])

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <img src={iconUrl} alt="" className="brand-icon" />
          <div>
            <h1>SignalForge AI</h1>
            <p>Market radar</p>
          </div>
        </div>
        <button
          id="refreshButton"
          className="icon-button"
          type="button"
          aria-label="Refresh market data"
          title="Refresh"
          onClick={() => void loadMarketData()}>
          R
        </button>
      </header>

      <section className="status-panel" aria-live="polite">
        <div>
          <span className="label">Radar state</span>
          <strong>{radarState}</strong>
        </div>
        <div>
          <span className="label">Updated</span>
          <strong>{updatedAt}</strong>
        </div>
      </section>

      <section className="controls" aria-label="Watchlist controls">
        <label htmlFor="symbolSelect">Watchlist</label>
        <select
          id="symbolSelect"
          value={watchlist}
          onChange={(event) => setWatchlist(event.target.value)}>
          {watchlists.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </section>

      <section className="control-grid" aria-label="Trading mode controls">
        <label htmlFor="tradeTargetSelect">
          <span>Trade target</span>
          <select
            id="tradeTargetSelect"
            value={tradeTarget}
            onChange={(event) => setTradeTarget(event.target.value)}>
            <option value="auto">Auto top signal</option>
            {rows.map((row) => (
              <option key={row.symbol} value={row.symbol}>
                {formatSymbol(row.symbol)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="marketTypeSelect">
          <span>Market</span>
          <select
            id="marketTypeSelect"
            value={botSettings.marketType}
            onChange={(event) => updateBotSetting("marketType", event.target.value as MarketType)}>
            <option value="spot">Spot</option>
            <option value="futures">Futures</option>
          </select>
        </label>
        <label htmlFor="strategyTypeSelect">
          <span>Strategy</span>
          <select
            id="strategyTypeSelect"
            value={botSettings.strategyType}
            onChange={(event) => updateBotSetting("strategyType", event.target.value as StrategyType)}>
            {strategyOptions.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="strategy-detail" aria-label="Strategy detail">
        <div className="strategy-detail-head">
          <strong>{strategyOptions.find((strategy) => strategy.value === botSettings.strategyType)?.label}</strong>
          <span>Detail</span>
        </div>
        <p>{selectedStrategyDetail.description}</p>
        <div className="strategy-detail-grid">
          <div>
            <span>Entry bias</span>
            <strong>{selectedStrategyDetail.entryBias}</strong>
          </div>
          <div>
            <span>Risk</span>
            <strong>{selectedStrategyDetail.risk}</strong>
          </div>
        </div>
      </section>

      <section className="signal-panel">
        <div className="section-heading">
          <h2>Top signal</h2>
          <span className={`badge ${badge.mode}`}>{badge.label}</span>
        </div>
        <article className="signal-card">
          {topSignal ? (
            <>
              <div className="signal-title">
                <strong>{formatSymbol(topSignal.symbol)}</strong>
                <span className="score">{topSignal.score}/100</span>
              </div>
              {error ? <p className="error">{error}</p> : null}
              <p className="reason">{buildReason(topSignal, topSignal.score)}</p>
              <div className="metric-row">
                <span>24h change</span>
                <strong className={Number(topSignal.priceChangePercent) >= 0 ? "change up" : "change down"}>
                  {Number(topSignal.priceChangePercent) >= 0 ? "+" : ""}
                  {Number(topSignal.priceChangePercent).toFixed(2)}%
                </strong>
              </div>
              <div className="metric-row">
                <span>Last price</span>
                <strong>${formatPrice(topSignal.lastPrice)}</strong>
              </div>
            </>
          ) : (
            <div className="placeholder">Loading market signal...</div>
          )}
        </article>
      </section>

      <section className="chart-panel">
        <div className="section-heading">
          <h2>Kline chart</h2>
          <span className="muted">{chartSymbol ? formatSymbol(chartSymbol) : "--"}</span>
        </div>
        <div className="chart-controls" aria-label="Kline interval controls">
          {klineIntervals.map((interval) => (
            <button
              key={interval}
              type="button"
              className={interval === klineInterval ? "chip active" : "chip"}
              onClick={() => setKlineInterval(interval)}>
              {interval}
            </button>
          ))}
        </div>
        {chartState === "Ready" && klines.length && chartIndicators ? (
          <CandlestickChart indicators={chartIndicators} rows={klines} />
        ) : (
          <div className="chart-placeholder">
            {chartState === "Loading" ? "Loading candles..." : chartError || "No candles yet."}
          </div>
        )}
      </section>

      <section className="news-panel" aria-label="News sentiment">
        <div className="section-heading">
          <h2>News sentiment</h2>
          <span className={`badge sentiment ${getSentimentClass(newsSentiment?.label)}`}>
            {newsState === "Loading" ? "Scanning" : newsSentiment?.label ?? "Offline"}
          </span>
        </div>
        <article className="news-card">
          {newsSentiment ? (
            <>
              <div className="news-score">
                <div>
                  <span>{newsSentiment.source === "news" ? "Headline score" : "Market score"}</span>
                  <strong className={getSentimentClass(newsSentiment.label)}>
                    {newsSentiment.score > 0 ? "+" : ""}
                    {newsSentiment.score}
                  </strong>
                </div>
                <div>
                  <span>{newsSentiment.source === "news" ? "Sources" : "Fallback"}</span>
                  <strong>{newsSentiment.articles.length}</strong>
                </div>
              </div>
              <p className="news-summary">{newsSentiment.summary}</p>
              {newsSentiment.articles.length ? (
                <div className="headline-list">
                  {newsSentiment.articles.slice(0, 3).map((article) => (
                    <a key={article.url} href={article.url} target="_blank" rel="noreferrer">
                      <strong>{article.title}</strong>
                      <span>{article.domain}</span>
                    </a>
                  ))}
                </div>
              ) : null}
              {newsState === "Error" ? <p className="news-warning">{newsError}</p> : null}
            </>
          ) : (
            <p className="placeholder">{newsState === "Loading" ? "Scanning recent headlines..." : newsError}</p>
          )}
        </article>
      </section>

      <section className="risk-panel" aria-label="Pre-trade risk controls">
        <div className="section-heading">
          <h2>Risk controls</h2>
          <span className="badge locked">Pre-trade</span>
        </div>
        <article className="risk-card">
          <div className="risk-mode-row">
            <div>
              <span>Execution mode</span>
              <strong>{getExecutionModeLabel(riskSettings.executionMode)}</strong>
            </div>
            <span className="risk-lock">Real trading locked</span>
          </div>
          <div className="mode-selector" aria-label="Execution mode">
            {[
              { label: "Alert only", value: "alert-only" },
              { label: "Manual confirm", value: "manual-confirm" },
              { label: "Auto execute", value: "auto-execute" }
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={riskSettings.executionMode === mode.value ? "mode-button active" : "mode-button"}
                onClick={() => updateRiskSetting("executionMode", mode.value as ExecutionMode)}>
                {mode.label}
              </button>
            ))}
          </div>
          <div className="risk-grid">
            <label>
              <span>Daily max loss %</span>
              <input
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                value={riskSettings.dailyMaxLossPercent}
                onChange={(event) => updateRiskSetting("dailyMaxLossPercent", Number(event.target.value))}
              />
            </label>
            <label>
              <span>Max position %</span>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={riskSettings.maxPositionPercent}
                onChange={(event) => updateRiskSetting("maxPositionPercent", Number(event.target.value))}
              />
            </label>
            <label>
              <span>Pause after losses</span>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={riskSettings.pauseAfterLosses}
                onChange={(event) => updateRiskSetting("pauseAfterLosses", Number(event.target.value))}
              />
            </label>
          </div>
          <div className="risk-summary">
            <span>Gate rule</span>
            <strong>
              Stop new orders at -{riskSettings.dailyMaxLossPercent}% daily PnL, cap each position at {riskSettings.maxPositionPercent}%,
              pause after {riskSettings.pauseAfterLosses} losing trades.
            </strong>
          </div>
          <div className={`risk-check ${getRiskCheckClass(riskCheck.status)}`}>
            <div>
              <span>Pre-trade check</span>
              <strong>{riskCheck.label}</strong>
            </div>
            <p>{riskCheck.reason}</p>
            <div className="risk-check-metrics">
              <span>Loss {riskCheck.realizedLossPercent.toFixed(2)}%</span>
              <span>Streak {riskCheck.consecutiveLosses}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="bot-panel">
        <div className="section-heading">
          <h2>Paper bot</h2>
          <span className="badge simulation">Simulation</span>
        </div>
        <article className="bot-card">
          {configuredBotPlan ? (
            <>
              <div className="signal-title">
                <strong>{formatSymbol(configuredBotPlan.symbol)}</strong>
                <span className={configuredBotPlan.action === "risk-off" ? "change down" : "score"}>
                  {getBotActionLabel(configuredBotPlan.action)}
                </span>
              </div>
              <div className="strategy-strip">
                <span>Strategy</span>
                <strong>{configuredBotPlan.strategyName}</strong>
              </div>
              <p className="reason">{configuredBotPlan.rationale}</p>
              <div className="bot-grid">
                <div>
                  <span>Confidence</span>
                  <strong>{configuredBotPlan.confidence}/100</strong>
                </div>
                <div>
                  <span>Order size</span>
                  <strong>{configuredBotPlan.allocationPercent}%</strong>
                </div>
                <div>
                  <span>Stop</span>
                  <strong>${formatPrice(String(configuredBotPlan.stopLoss))}</strong>
                </div>
                <div>
                  <span>Target</span>
                  <strong>${formatPrice(String(configuredBotPlan.takeProfit))}</strong>
                </div>
              </div>
              <div className="bot-settings" aria-label="Paper bot settings">
                {botSettings.marketType === "futures" ? (
                  <label>
                    <span>Lev</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={botSettings.leverage}
                      onChange={(event) => updateBotSetting("leverage", Number(event.target.value))}
                    />
                  </label>
                ) : null}
                <label>
                  <span>Size %</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={botSettings.orderSizePercent}
                    onChange={(event) => updateBotSetting("orderSizePercent", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Stop %</span>
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={botSettings.stopLossPercent}
                    onChange={(event) => updateBotSetting("stopLossPercent", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Target %</span>
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={botSettings.takeProfitPercent}
                    onChange={(event) => updateBotSetting("takeProfitPercent", Number(event.target.value))}
                  />
                </label>
                <label className="toggle-setting">
                  <input
                    type="checkbox"
                    checked={botSettings.autoPaperTrading}
                    onChange={(event) => updateBotSetting("autoPaperTrading", event.target.checked)}
                  />
                  <span>Auto</span>
                </label>
              </div>
              <div className="paper-account">
                <div className="metric-row">
                  <span>Paper equity</span>
                  <strong>${formatUsd(equity)}</strong>
                </div>
                <div className="metric-row">
                  <span>Market</span>
                  <strong>{getMarketLabel(botSettings.marketType, botSettings.leverage)}</strong>
                </div>
                <div className="metric-row">
                  <span>Position</span>
                  <strong>
                    {paperPosition
                      ? `${formatSymbol(paperPosition.symbol)} ${getMarketLabel(paperPosition.marketType, paperPosition.leverage)}`
                      : "None"}
                  </strong>
                </div>
                {paperPosition ? (
                  <div className="metric-row">
                    <span>
                      PnL since {paperPosition.openedAt}
                    </span>
                    <strong className={paperPnl >= 0 ? "change up" : "change down"}>
                      {paperPnl >= 0 ? "+" : ""}${formatUsd(paperPnl)}
                    </strong>
                  </div>
                ) : null}
                {paperPosition ? (
                  <div className="metric-row">
                    <span>Exit guard</span>
                    <strong>
                      ${formatPrice(String(paperPosition.stopLoss))} / ${formatPrice(String(paperPosition.takeProfit))}
                    </strong>
                  </div>
                ) : null}
              </div>
              <div className="bot-actions">
                <button
                  type="button"
                  className="action-button"
                  disabled={configuredBotPlan.action !== "paper-long" || Boolean(paperPosition) || riskCheck.status === "blocked"}
                  onClick={() => openPaperPosition()}>
                  Paper buy
                </button>
                <button
                  type="button"
                  className="action-button secondary"
                  disabled={!paperPosition}
                  onClick={() => closePaperPosition()}>
                  Close
                </button>
              </div>
              <p className="bot-note">No real orders. No API keys stored.</p>
            </>
          ) : (
            <div className="placeholder">Waiting for a bot plan...</div>
          )}
        </article>
      </section>

      <section>
        <div className="section-heading">
          <h2>Order history</h2>
          <span className="muted">{orderHistory.length} events</span>
        </div>
        <div className="history-list">
          {orderHistory.length ? (
            orderHistory.map((order) => (
              <article key={order.id} className="history-row">
                <div>
                  <strong>{order.side === "open" ? "Open" : "Close"} {formatSymbol(order.symbol)}</strong>
                  <span>{order.reason} at {order.timestamp}</span>
                  <span>{getMarketLabel(order.marketType, order.leverage)}</span>
                </div>
                <div>
                  <strong>${formatPrice(String(order.price))}</strong>
                  <span className={order.pnl === undefined || order.pnl >= 0 ? "change up" : "change down"}>
                    {order.pnl === undefined ? `$${formatUsd(order.size)}` : `${order.pnl >= 0 ? "+" : ""}$${formatUsd(order.pnl)}`}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-history">No paper orders yet.</div>
          )}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Market scan</h2>
          <span className="muted">{rows.length} assets</span>
        </div>
        <div className="asset-list">
          {rows.map((row) => (
            <AssetRow key={row.symbol} row={row} />
          ))}
        </div>
      </section>

      <footer className="footnote">
        Research tool only. Signals are not financial advice. Saved locally. {source === "demo" ? "Demo data active." : ""}
      </footer>
    </main>
  )
}

export default Popup
