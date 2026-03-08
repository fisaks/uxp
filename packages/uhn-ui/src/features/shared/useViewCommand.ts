import { RuntimeInteractionView, RuntimeViewCommandTarget, UhnResourceCommand } from "@uhn/common";
import { useCallback, useState } from "react";

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

    const sendForTarget = useCallback(async (target: RuntimeViewCommandTarget) => {
        switch (target.type) {
            case "tap":
                await sendCommand(target.resourceId, { type: "tap" });
                break;
            case "toggle":
                await sendCommand(target.resourceId, { type: "toggle" });
                break;
            case "longPress":
                await sendCommand(target.resourceId, { type: "longPress", holdMs: target.holdMs ?? 1000 });
                break;
            case "setAnalog": {
                const min = target.min ?? 0;
                const max = target.max ?? 100;
                const targetValue = active ? min : max;
                await sendCommand(target.resourceId, { type: "setAnalog", value: targetValue });
                break;
            }
            case "clearTimer":
                await sendCommand(target.resourceId, { type: "clearTimer" });
                break;
        }
    }, [sendCommand, active]);

    const handleClick = useCallback(async () => {
        if (!view.command) return;
        setPending(true);
        try {
            if (active && view.command.onDeactivate) {
                await sendForTarget(view.command.onDeactivate);
            } else {
                await sendForTarget(view.command);
            }
        } finally {
            setPending(false);
        }
    }, [view.command, active, sendForTarget]);

    return { handleClick, pending };
}
