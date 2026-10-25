import React, { useCallback, useEffect, useRef, useState } from "react";

// While a slider is dragged the value is sent at most this often, as in the UHN analog sliders.
const DEBOUNCE_MS = 200;

/** The value a slider shows, which follows the amplifier except while it is being dragged. */
export function useDebouncedSlider(value: number, min: number, max: number, sendValue: (value: number) => void) {
    const [localValue, setLocalValue] = useState(value);
    const isDraggingRef = useRef(false);
    const debounceTimerRef = useRef<number | null>(null);
    const sendValueRef = useRef(sendValue);
    sendValueRef.current = sendValue;

    useEffect(() => {
        if (!isDraggingRef.current) {
            setLocalValue(value);
        }
    }, [value]);

    const cancelDebounce = () => {
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    };

    const handleChange = useCallback((_event: Event, newValue: number | number[]) => {
        const v = newValue as number;
        isDraggingRef.current = true;
        setLocalValue(v);
        cancelDebounce();
        debounceTimerRef.current = window.setTimeout(() => {
            debounceTimerRef.current = null;
            sendValueRef.current(v);
        }, DEBOUNCE_MS);
    }, []);

    const handleChangeCommitted = useCallback((_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
        const v = newValue as number;
        isDraggingRef.current = false;
        setLocalValue(v);
        cancelDebounce();
        sendValueRef.current(v);
    }, []);

    /** For typed values and the step buttons. */
    const sendExact = useCallback(
        (exact: number) => {
            const v = Math.min(max, Math.max(min, exact));
            setLocalValue(v);
            sendValueRef.current(v);
        },
        [min, max]
    );

    useEffect(() => cancelDebounce, []);

    return { localValue, handleChange, handleChangeCommitted, sendExact };
}
