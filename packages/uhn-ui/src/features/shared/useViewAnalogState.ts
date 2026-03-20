import { RuntimeInteractionView, RuntimeViewControl, UhnResourceCommand } from "@uhn/common";
import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource/resource-ui.type";
import { selectResourceById } from "../resource/resourceSelector";
import { selectRuntimeStateByResourceId } from "../runtime-state/runtimeStateSelector";

type SendCommandFn = (resourceId: string, command: UhnResourceCommand) => Promise<void>;

type UseViewAnalogStateResult = {
    analogSendCommand: (cmd: UhnResourceCommand) => Promise<void>;
    analogState: TileRuntimeResourceState | undefined;
    /** First inline analog control (if any, and command is not setAnalog) */
    inlineControl: RuntimeViewControl | undefined;
    /** Resolved resource for the inline control (for min/max/step/unit) */
    inlineResource: TileRuntimeResource | undefined;
    inlineAnalogSendCommand: (cmd: UhnResourceCommand) => Promise<void>;
    inlineAnalogState: TileRuntimeResourceState | undefined;
};

/** Provides analog command sender and current state for a view's target resource
 *  and inline control resource. */
export function useViewAnalogState(
    view: RuntimeInteractionView,
    sendCommand: SendCommandFn,
): UseViewAnalogStateResult {
    const isCommandAnalog = view.command?.type === "setAnalog";

    const analogSendCommand = useCallback(async (cmd: UhnResourceCommand) => {
        if (!view.command) return;
        await sendCommand(view.command.resourceId, cmd);
    }, [sendCommand, view.command]);

    const runtimeStateById = useSelector(selectRuntimeStateByResourceId);
    const analogState = view.command
        ? runtimeStateById[view.command.resourceId]
        : undefined;

    // Inline control analog — find first inline:true control that is an analog resource
    const resourceById = useSelector(selectResourceById);

    const inlineControl = useMemo(() => {
        if (isCommandAnalog || !view.controls) return undefined;
        return view.controls.find(c => {
            if (!c.inline) return false;
            const res = resourceById[c.resourceId];
            return res?.type === "analogOutput" || res?.type === "virtualAnalogOutput";
        });
    }, [isCommandAnalog, view.controls, resourceById]);

    const inlineResource = inlineControl
        ? resourceById[inlineControl.resourceId] as TileRuntimeResource | undefined
        : undefined;

    const inlineAnalogSendCommand = useCallback(async (cmd: UhnResourceCommand) => {
        if (!inlineControl) return;
        await sendCommand(inlineControl.resourceId, cmd);
    }, [sendCommand, inlineControl]);

    const inlineAnalogState = inlineControl
        ? runtimeStateById[inlineControl.resourceId]
        : undefined;

    return {
        analogSendCommand,
        analogState,
        inlineControl,
        inlineResource,
        inlineAnalogSendCommand,
        inlineAnalogState,
    };
}
