import type { Language } from "./i18n";
import type { StrategyType } from "./market";
import {
  strategyParameterDefinitions,
  type StrategyParameters,
} from "./strategyParameters";

type StrategyParametersPanelProps = {
  language: Language;
  strategy: StrategyType;
  parameters: StrategyParameters;
  onChange: (strategy: StrategyType, key: string, value: number) => void;
  onReset: (strategy: StrategyType) => void;
};

export function StrategyParametersPanel({
  language,
  strategy,
  parameters,
  onChange,
  onReset,
}: StrategyParametersPanelProps) {
  const definitions = strategyParameterDefinitions[strategy];
  const values = parameters[strategy] as unknown as Record<string, number>;

  return (
    <section className="strategy-parameters">
      <div className="section-heading">
        <h2>{language === "zh" ? "策略参数" : "Strategy parameters"}</h2>

        <button
          type="button"
          className="text-button"
          onClick={() => onReset(strategy)}
        >
          {language === "zh" ? "恢复默认" : "Reset"}
        </button>
      </div>

      <article className="strategy-parameters-card">
        <p className="strategy-parameters-note">
          {language === "zh"
            ? "这些参数只影响当前选中的策略，并会保存在浏览器本地。"
            : "These settings only affect the selected strategy and are stored locally."}
        </p>

        <div className="strategy-parameters-grid">
          {definitions.map((definition) => (
            <label key={definition.key}>
              <span>
                {language === "zh" ? definition.labelZh : definition.label}
              </span>

              <div className="parameter-input">
                <input
                  type="number"
                  min={definition.min}
                  max={definition.max}
                  step={definition.step}
                  value={values[definition.key]}
                  onChange={(event) =>
                    onChange(
                      strategy,
                      definition.key,
                      Number(event.target.value),
                    )
                  }
                />

                {definition.suffix ? <small>{definition.suffix}</small> : null}
              </div>
            </label>
          ))}
        </div>
      </article>
    </section>
  );
}
