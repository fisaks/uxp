import { HealthItem, HealthSeverity, HealthSnapshot } from "@uxp/common";
import { HealthNotice } from "./health.types";

export const severityRank: Record<HealthSeverity, number> = {
    ok: 0,
    warn: 1,
    error: 2,
};

export function deriveHealthNotice(
    next: HealthSnapshot,
    prev?: HealthSnapshot
): HealthNotice | undefined {
    const nextWorst = getWorstItem(next);
    if (!nextWorst) return undefined;

    const prevWorst = prev ? getWorstItem(prev) : undefined;

    // Always show on first snapshot
    if (!prevWorst) {
        return {
            appId: next.appId,
            severity: nextWorst.severity,
            message: nextWorst.message,
            timestamp: Date.now(),
        };
    }

    const changed =
        nextWorst.severity !== prevWorst.severity ||
        nextWorst.message !== prevWorst.message ||
        nextWorst.timestamp !== prevWorst.timestamp;

    if (!changed) return undefined;

    return {
        appId: next.appId,
        severity: nextWorst.severity,
        message: nextWorst.message,
        timestamp: Date.now(),
    };
}

function getWorstItem(snapshot: HealthSnapshot): HealthItem | undefined {
    if (snapshot.items.length === 0) return undefined;

    return [...snapshot.items].sort((a, b) => {
        const sev =
            severityRank[b.severity] - severityRank[a.severity];
        if (sev !== 0) return sev;

        return (b.timestamp ?? 0) - (a.timestamp ?? 0);
    })[0];
}

