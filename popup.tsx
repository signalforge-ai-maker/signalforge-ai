import { useCallback, useEffect, useMemo, useState } from "react"

import iconUrl from "data-base64:~../assets/icon-48.png"

import {
  buildBotPlan,
  buildReason,
  fallbackRows,
  fetchMarketRows,
  formatPrice,
  formatSymbol,
  formatVolume,
  getTopSignal,
  type MarketRow,
  type RadarSource,
  watchlists
} from "~src/market"

import "~src/popup.css"

type RadarState = "Scanning" | "Live scan" | "Demo data"

type PaperPosition = {
  symbol: string
  quantity: number
  entryPrice: number
  openedAt: string
}

function getSignalBadge(signal?: MarketRow) {
  if (!signal) return { label: "Neutral", mode: "" }

  const change = Number(signal.priceChangePercent)
  if (Math.abs(change) >= 4) return { label: "High activity", mode: "hot" }
  if (change < -2) return { label: "Risk watch", mode: "risk" }
  return { label: "Neutral", mode: "" }
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

function Popup() {
  const [watchlist, setWatchlist] = useState<string>(watchlists[0].value)
  const [rows, setRows] = useState<MarketRow[]>([])
  const [source, setSource] = useState<RadarSource>("live")
  const [radarState, setRadarState] = useState<RadarState>("Scanning")
  const [updatedAt, setUpdatedAt] = useState("--")
  const [error, setError] = useState("")

  const symbols = useMemo(() => watchlist.split(","), [watchlist])
  const topSignal = useMemo(() => getTopSignal(rows), [rows])
  const botPlan = useMemo(() => buildBotPlan(topSignal), [topSignal])
  const badge = getSignalBadge(topSignal)
  const [paperCash, setPaperCash] = useState(10000)
  const [paperPosition, setPaperPosition] = useState<PaperPosition | null>(null)

  const currentPositionRow = paperPosition ? rows.find((row) => row.symbol === paperPosition.symbol) : undefined
  const currentPositionPrice = Number(currentPositionRow?.lastPrice ?? paperPosition?.entryPrice ?? 0)
  const positionValue = paperPosition ? paperPosition.quantity * currentPositionPrice : 0
  const positionCost = paperPosition ? paperPosition.quantity * paperPosition.entryPrice : 0
  const paperPnl = paperPosition ? positionValue - positionCost : 0
  const equity = paperCash + positionValue

  const openPaperPosition = useCallback(() => {
    if (!botPlan || botPlan.action !== "paper-long" || paperPosition) return

    const budget = paperCash * (botPlan.allocationPercent / 100)
    if (budget <= 0 || botPlan.entryPrice <= 0) return

    setPaperCash((cash) => cash - budget)
    setPaperPosition({
      symbol: botPlan.symbol,
      quantity: budget / botPlan.entryPrice,
      entryPrice: botPlan.entryPrice,
      openedAt: formatTime(new Date())
    })
  }, [botPlan, paperCash, paperPosition])

  const closePaperPosition = useCallback(() => {
    if (!paperPosition) return

    setPaperCash((cash) => cash + positionValue)
    setPaperPosition(null)
  }, [paperPosition, positionValue])

  const loadMarketData = useCallback(async () => {
    setRadarState("Scanning")
    setError("")

    try {
      const marketRows = await fetchMarketRows(symbols)
      setRows(marketRows)
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
  }, [symbols])

  useEffect(() => {
    void loadMarketData()
  }, [loadMarketData])

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

      <section className="bot-panel">
        <div className="section-heading">
          <h2>Paper bot</h2>
          <span className="badge simulation">Simulation</span>
        </div>
        <article className="bot-card">
          {botPlan ? (
            <>
              <div className="signal-title">
                <strong>{formatSymbol(botPlan.symbol)}</strong>
                <span className={botPlan.action === "risk-off" ? "change down" : "score"}>
                  {getBotActionLabel(botPlan.action)}
                </span>
              </div>
              <p className="reason">{botPlan.rationale}</p>
              <div className="bot-grid">
                <div>
                  <span>Confidence</span>
                  <strong>{botPlan.confidence}/100</strong>
                </div>
                <div>
                  <span>Max size</span>
                  <strong>{botPlan.allocationPercent}%</strong>
                </div>
                <div>
                  <span>Stop</span>
                  <strong>${formatPrice(String(botPlan.stopLoss))}</strong>
                </div>
                <div>
                  <span>Target</span>
                  <strong>${formatPrice(String(botPlan.takeProfit))}</strong>
                </div>
              </div>
              <div className="paper-account">
                <div className="metric-row">
                  <span>Paper equity</span>
                  <strong>${formatUsd(equity)}</strong>
                </div>
                <div className="metric-row">
                  <span>Position</span>
                  <strong>{paperPosition ? formatSymbol(paperPosition.symbol) : "None"}</strong>
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
              </div>
              <div className="bot-actions">
                <button
                  type="button"
                  className="action-button"
                  disabled={botPlan.action !== "paper-long" || Boolean(paperPosition)}
                  onClick={openPaperPosition}>
                  Paper buy
                </button>
                <button
                  type="button"
                  className="action-button secondary"
                  disabled={!paperPosition}
                  onClick={closePaperPosition}>
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
        Research tool only. Signals are not financial advice. {source === "demo" ? "Demo data active." : ""}
      </footer>
    </main>
  )
}

export default Popup
