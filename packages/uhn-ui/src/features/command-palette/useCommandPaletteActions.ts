import { assertNever } from "@uxp/common";
import { getUxpWindow } from "@uxp/ui-lib";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSendSceneCommand } from "../scene/hooks/useSendSceneCommand";
import { useSendViewCommand } from "../view/hooks/useSendViewCommand";
import { AnalogPopupState, PaletteAction, PaletteItem, QuickActionId } from "./commandPalette.types";

type UseCommandPaletteActionsOptions = {
    onLocationSelect?: (locationId: string) => void;
    onAnalogInputNeeded?: (state: Omit<AnalogPopupState, "open" | "voiceActive">) => void;
    onHighlightItem?: (itemKey: string, locationId: string, durationMs?: number) => void;
    onQuickAction?: (action: QuickActionId) => void;
    onExpandLocation?: (locationId: string) => void;
    onCollapseLocation?: (locationId: string) => void;
};

/**
 * Returns an `execute` callback that dispatches a palette item's action.
 *
 * Self-contained actions (navigate, send-command, execute-scene, open-system-panel)
 * are handled internally. Context-dependent actions (scroll-to-location,
 * scroll-to-item, open-analog-popup, quick-action) are forwarded to the
 * caller-supplied callbacks so the hosting component can coordinate UI
 * responses like scrolling, highlighting, or opening popups.
 */
export function useCommandPaletteActions({ onLocationSelect, onAnalogInputNeeded, onHighlightItem, onQuickAction, onExpandLocation, onCollapseLocation }: UseCommandPaletteActionsOptions = {}) {
    const navigate = useNavigate();
    const sendCommand = useSendViewCommand();
    const sendSceneCommand = useSendSceneCommand();

    const execute = useCallback((item: PaletteItem) => {
        const action: PaletteAction = item.action;

        switch (action.type) {
            case "navigate":
                navigate(action.to);
                break;

            case "send-command":
                sendCommand(action.resourceId, action.command);
                break;

            case "execute-scene":
                sendSceneCommand(action.sceneId);
                break;

            case "scroll-to-location":
                onLocationSelect?.(action.locationId);
                break;

            case "scroll-to-item":
                onHighlightItem?.(`${action.itemRef.kind}:${action.itemRef.refId}`, action.locationId);
                break;

            case "open-analog-popup":
                onAnalogInputNeeded?.({
                    resourceId: action.resourceId,
                    min: action.min,
                    max: action.max,
                    step: action.step ?? 1,
                    unit: action.unit,
                    label: action.label,
                    defaultOnValue: action.defaultOnValue,
                });
                break;

            case "open-system-panel":
                getUxpWindow()?.navigation.requestBaseNavigation("hash", "system-panel", "uhn");
                break;

            case "quick-action":
                onQuickAction?.(action.action);
                break;

            case "expand-location":
                onExpandLocation?.(action.locationId);
                break;

            case "collapse-location":
                onCollapseLocation?.(action.locationId);
                break;

            case "filter-grid":
                // Handled directly in CommandPaletteAutocomplete — no-op here
                break;

            default:
                assertNever(action, "Unhandled palette action type");
        }
    }, [navigate, sendCommand, sendSceneCommand, onLocationSelect, onAnalogInputNeeded, onHighlightItem, onQuickAction, onExpandLocation, onCollapseLocation]);

    return execute;
}
