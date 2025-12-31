// rule-engine-logging.ts
import { RuleLogger } from "@uhn/blueprint";
import { runtimeOutput } from "../io/runtime-output";

export function ruleLogger(ruleId: string): RuleLogger {
    return {
        info: (msg, data) =>
            runtimeOutput.log({ level: "info", component: `rule:${ruleId}`, message: msg, data, }),
        warn: (msg, data) =>
            runtimeOutput.log({ level: "warn", component: `rule:${ruleId}`, message: msg, data, }),
        error: (msg, data) =>
            runtimeOutput.log({ level: "error", component: `rule:${ruleId}`, message: msg, data, }),
    }
}