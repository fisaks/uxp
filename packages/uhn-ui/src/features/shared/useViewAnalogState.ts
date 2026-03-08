import { RuntimeInteractionView, UhnResourceCommand } from "@uhn/common";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { TileRuntimeResourceState } from "../resource/resource-ui.type";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;

export function useViewAnalogState(
    view: RuntimeInteractionView,
    sendCommand: SendCommandFn,
): { analogSendCommand: (cmd: UhnResourceCommand) => Promise<void>; analogState: TileRuntimeResourceState | undefined } {
    const analogSendCommand = useCallback(async (cmd: UhnResourceCommand) => {
        if (!view.command) return;
        await sendCommand(view.command.resourceId, cmd);
    }, [sendCommand, view.command]);

    const runtimeStateById = useSelector((s: any) => s.runtimeState?.byResourceId);
    const analogState = view.command ? runtimeStateById?.[view.command.resourceId] : undefined;

    return { analogSendCommand, analogState };
}
