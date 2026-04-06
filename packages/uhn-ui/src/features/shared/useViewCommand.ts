import { RuntimeInteractionView, UhnResourceCommand } from "@uhn/common";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendForTarget, sendSideEffects } from "./viewCommandHelpers";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;

const CONFIRM_TIMEOUT_MS = 3000;

type ConfirmConfig = RuntimeInteractionView["confirm"];

/** Resolves the confirmation text for the current tap direction.
 *  Returns undefined if no confirmation is needed. */
function resolveConfirmText(confirm: ConfirmConfig, active: boolean): string | undefined {
    if (!confirm) return undefined;
    if (typeof confirm === "boolean") return "Confirm?";
    if (typeof confirm === "string") return confirm;
    // Directional: active → deactivate, inactive → activate
    const dir = active ? confirm.deactivate : confirm.activate;
    if (!dir) return undefined;
    return typeof dir === "string" ? dir : "Confirm?";
}

/** Handles click interaction for view tiles.
 *  Maps the view's command target type (tap, toggle, longPress, setAnalog, clearTimer)
 *  to the appropriate resource command. When the view is active and has an onDeactivate
 *  target, that target is used instead. Also fires any action side effects.
 *
 *  When `confirm` is set, the first tap enters confirmation mode (returns confirmText).
 *  A second tap within 3s executes the command. Timeout or active state change cancels. */
export function useViewCommand(
    view: RuntimeInteractionView,
    active: boolean,
    sendCommand: SendCommandFn,
) {
    const [pending, setPending] = useState(false);
    const [confirmText, setConfirmText] = useState<string | undefined>(undefined);
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Cancel confirmation when active state changes
    useEffect(() => {
        if (confirmText) setConfirmText(undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    // Cleanup timer on unmount
    useEffect(() => () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    }, []);

    const handleClick = useCallback(async () => {
        if (!view.command) return;

        const needsConfirm = resolveConfirmText(view.confirm, active);

        if (needsConfirm && !confirmText) {
            // First tap — enter confirmation mode
            setConfirmText(needsConfirm);
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            confirmTimerRef.current = setTimeout(() => setConfirmText(undefined), CONFIRM_TIMEOUT_MS);
            return;
        }

        // Clear confirmation state
        setConfirmText(undefined);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);

        setPending(true);
        try {
            const target = active && view.command.onDeactivate ? view.command.onDeactivate : view.command;
            await sendForTarget(target, sendCommand, active);
            await sendSideEffects(view.sideEffects, sendCommand);
        } finally {
            setPending(false);
        }
    }, [view.command, view.confirm, view.sideEffects, active, sendCommand, confirmText]);

    return { handleClick, pending, confirmText };
}
