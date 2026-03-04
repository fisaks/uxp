import { UhnResourceCommand } from "@uhn/common";
import { useCallback, useEffect, useRef, useState } from "react";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";

const DEBOUNCE_MS = 200;

export function useAnalogSlider(
    resource: TileRuntimeResource,
    state: TileRuntimeResourceState | undefined,
    sendCommand: (command: UhnResourceCommand) => Promise<void>
) {
    const min = resource.min ?? 0;
    const max = resource.max ?? 65535;

    const [localValue, setLocalValue] = useState<number>(
        typeof state?.value === "number" ? state.value : min
    );
    const isDraggingRef = useRef(false);
    const debounceTimerRef = useRef<number | null>(null);

    // Sync from incoming state when not actively dragging
    useEffect(() => {
        if (!isDraggingRef.current && typeof state?.value === "number") {
            setLocalValue(state.value);
        }
    }, [state?.value]);

    const cancelDebounce = () => {
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    };

    const handleChange = useCallback((_event: Event, value: number | number[]) => {
        const v = typeof value === "number" ? value : value[0];
        isDraggingRef.current = true;
        setLocalValue(v);

        cancelDebounce();
        debounceTimerRef.current = window.setTimeout(() => {
            debounceTimerRef.current = null;
            sendCommand({ type: "setAnalog", value: v });
        }, DEBOUNCE_MS);
    }, [sendCommand]);

    const handleChangeCommitted = useCallback((_event: Event | React.SyntheticEvent, value: number | number[]) => {
        const v = typeof value === "number" ? value : value[0];
        isDraggingRef.current = false;
        setLocalValue(v);

        cancelDebounce();
        sendCommand({ type: "setAnalog", value: v });
    }, [sendCommand]);

    const sendExact = useCallback((value: number) => {
        const clamped = Math.min(max, Math.max(min, value));
        setLocalValue(clamped);
        sendCommand({ type: "setAnalog", value: clamped });
    }, [sendCommand, min, max]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => cancelDebounce();
    }, []);

    return {
        localValue,
        handleChange,
        handleChangeCommitted,
        sendExact,
    };
}
