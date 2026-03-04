// useResourceAction.ts
import { useCallback, useRef } from "react";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { useSendResourceCommand } from "./useSendResourceCommand";

const TOUCH_PRESS_INTENT_DELAY_MS = 150;
const MIN_PRESS_DURATION_MS = 300;
const LONG_PRESS_THRESHOLD_MS = 500;

type UseResourceActionOptions = {
    onLongPress?: () => void;
};

export function useResourceAction(
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState,
    options?: UseResourceActionOptions
) {
    const sendCommand = useSendResourceCommand(resource.id, state?.value);

    const hasActivePointerInteractionRef = useRef(false);
    const pressCommittedAtRef = useRef<number | null>(null);
    const pressIntentDelayTimerRef = useRef<number | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);

    /* ---------------- press helpers (digital input push) ---------------- */

    const commitPress = useCallback(() => {
        if (pressCommittedAtRef.current !== null) return;

        pressCommittedAtRef.current = Date.now();
        sendCommand({ type: "press" });
    }, [sendCommand]);

    const scheduleRelease = useCallback(() => {
        if (pressCommittedAtRef.current === null) return;

        const elapsed = Date.now() - pressCommittedAtRef.current;
        const remaining = MIN_PRESS_DURATION_MS - elapsed;
        pressCommittedAtRef.current = null;
        const release = () => {
            sendCommand({ type: "release" });
        };

        if (remaining > 0) {
            window.setTimeout(release, remaining);
        } else {
            release();
        }
    }, [sendCommand]);

    const clearPressIntentDelay = () => {
        if (pressIntentDelayTimerRef.current !== null) {
            clearTimeout(pressIntentDelayTimerRef.current);
            pressIntentDelayTimerRef.current = null;
        }
    };
    const createPressIntentDelay = useCallback(() => {
        clearPressIntentDelay();
        pressIntentDelayTimerRef.current = window.setTimeout(() => {
            pressIntentDelayTimerRef.current = null;
            commitPress();
        }, TOUCH_PRESS_INTENT_DELAY_MS);
    }, [commitPress]);

    /* ---------------- long-press helpers (analog output) ---------------- */

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const startLongPressTimer = useCallback(() => {
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
            longPressTimerRef.current = null;
            longPressTriggeredRef.current = true;
            options?.onLongPress?.();
        }, LONG_PRESS_THRESHOLD_MS);
    }, [options]);

    /* ---------------- pointer handlers ---------------- */

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;

            e.currentTarget.setPointerCapture(e.pointerId);
            hasActivePointerInteractionRef.current = true;

            if (resource.type === "digitalInput" && resource.inputType === "push") {
                if (e.pointerType === "touch") {
                    // Delay press commitment to disambiguate scroll
                    createPressIntentDelay();
                } else {
                    // Mouse / pen: immediate commitment
                    commitPress();
                }
            }

            if (resource.type === "analogOutput" && options?.onLongPress) {
                if (e.pointerType === "touch") {
                    // On touch, delay long-press start to disambiguate scroll
                    clearPressIntentDelay();
                    pressIntentDelayTimerRef.current = window.setTimeout(() => {
                        pressIntentDelayTimerRef.current = null;
                        startLongPressTimer();
                    }, TOUCH_PRESS_INTENT_DELAY_MS);
                } else {
                    startLongPressTimer();
                }
            }
        },
        [resource, commitPress, createPressIntentDelay, startLongPressTimer, options]
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!hasActivePointerInteractionRef.current) return;

            hasActivePointerInteractionRef.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
            clearPressIntentDelay();
            clearLongPressTimer();

            if (resource.type === "digitalInput" && resource.inputType === "push") {
                // Tap: commit press late if needed
                if (pressCommittedAtRef.current === null) {
                    commitPress();
                }
                scheduleRelease();
            }
        },
        [resource, commitPress, scheduleRelease]
    );

    const onPointerCancel = useCallback(() => {
        hasActivePointerInteractionRef.current = false;
        clearPressIntentDelay();
        clearLongPressTimer();

        // If press was already committed, we must release
        if (pressCommittedAtRef.current !== null) {
            scheduleRelease();
        }
    }, [scheduleRelease]);

    const onClick = useCallback(() => {
        // If long-press was triggered, suppress this click
        if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
        }

        // Timer: clear when active
        if (resource.type === "timer" && state?.value) {
            sendCommand({ type: "clearTimer" });
            return;
        }
        // Intentional: toggles only via click
        if (resource.type === "digitalOutput") {
            sendCommand({ type: "toggle" });
            return;
        }
        if (resource.type === "digitalInput" && resource.inputType === "toggle") {
            sendCommand({ type: "toggle" });
            return;
        }
        // Analog output: tap-toggle between min and max
        if (resource.type === "analogOutput") {
            const min = resource.min ?? 0;
            const max = resource.max ?? 65535;
            const current = typeof state?.value === "number" ? state.value : min;
            const nextValue = current > min ? min : max;
            sendCommand({ type: "setAnalog", value: nextValue });
            return;
        }
        // Complex: open popover on click
        if (resource.type === "complex") {
            options?.onLongPress?.();
            return;
        }
    }, [resource, state?.value, sendCommand, options]);

    return {
        onPointerDown,
        onPointerUp,
        onPointerCancel,
        onClick,
    };
}
