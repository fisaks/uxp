import { RuntimeInteractionView } from "@uhn/common";

const DISPLAY_SLOTS = ["topLeft", "topCenter", "topRight", "badge", "left", "right", "hero"] as const;

/** One resource a view shows through its state display, with the slot it sits in. */
export type ViewDisplayLine = {
    slot: typeof DISPLAY_SLOTS[number];
    resourceId: string;
    /** Resource that decides when the item is shown (`showWhenFrom`). */
    shownWhenFromResourceId?: string;
    format?: string;
};

/** The resources of a view's state display (icons and values), in slot order. */
export function viewDisplayLines(view: RuntimeInteractionView): ViewDisplayLine[] {
    const display = view.stateDisplay;
    if (!display) return [];
    return DISPLAY_SLOTS.flatMap((slot) => (display[slot] ?? []).map((item) => ({
        slot,
        resourceId: item.resourceId,
        ...("showWhenFromResourceId" in item && item.showWhenFromResourceId && { shownWhenFromResourceId: item.showWhenFromResourceId }),
        ...("format" in item && item.format && { format: item.format }),
    })));
}
