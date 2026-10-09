import { ElectricityPriceSnapshot } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { electricityPriceService } from "../services/electricity-price.service";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

function sendElectricityPriceToRuleRuntime(snapshot: ElectricityPriceSnapshot) {
    if (!ruleRuntimeProcessService.canSendCommands()) return;
    try {
        ruleRuntimeProcessService.sendEvent({ cmd: "electricityPriceUpdate", payload: snapshot });
    } catch (error) {
        AppLogger.error({
            message: `[ElectricityPriceDispatcher] Failed to send price update to rule runtime`,
            error,
        });
    }
}

export function initElectricityPriceDispatcher(): void {
    if (initialized) return;
    initialized = true;

    electricityPriceService.on("pricesUpdated", (snapshot) => {
        sendElectricityPriceToRuleRuntime(snapshot);
        UHNAppServerWebSocketManager.getInstance().broadcastElectricityPricesMessage(snapshot);
    });
}
