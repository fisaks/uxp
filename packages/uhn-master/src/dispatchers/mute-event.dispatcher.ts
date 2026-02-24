/**
 * Handles mute events arriving from edges via MQTT (`uhn/+/mute/event`).
 *
 * On receive:
 * 1. Forwards the mute command to the master's own rule runtime (if running)
 * 2. Relays to ALL edges via `uhn/{edge}/mute/cmd` (broadcast)
 */
import { AppLogger } from "@uxp/bff-common";
import { muteEdgeService, MuteMQTTPayload } from "../services/mute-edge.service";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { subscriptionService } from "../services/subscription.service";

function isMuteEventPayload(obj: unknown): obj is MuteMQTTPayload {
    if (typeof obj !== "object" || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return (
        (o.targetType === "rule" || o.targetType === "resource") &&
        typeof o.targetId === "string" &&
        (o.action === "mute" || o.action === "clearMute")
    );
}

let initialized = false;

export function initMuteEventDispatcher(): void {
    if (initialized) return;
    initialized = true;

    subscriptionService.on("muteEvent", (topic, payload) => {
        if (!isMuteEventPayload(payload)) {
            AppLogger.warn({
                message: `[MuteEventDispatcher] Invalid mute event payload on topic ${topic}`,
            });
            return;
        }

        AppLogger.isDebugLevel() && AppLogger.debug({
            message: `[MuteEventDispatcher] Received mute event from edge`,
            object: { topic, payload },
        });

        // 1. Apply to master's own runtime
        if (ruleRuntimeProcessService.canSendCommands()) {
            ruleRuntimeProcessService.sendEvent<"muteCommand">({
                cmd: "muteCommand",
                payload: {
                    targetType: payload.targetType,
                    targetId: payload.targetId,
                    action: payload.action,
                    expiresAt: payload.expiresAt,
                    identifier: payload.identifier,
                },
            });
        }

        // 2. Relay to ALL edges (including originator — idempotent)
        muteEdgeService.broadcastMuteCommand({
            targetType: payload.targetType,
            targetId: payload.targetId,
            action: payload.action,
            expiresAt: payload.expiresAt,
            identifier: payload.identifier,
        });
    });
}
