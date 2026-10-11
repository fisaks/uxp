import { isPriceTriggerInfo, RuntimeRuleInfo } from "@uhn/common";

/** A fixed price limit of a rule, taken from its onPriceAbove / onPriceBelow trigger. */
export type PriceLimit = {
    ruleId: string;
    ruleName: string;
    direction: "above" | "below";
    /** snt/kWh incl. VAT */
    threshold: number;
    hysteresis: number;
};

/** The price limits a rule has. Rules that only use onPriceChanged have none. */
export function getRuleLimits(rule: RuntimeRuleInfo): PriceLimit[] {
    return rule.triggers.flatMap((trigger) =>
        isPriceTriggerInfo(trigger) && trigger.kind === "priceThreshold"
            ? [{
                ruleId: rule.id,
                ruleName: rule.name ?? rule.id,
                direction: trigger.direction,
                threshold: trigger.threshold,
                hysteresis: trigger.hysteresis ?? 0,
            }]
            : []
    );
}

/** The price where a fired limit re-arms: below an onPriceAbove limit, above an onPriceBelow limit. */
export function rearmPrice(limit: PriceLimit): number {
    return limit.direction === "above" ? limit.threshold - limit.hysteresis : limit.threshold + limit.hysteresis;
}

/** Line colours for rules on the chart, assigned by position in the (sorted) rule list. */
const LIMIT_COLORS = ["#ab47bc", "#26a69a", "#ec407a", "#d4e157", "#5c6bc0", "#ff7043"];
export const limitColor = (index: number): string => LIMIT_COLORS[index % LIMIT_COLORS.length];
