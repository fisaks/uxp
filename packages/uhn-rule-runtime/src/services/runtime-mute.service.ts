import { runtimeOutput } from "../io/runtime-output";

type MuteEntry = {
    expiresAt: number;
    timeout: ReturnType<typeof setTimeout>;
};

/**
 * Shared mute state: lives for the lifetime of the runtime.
 * Multiple rule executions read/write the same state.
 */
export class RuntimeMuteService {
    // muteKey ("rule::{id}" | "resource::{id}") → (identifier → entry)
    private readonly muteEntries = new Map<string, Map<string, MuteEntry>>();

    private static key(targetType: "rule" | "resource", targetId: string): string {
        return `${targetType}::${targetId}`;
    }

    /** Set a mute using a relative duration (used by local rule execution). */
    setMute(targetType: "rule" | "resource", targetId: string, durationMs: number, identifier?: string): void {
        this.setMuteUntil(targetType, targetId, Date.now() + durationMs, identifier);
    }

    /** Set a mute using an absolute expiry timestamp (used by incoming IPC commands). */
    setMuteUntil(targetType: "rule" | "resource", targetId: string, expiresAt: number, identifier?: string): void {
        const remainingMute = expiresAt - Date.now();
        if (remainingMute <= 0) {
            runtimeOutput.log({
                level: "info",
                component: "RuntimeMuteService",
                message: `Mute already expired for ${targetType}::${targetId}${identifier ? ` [${identifier}]` : ""}, skipping`,
            });
            return;
        }

        const muteKey = RuntimeMuteService.key(targetType, targetId);
        const muteIdentifier = identifier ?? "";

        let muteByIdentifierMap = this.muteEntries.get(muteKey);
        if (!muteByIdentifierMap) {
            muteByIdentifierMap = new Map();
            this.muteEntries.set(muteKey, muteByIdentifierMap);
        }

        // Clear existing timeout for this identifier if any
        const existingMute = muteByIdentifierMap.get(muteIdentifier);
        if (existingMute) {
            clearTimeout(existingMute.timeout);
        }

        const muteTimeout = setTimeout(() => {
            muteByIdentifierMap!.delete(muteIdentifier);
            if (muteByIdentifierMap!.size === 0) {
                this.muteEntries.delete(muteKey);
            }
            runtimeOutput.log({
                level: "info",
                component: "RuntimeMuteService",
                message: `Mute expired: ${muteKey}${identifier ? ` [${identifier}]` : ""}`,
            });
        }, remainingMute);

        muteByIdentifierMap.set(muteIdentifier, { expiresAt, timeout: muteTimeout });

        runtimeOutput.log({
            level: "info",
            component: "RuntimeMuteService",
            message: `Mute set: ${muteKey}${identifier ? ` [${identifier}]` : ""} for ${remainingMute}ms (until ${expiresAt})`,
        });
    }

    clearMuteEntries(targetType: "rule" | "resource", targetId: string, identifier?: string): void {
        const muteKey = RuntimeMuteService.key(targetType, targetId);
        const muteByIdentifierMap = this.muteEntries.get(muteKey);
        if (!muteByIdentifierMap) return;

        if (identifier !== undefined) {
            const muteEntry = muteByIdentifierMap.get(identifier);
            if (muteEntry) {
                clearTimeout(muteEntry.timeout);
                muteByIdentifierMap.delete(identifier);
                if (muteByIdentifierMap.size === 0) {
                    this.muteEntries.delete(muteKey);
                }
            }
        } else {
            // Clear all entries for this target
            for (const entry of muteByIdentifierMap.values()) {
                clearTimeout(entry.timeout);
            }
            this.muteEntries.delete(muteKey);
        }

        runtimeOutput.log({
            level: "info",
            component: "RuntimeMuteService",
            message: `Mute cleared: ${muteKey}${identifier !== undefined ? ` [${identifier}]` : " (all)"}`,
        });
    }

    isRuleMuted(ruleId: string): boolean {
        const muteByIdentifierMap = this.muteEntries.get(`rule::${ruleId}`);
        return muteByIdentifierMap !== undefined && muteByIdentifierMap.size > 0;
    }

    isResourceMuted(resourceId: string): boolean {
        const muteByIdentifierMap = this.muteEntries.get(`resource::${resourceId}`);
        return muteByIdentifierMap !== undefined && muteByIdentifierMap.size > 0;
    }
}
