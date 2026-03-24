import { RuntimeInteractionView, UhnResourceCommand } from "@uhn/common";
import { useCallback, useState } from "react";
import { sendForTarget, sendSideEffects } from "./viewCommandHelpers";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;

/** Handles click interaction for view tiles.
 *  Maps the view's command target type (tap, toggle, longPress, setAnalog, clearTimer)
 *  to the appropriate resource command. When the view is active and has an onDeactivate
 *  target, that target is used instead. Also fires any action side effects. */
export function useViewCommand(
    view: RuntimeInteractionView,
    active: boolean,
    sendCommand: SendCommandFn,
) {
    const [pending, setPending] = useState(false);

    const handleClick = useCallback(async () => {
        if (!view.command) return;
        setPending(true);
        try {
            const target = active && view.command.onDeactivate ? view.command.onDeactivate : view.command;
            await sendForTarget(target, sendCommand, active);
            await sendSideEffects(view.sideEffects, sendCommand);
        } finally {
            setPending(false);
        }
    }, [view.command, view.sideEffects, active, sendCommand]);

    return { handleClick, pending };
}
