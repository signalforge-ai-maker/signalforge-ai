import type { StrategyType } from "./market";

export type StrategyParameters = {
  momentum: {
    fastMaPeriod: number;
    slowMaPeriod: number;
    minConfidence: number;
  };
  reversal: {
    rsiThreshold: number;
    minConfidence: number;
    orderSizePercent: number;
  };
  grid: {
    rangePercent: number;
    gridCount: number;
    orderSizePercent: number;
  };
  dca: {
    tranchePercent: number;
    maxTranches: number;
    triggerDropPercent: number;
  };
  "scheduled-dca": {
    fixedAmount: number;
    intervalDays: number;
    maxExecutions: number;
  };
  rebalance: {
    driftThresholdPercent: number;
    targetWeightPercent: number;
    orderSizePercent: number;
  };
  "ai-signal": {
    minConfidence: number;
    sentimentWeightPercent: number;
    volatilityLimitPercent: number;
    orderSizePercent: number;
  };
};

export type ParameterDefinition = {
  key: string;
  label: string;
  labelZh: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
};

export const defaultStrategyParameters: StrategyParameters = {
  momentum: {
    fastMaPeriod: 7,
    slowMaPeriod: 25,
    minConfidence: 68,
  },
  reversal: {
    rsiThreshold: 30,
    minConfidence: 60,
    orderSizePercent: 4,
  },
  grid: {
    rangePercent: 5,
    gridCount: 8,
    orderSizePercent: 3,
  },
  dca: {
    tranchePercent: 2,
    maxTranches: 5,
    triggerDropPercent: 3,
  },
  "scheduled-dca": {
    fixedAmount: 100,
    intervalDays: 7,
    maxExecutions: 12,
  },
  rebalance: {
    driftThresholdPercent: 5,
    targetWeightPercent: 25,
    orderSizePercent: 3,
  },
  "ai-signal": {
    minConfidence: 65,
    sentimentWeightPercent: 20,
    volatilityLimitPercent: 6,
    orderSizePercent: 4,
  },
};

export const strategyParameterDefinitions: Record<
  StrategyType,
  ParameterDefinition[]
> = {
  momentum: [
    {
      key: "fastMaPeriod",
      label: "Fast MA period",
      labelZh: "快速均线周期",
      min: 2,
      max: 50,
      step: 1,
    },
    {
      key: "slowMaPeriod",
      label: "Slow MA period",
      labelZh: "慢速均线周期",
      min: 5,
      max: 200,
      step: 1,
    },
    {
      key: "minConfidence",
      label: "Minimum confidence",
      labelZh: "最低置信度",
      min: 0,
      max: 100,
      step: 1,
      suffix: "%",
    },
  ],

  reversal: [
    {
      key: "rsiThreshold",
      label: "RSI oversold level",
      labelZh: "RSI 超卖线",
      min: 10,
      max: 50,
      step: 1,
    },
    {
      key: "minConfidence",
      label: "Minimum confidence",
      labelZh: "最低置信度",
      min: 0,
      max: 100,
      step: 1,
      suffix: "%",
    },
    {
      key: "orderSizePercent",
      label: "Order size",
      labelZh: "下单比例",
      min: 1,
      max: 20,
      step: 1,
      suffix: "%",
    },
  ],

  grid: [
    {
      key: "rangePercent",
      label: "Grid range",
      labelZh: "网格区间",
      min: 1,
      max: 30,
      step: 0.5,
      suffix: "%",
    },
    {
      key: "gridCount",
      label: "Grid count",
      labelZh: "网格数量",
      min: 2,
      max: 50,
      step: 1,
    },
    {
      key: "orderSizePercent",
      label: "Size per grid",
      labelZh: "单格仓位",
      min: 1,
      max: 20,
      step: 1,
      suffix: "%",
    },
  ],

  dca: [
    {
      key: "tranchePercent",
      label: "Tranche size",
      labelZh: "单次买入比例",
      min: 1,
      max: 20,
      step: 1,
      suffix: "%",
    },
    {
      key: "maxTranches",
      label: "Maximum tranches",
      labelZh: "最大买入次数",
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: "triggerDropPercent",
      label: "Buy after drop",
      labelZh: "下跌触发比例",
      min: 0.5,
      max: 30,
      step: 0.5,
      suffix: "%",
    },
  ],

  "scheduled-dca": [
    {
      key: "fixedAmount",
      label: "Fixed amount",
      labelZh: "固定买入金额",
      min: 1,
      max: 10000,
      step: 10,
      suffix: "USDT",
    },
    {
      key: "intervalDays",
      label: "Interval",
      labelZh: "执行间隔",
      min: 1,
      max: 365,
      step: 1,
      suffix: "days",
    },
    {
      key: "maxExecutions",
      label: "Maximum executions",
      labelZh: "最大执行次数",
      min: 1,
      max: 100,
      step: 1,
    },
  ],

  rebalance: [
    {
      key: "driftThresholdPercent",
      label: "Drift threshold",
      labelZh: "偏离触发比例",
      min: 1,
      max: 30,
      step: 0.5,
      suffix: "%",
    },
    {
      key: "targetWeightPercent",
      label: "Target asset weight",
      labelZh: "目标资产比例",
      min: 1,
      max: 100,
      step: 1,
      suffix: "%",
    },
    {
      key: "orderSizePercent",
      label: "Adjustment size",
      labelZh: "调仓比例",
      min: 1,
      max: 30,
      step: 1,
      suffix: "%",
    },
  ],

  "ai-signal": [
    {
      key: "minConfidence",
      label: "Minimum confidence",
      labelZh: "最低置信度",
      min: 0,
      max: 100,
      step: 1,
      suffix: "%",
    },
    {
      key: "sentimentWeightPercent",
      label: "Sentiment weight",
      labelZh: "新闻情绪权重",
      min: 0,
      max: 100,
      step: 5,
      suffix: "%",
    },
    {
      key: "volatilityLimitPercent",
      label: "Volatility limit",
      labelZh: "波动率上限",
      min: 1,
      max: 30,
      step: 0.5,
      suffix: "%",
    },
    {
      key: "orderSizePercent",
      label: "Order size",
      labelZh: "下单比例",
      min: 1,
      max: 20,
      step: 1,
      suffix: "%",
    },
  ],
};

