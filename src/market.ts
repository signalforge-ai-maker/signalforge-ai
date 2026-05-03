export const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr"

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

export function scoreAsset(row: MarketRow) {
  const change = Number(row.priceChangePercent)
  const volume = Number(row.quoteVolume)
  const trades = Number(row.count)
  const momentumScore = Math.min(Math.abs(change) * 9, 45)
  const volumeScore = Math.min(Math.log10(Math.max(volume, 1)) * 4, 35)
  const activityScore = Math.min(Math.log10(Math.max(trades, 1)) * 3, 20)
  return Math.round(momentumScore + volumeScore + activityScore)
}

export function getTopSignal(rows: MarketRow[]): ScoredMarketRow | undefined {
  return rows
    .map((row) => ({ ...row, score: scoreAsset(row) }))
    .sort((a, b) => b.score - a.score)[0]
}

export function buildReason(row: MarketRow, score: number) {
  const change = Number(row.priceChangePercent)
  const direction = change >= 0 ? "upside momentum" : "downside pressure"
  const risk = Math.abs(change) >= 4 ? "elevated volatility" : "moderate volatility"
  return `${direction} with ${formatVolume(row.quoteVolume)} 24h volume. Score ${score}/100; ${risk}.`
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
