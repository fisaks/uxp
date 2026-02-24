import type { BlueprintRule, MuteController, ResourceBase, ResourceType, RuntimeRuleAction } from "@uhn/blueprint";
import { isBlueprintRule } from "@uhn/blueprint";
import { RuntimeMuteService } from "../services/runtime-mute.service";

/**
 * Per-execution wrapper: provides MuteController for rule context
 * and collects pending actions to broadcast via IPC.
 */
export function createRuleMute({ muteService }: { muteService: RuntimeMuteService }): MuteController & {
    drainPendingActions: () => RuntimeRuleAction[];
} {
    const pendingActions: RuntimeRuleAction[] = [];

    function resolveTarget(target: ResourceBase<ResourceType> | BlueprintRule): { targetType: "rule" | "resource"; targetId: string } | undefined {
        if (isBlueprintRule(target)) {
            if (!target.id) return undefined;
            return { targetType: "rule", targetId: target.id };
        }
        if (!target.id) return undefined;
        return { targetType: "resource", targetId: target.id };
    }

    return {
        resource(resource, durationMs, identifier) {
            if (!resource.id) return;
            const expiresAt = Date.now() + durationMs;
            muteService.setMuteUntil("resource", resource.id, expiresAt, identifier);
            pendingActions.push({
                type: "mute",
                targetType: "resource",
                targetId: resource.id,
                expiresAt,
                identifier,
            });
        },
        rule(rule, durationMs, identifier) {
            if (!rule.id) return;
            const expiresAt = Date.now() + durationMs;
            muteService.setMuteUntil("rule", rule.id, expiresAt, identifier);
            pendingActions.push({
                type: "mute",
                targetType: "rule",
                targetId: rule.id,
                expiresAt,
                identifier,
            });
        },
        clearMute(target, identifier) {
            const resolved = resolveTarget(target);
            if (!resolved) return;
            muteService.clearMuteEntries(resolved.targetType, resolved.targetId, identifier);
            pendingActions.push({
                type: "clearMute",
                targetType: resolved.targetType,
                targetId: resolved.targetId,
                identifier,
            });
        },
        drainPendingActions() {
            return pendingActions.splice(0);
        },
    };
}
