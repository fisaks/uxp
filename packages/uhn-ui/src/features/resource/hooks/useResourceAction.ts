// useResourceAction.ts
import { UhnResourceCommand } from "@uhn/common";
import { WebSocketTimeoutError } from "@uxp/ui-lib";
import { useCallback, useRef } from "react";
import { useAppDispatch } from "../../../app/store";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { commandFailed, commandStarted } from "../resourceCommandFeedbackSlice";

const TOUCH_PRESS_INTENT_DELAY_MS = 150;
const MIN_PRESS_DURATION_MS = 300;


export function useResourceAction(resource: TileRuntimeResource, state?: TileRuntimeResourceState) {
    const dispatch = useAppDispatch();
    const { sendMessageAsync } = useUHNWebSocket();

    const hasActivePointerInteractionRef = useRef(false);
    const pressCommittedAtRef = useRef<number | null>(null);
    const pressIntentDelayTimerRef = useRef<number | null>(null);

    const sendCommand = useCallback(async (command: UhnResourceCommand) => {
        dispatch(commandStarted({ resourceId: resource.id }));
        try {
            await sendMessageAsync("uhn:resource:command", {
                resourceId: resource.id,
                command
            }, 2000);
        } catch (error) {
            if (error instanceof WebSocketTimeoutError) {
                dispatch(
                    commandFailed({
                        resourceId: resource.id,
                        reason: "timeout",
                        error: "No confirmation received",
                    })
                );
            } else {
                dispatch(
                    commandFailed({
                        resourceId: resource.id,
                        reason: "send_failed",
                        error: "Failed to send command",
                    })
                );
            }
        }
    }, [dispatch, sendMessageAsync, resource.id]);

    /* ---------------- press helpers ---------------- */

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
        },
        [resource, commitPress, createPressIntentDelay]
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!hasActivePointerInteractionRef.current) return;

            hasActivePointerInteractionRef.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
            clearPressIntentDelay();

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

        // If press was already committed, we must release
        if (pressCommittedAtRef.current !== null) {
            scheduleRelease();
        }
    }, [scheduleRelease]);

    const onClick = useCallback(() => {
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
        }
    }, [resource, state?.value, sendCommand]);

    return {
        onPointerDown,
        onPointerUp,
        onPointerCancel,
        onClick,
    };
}

