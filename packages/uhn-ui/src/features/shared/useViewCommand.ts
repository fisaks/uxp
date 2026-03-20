import { RuntimeInteractionView, UhnResourceCommand } from "@uhn/common";
import { useCallback, useState } from "react";
import { sendForTarget } from "./viewCommandHelpers";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;

/** Handles click interaction for view tiles.
 *  Maps the view's command target type (tap, toggle, longPress, setAnalog, clearTimer)
 *  to the appropriate resource command. When the view is active and has an onDeactivate
 *  target, that target is used instead. Returns a click handler and pending state. */
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
            if (active && view.command.onDeactivate) {
                await sendForTarget(view.command.onDeactivate, sendCommand, active);
            } else {
                await sendForTarget(view.command, sendCommand, active);
            }
        } finally {
            setPending(false);
        }
    }, [view.command, active, sendCommand]);

    return { handleClick, pending };
}
