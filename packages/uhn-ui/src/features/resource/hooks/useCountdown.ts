import { ResourceStateDetails } from "@uhn/common";
import { useEffect, useState } from "react";

function computeRemaining(stopAt: number): number {
    return Math.max(0, Math.ceil((stopAt - Date.now()) / 1000));
}

export function useCountdown(details: ResourceStateDetails | undefined, active: boolean): number {
    const timer = details?.type === "timer" ? details : undefined;
    const startedAt = timer?.startedAt;
    const stopAt = timer?.stopAt;

    const [remaining, setRemaining] = useState(() =>
        active && stopAt ? computeRemaining(stopAt) : 0
    );

    useEffect(() => {
        if (!active || !stopAt) {
            setRemaining(0);
            return;
        }

        setRemaining(computeRemaining(stopAt));

        const id = setInterval(() => {
            const r = computeRemaining(stopAt);
            setRemaining(r);
            if (r <= 0) clearInterval(id);
        }, 1000);

        return () => clearInterval(id);
    }, [active, startedAt, stopAt]);

    return remaining;
}

export function formatCountdown(seconds: number): string {
    if (seconds <= 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
}
