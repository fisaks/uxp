import { BlueprintIcon } from "@uhn/blueprint";
import { LocationItemRef, RuntimeActionSideEffect, UhnResourceCommand } from "@uhn/common";

export type QuickActionId = "expand-all" | "collapse-all" | "refresh" | "scroll-to-top" | "clear-filter";

export type PaletteAction =
    | { type: "navigate"; to: string }
    | { type: "send-command"; resourceId: string; command: UhnResourceCommand }
    | { type: "execute-scene"; sceneId: string }
    | { type: "scroll-to-location"; locationId: string }
    | { type: "scroll-to-item"; locationId: string; itemRef: LocationItemRef }
    | { type: "open-analog-popup"; resourceId: string; command: UhnResourceCommand; min: number; max: number; step?: number; unit?: string; label: string; defaultOnValue?: number }
    | { type: "filter-grid"; term: string }
    | { type: "open-system-panel" }
    | { type: "quick-action"; action: QuickActionId }
    | { type: "expand-location"; locationId: string }
    | { type: "collapse-location"; locationId: string }
    | { type: "trigger-theme-effect"; mode: "full" | "silent" }
    | { type: "stop-theme-effect" };

export type PaletteGroup = "Filter" | "Locations" | "Items" | "Actions" | "Quick Actions" | "Navigation";

/** State held by CommandPaletteAutocomplete for the analog slider popup. */
export type AnalogPopupState = {
    open: boolean;
    voiceActive: boolean;
    resourceId: string;
    min: number;
    max: number;
    step: number;
    unit?: string;
    label: string;
    defaultOnValue?: number;
};

/** Handlers that the voice flow routes recognition results to when the analog popup is open. */
export type AnalogValueVoiceHandlers = {
    handleResult: (transcript: string, alternatives?: string[]) => void;
    handleInterim: (transcript: string) => void;
};

/**
 * Text and voice use different action fields because they resolve intent differently:
 * - Text: the user sees a pre-computed label ("Turn off Kitchen Light") and picks it,
 *   so `action` is a state-based toggle — always matches what the label says.
 * - Voice: the user states intent explicitly ("turn on kitchen light"), which may not
 *   match the current toggle direction. The voice resolver picks `activateAction` or
 *   `deactivateAction` based on spoken intent and checks `active` to detect noops.
 */
export type PaletteItem = {
    id: string;
    label: string;
    secondary?: string;
    icon?: BlueprintIcon;
    group: PaletteGroup;
    /** Action executed when selected from the text autocomplete. Pre-computed based on current
     *  state (e.g. "Turn off" when active, "Turn on" when inactive) — always a state-based toggle. */
    action: PaletteAction;
    searchText: string;
    active?: boolean;
    /** Marks analog "set" actions that should open the slider popup when no number is in the query. */
    analogFallback?: boolean;
    /** Action for voice "on" intent (activate). */
    activateAction?: { resourceId: string; command: UhnResourceCommand };
    /** Action for voice "off" intent (deactivate). */
    deactivateAction?: { resourceId: string; command: UhnResourceCommand };
    /** Action side effects from the view — fired alongside the primary command. */
    sideEffects?: RuntimeActionSideEffect[];
};
