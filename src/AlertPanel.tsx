import { useEffect, useMemo, useState } from "react"

import {
  formatPrice,
  formatSymbol,
  scoreMarketRow,
  type MarketRow,
  type StrategyType
} from "./market"
import type { Language } from "./i18n"

type AlertCondition = "price-above" | "price-below" | "score-above"

type AlertRule = {
  id: string
  symbol: string
  condition: AlertCondition
  target: number
  createdAt: string
}

type AlertEvent = {
  id: string
  ruleId: string
  symbol: string
  message: string
  timestamp: string
}

type AlertPanelProps = {
  language: Language
  rows: MarketRow[]
  strategy: StrategyType
}

const ALERT_STORAGE_KEY = "signalforge.alertRules"
const ALERT_EVENT_STORAGE_KEY = "signalforge.alertEvents"

function canUseChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local)
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function text(language: Language, en: string, zh: string) {
  return language === "zh" ? zh : en
}

function getConditionLabel(language: Language, condition: AlertCondition) {
  if (condition === "price-above") return text(language, "Price above", "价格高于")
  if (condition === "price-below") return text(language, "Price below", "价格低于")
  return text(language, "Score above", "评分高于")
}

function isRuleTriggered(rule: AlertRule, row: MarketRow, strategy: StrategyType) {
  const price = Number(row.lastPrice)
  const score = scoreMarketRow(row, strategy).score

  if (rule.condition === "price-above") return price >= rule.target
  if (rule.condition === "price-below") return price <= rule.target
  return score >= rule.target
}

function buildAlertMessage(language: Language, rule: AlertRule, row: MarketRow, strategy: StrategyType) {
  const price = Number(row.lastPrice)
  const score = scoreMarketRow(row, strategy).score
  const symbol = formatSymbol(rule.symbol)

  if (rule.condition === "score-above") {
    return text(
      language,
      `${symbol} score reached ${score}/100`,
      `${symbol} 评分达到 ${score}/100`
    )
  }

  return text(
    language,
    `${symbol} price is $${formatPrice(String(price))}`,
    `${symbol} 当前价格 $${formatPrice(String(price))}`
  )
}

export function AlertPanel({ language, rows, strategy }: AlertPanelProps) {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [symbol, setSymbol] = useState("")
  const [condition, setCondition] = useState<AlertCondition>("price-above")
  const [target, setTarget] = useState("")

  const symbols = useMemo(() => rows.map((row) => row.symbol), [rows])

  useEffect(() => {
    if (!symbol && symbols[0]) {
      setSymbol(symbols[0])
    }
  }, [symbol, symbols])

  useEffect(() => {
    if (!canUseChromeStorage()) return

    chrome.storage.local.get([ALERT_STORAGE_KEY, ALERT_EVENT_STORAGE_KEY], (result) => {
      const savedRules = result[ALERT_STORAGE_KEY]
      const savedEvents = result[ALERT_EVENT_STORAGE_KEY]

      if (Array.isArray(savedRules)) setRules(savedRules)
      if (Array.isArray(savedEvents)) setEvents(savedEvents)
    })
  }, [])

  useEffect(() => {
    if (!canUseChromeStorage()) return

    chrome.storage.local.set({
      [ALERT_STORAGE_KEY]: rules,
      [ALERT_EVENT_STORAGE_KEY]: events
    })
  }, [events, rules])

  const evaluatedRules = useMemo(() => {
    return rules.map((rule) => {
      const row = rows.find((item) => item.symbol === rule.symbol)
      const triggered = row ? isRuleTriggered(rule, row, strategy) : false

      return {
        rule,
        row,
        triggered
      }
    })
  }, [rows, rules, strategy])

  useEffect(() => {
    const nextEvents: AlertEvent[] = []

    for (const item of evaluatedRules) {
      if (!item.row || !item.triggered) continue

      const alreadyLogged = events.some((event) => event.ruleId === item.rule.id)
      if (alreadyLogged) continue

      nextEvents.push({
        id: `${Date.now()}-${item.rule.id}`,
        ruleId: item.rule.id,
        symbol: item.rule.symbol,
        message: buildAlertMessage(language, item.rule, item.row, strategy),
        timestamp: formatTime(new Date())
      })
    }

    if (nextEvents.length) {
      setEvents((current) => [...nextEvents, ...current].slice(0, 8))
    }
  }, [evaluatedRules, events, language, strategy])

  function addRule() {
    const numericTarget = Number(target)
    if (!symbol || Number.isNaN(numericTarget) || numericTarget <= 0) return

    setRules((current) => [
      {
        id: `${Date.now()}-${symbol}`,
        symbol,
        condition,
        target: numericTarget,
        createdAt: formatTime(new Date())
      },
      ...current
    ])

    setTarget("")
  }

  function removeRule(id: string) {
    setRules((current) => current.filter((rule) => rule.id !== id))
    setEvents((current) => current.filter((event) => event.ruleId !== id))
  }

  return (
    <section className="alert-panel" aria-label="Alert center">
      <div className="section-heading">
        <h2>{text(language, "Alert center", "提醒中心")}</h2>
        <span className="badge simulation">
          {events.length} {text(language, "triggered", "已触发")}
        </span>
      </div>

      <article className="alert-card">
        <div className="alert-form">
          <label>
            <span>{text(language, "Asset", "币种")}</span>
            <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
              {symbols.map((item) => (
                <option key={item} value={item}>
                  {formatSymbol(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{text(language, "Condition", "条件")}</span>
            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value as AlertCondition)}>
              <option value="price-above">{getConditionLabel(language, "price-above")}</option>
              <option value="price-below">{getConditionLabel(language, "price-below")}</option>
              <option value="score-above">{getConditionLabel(language, "score-above")}</option>
            </select>
          </label>

          <label>
            <span>{text(language, "Target", "触发值")}</span>
            <input
              type="number"
              min="0"
              step={condition === "score-above" ? "1" : "0.00001"}
              placeholder={condition === "score-above" ? "80" : "65000"}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>

          <button type="button" className="action-button" onClick={addRule}>
            {text(language, "Add alert", "添加提醒")}
          </button>
        </div>

        <div className="alert-list">
          {evaluatedRules.length ? (
            evaluatedRules.map(({ rule, row, triggered }) => (
              <div key={rule.id} className={triggered ? "alert-row triggered" : "alert-row"}>
                <div>
                  <strong>{formatSymbol(rule.symbol)}</strong>
                  <span>
                    {getConditionLabel(language, rule.condition)} {rule.condition === "score-above" ? rule.target : `$${rule.target}`}
                  </span>
                  <span>
                    {row
                      ? text(
                          language,
                          `Now $${formatPrice(row.lastPrice)}`,
                          `当前 $${formatPrice(row.lastPrice)}`
                        )
                      : text(language, "Waiting for market data", "等待行情数据")}
                  </span>
                </div>

                <div>
                  <span className={triggered ? "change up" : "muted"}>
                    {triggered ? text(language, "Triggered", "已触发") : text(language, "Watching", "监控中")}
                  </span>
                  <button type="button" onClick={() => removeRule(rule.id)}>
                    {text(language, "Remove", "删除")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-history">
              {text(language, "No alerts yet.", "暂无提醒规则。")}
            </div>
          )}
        </div>

        {events.length ? (
          <div className="alert-events">
            <strong>{text(language, "Recent triggers", "最近触发")}</strong>
            {events.map((event) => (
              <div key={event.id} className="alert-event">
                <span>{event.message}</span>
                <span>{event.timestamp}</span>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  )
}