export function mergeStrategyParameters(
  saved?: Partial<StrategyParameters>,
): StrategyParameters {
  return {
    momentum: {
      ...defaultStrategyParameters.momentum,
      ...saved?.momentum,
    },
    reversal: {
      ...defaultStrategyParameters.reversal,
      ...saved?.reversal,
    },
    grid: {
      ...defaultStrategyParameters.grid,
      ...saved?.grid,
    },
    dca: {
      ...defaultStrategyParameters.dca,
      ...saved?.dca,
    },
    "scheduled-dca": {
      ...defaultStrategyParameters["scheduled-dca"],
      ...saved?.["scheduled-dca"],
    },
    rebalance: {
      ...defaultStrategyParameters.rebalance,
      ...saved?.rebalance,
    },
    "ai-signal": {
      ...defaultStrategyParameters["ai-signal"],
      ...saved?.["ai-signal"],
    },
  };
}

export function updateStrategyParameter(
  parameters: StrategyParameters,
  strategy: StrategyType,
  key: string,
  value: number,
): StrategyParameters {
  const current = parameters[strategy] as unknown as Record<string, number>;
  const definition = strategyParameterDefinitions[strategy].find(
    (item) => item.key === key,
  );
  const safeValue = Number.isFinite(value) ? value : definition?.min ?? 0;
  const nextValue = definition
    ? Math.min(definition.max, Math.max(definition.min, safeValue))
    : safeValue;

  return {
    ...parameters,
    [strategy]: {
      ...current,
      [key]: nextValue,
    },
  } as StrategyParameters;
}

export function getStrategyExecutionProfile(
  parameters: StrategyParameters,
  strategy: StrategyType,
  equity: number,
  fallbackOrderSize: number,
) {
  switch (strategy) {
    case "momentum":
      return {
        minimumConfidence: parameters.momentum.minConfidence,
        allocationPercent: fallbackOrderSize,
      };

    case "reversal":
      return {
        minimumConfidence: parameters.reversal.minConfidence,
        allocationPercent: parameters.reversal.orderSizePercent,
      };

    case "grid":
      return {
        minimumConfidence: 55,
        allocationPercent: parameters.grid.orderSizePercent,
      };

    case "dca":
      return {
        minimumConfidence: 50,
        allocationPercent: parameters.dca.tranchePercent,
      };

    case "scheduled-dca":
      return {
        minimumConfidence: 50,
        allocationPercent:
          equity > 0
            ? (parameters["scheduled-dca"].fixedAmount / equity) * 100
            : 0,
      };

    case "rebalance":
      return {
        minimumConfidence: 55,
        allocationPercent: parameters.rebalance.orderSizePercent,
      };

    case "ai-signal":
      return {
        minimumConfidence: parameters["ai-signal"].minConfidence,
        allocationPercent: parameters["ai-signal"].orderSizePercent,
      };
  }
}
