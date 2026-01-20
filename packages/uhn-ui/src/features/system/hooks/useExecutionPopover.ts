import { UhnSystemStatus } from "@uhn/common";
import { useEffect, useRef, useState } from "react";

export function useExecutionPopover(status?: UhnSystemStatus) {
    const [anchorEl, setAnchorEl] = useState<Element | null>(null);
    const [open, setOpen] = useState(false);

    const lastStatusRef = useRef<UhnSystemStatus | undefined>(undefined);
    const prevStateRef = useRef<UhnSystemStatus["state"]>();

    useEffect(() => {
        if (status && status.state !== "idle") {
            lastStatusRef.current = status;
        }
    }, [status]);

    useEffect(() => {
        const prev = prevStateRef.current;
        const next = status?.state;
        prevStateRef.current = next;

        if (!status || next === "idle") {
            setOpen(false);
            return;
        }

        if (next === "running" && prev !== "running") {
            setOpen(true);
        }

        if (next === "completed" && prev !== "completed") {
            const t = setTimeout(() => setOpen(false), 3000);
            return () => clearTimeout(t);
        }

        if (next === "failed" && prev !== "failed" && anchorEl) {
            setOpen(true);
        }
        return;
    }, [status, anchorEl]);

    return {
        anchorEl,
        open,
        currentStatus: status,
        lastStatus: lastStatusRef.current,

        openAtAnchor: (el: Element | null) => {
            setAnchorEl(el);
            setOpen(true);
        },

        close: () => setOpen(false),
    };
}
