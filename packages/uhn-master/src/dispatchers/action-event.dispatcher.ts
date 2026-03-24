/**
 * Handles action events arriving from edges via MQTT (`uhn/+/device/+/action/+`).
 *
 * On receive: forwards the action event to the master's rule runtime as an
 * actionEvent command so master rules can fire on physical button presses.
 */
import { AppLogger } from "@uxp/bff-common";
import { blueprintResourceService } from "../services/blueprint-resource.service";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { subscriptionService } from "../services/subscription.service";
import { parseMqttTopic } from "../util/mqtt-topic.util";

type ActionEventPayload = {
    action: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
    depth?: number;
};

function isActionEventPayload(obj: unknown): obj is ActionEventPayload {
    if (typeof obj !== "object" || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return typeof o.action === "string" && typeof o.timestamp === "number";
}

let initialized = false;

export function initActionEventDispatcher(): void {
    if (initialized) return;
    initialized = true;

    subscriptionService.on("deviceActionEvent", (topic, payload) => {
        if (!isActionEventPayload(payload)) {
            AppLogger.warn({
                message: `[ActionEventDispatcher] Invalid action event payload on topic ${topic}`,
            });
            return;
        }

        // Topic: uhn/{edge}/device/{device}/action/{pin}
        const parsed = parseMqttTopic(topic, 6);
        if (!parsed) return;
        const { edge, segments } = parsed;
        const device = segments[3];
        const pin = segments[5];

        // Look up the resource from the physical address
        const resource = blueprintResourceService.getResourceByAddress(edge, device, "actionInput", pin);
        if (!resource) {
            AppLogger.isDebugLevel() && AppLogger.debug({
                message: `[ActionEventDispatcher] No actionInput resource for ${device}:${pin}`,
            });
            return;
        }

        AppLogger.isDebugLevel() && AppLogger.debug({
            message: `[ActionEventDispatcher] Forwarding action event to master runtime`,
            object: { resourceId: resource.id, action: payload.action, metadata: payload.metadata },
        });

        // Forward to master runtime
        if (ruleRuntimeProcessService.canSendCommands()) {
            ruleRuntimeProcessService.sendEvent<"actionEvent">({
                cmd: "actionEvent",
                payload: {
                    resourceId: resource.id,
                    action: payload.action,
                    metadata: payload.metadata,
                    timestamp: payload.timestamp,
                    depth: payload.depth ?? 0,
                },
            });
        }
    });
}
