import { RuntimeActionSideEffect, RuntimeViewCommandTarget, UhnResourceCommand } from "@uhn/common";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;

/** Sends the appropriate resource command for a view command target.
 *  Shared between useViewCommand (tile tap) and ViewCommandControl (popover). */
export async function sendForTarget(
    target: RuntimeViewCommandTarget,
    sendCommand: SendCommandFn,
    active: boolean,
): Promise<void> {
    switch (target.type) {
        case "tap":
            await sendCommand(target.resourceId, { type: "tap" });
            break;
        case "toggle":
            await sendCommand(target.resourceId, { type: "toggle" });
            break;
        case "longPress":
            await sendCommand(target.resourceId, {
                type: "longPress",
                holdMs: target.holdMs ?? 1000,
                simulateHold: target.simulateHold,
            });
            break;
        case "setAnalog": {
            const min = target.min ?? 0;
            const max = target.max ?? 100;
            const targetValue = active ? min : (target.defaultOnValue ?? max);
            await sendCommand(target.resourceId, { type: "setAnalog", value: targetValue });
            break;
        }
        case "clearTimer":
            await sendCommand(target.resourceId, { type: "clearTimer" });
            break;
        case "action":
            if (target.action) {
                await sendCommand(target.resourceId, {
                    type: "action",
                    action: target.action,
                    metadata: target.metadata
                });
            }
            break;
        case "setActionOutput":
            if (target.action) {
                await sendCommand(target.resourceId, {
                    type: "setActionOutput",
                    action: target.action,
                });
            }
            break;
    }
}

/** Send action side effects (fired alongside the primary command). */
export async function sendSideEffects(
    sideEffects: RuntimeActionSideEffect[] | undefined,
    sendCommand: SendCommandFn,
): Promise<void> {
    if (!sideEffects?.length) return;
    for (const se of sideEffects) {
        await sendCommand(se.resourceId, {
            type: "action",
            action: se.action,
            ...(se.metadata && { metadata: se.metadata }),
        });
    }
}
