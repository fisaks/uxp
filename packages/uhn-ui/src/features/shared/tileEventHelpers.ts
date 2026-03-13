import React from "react";

/** Stops pointer/click events from bubbling to CardActionArea */
export const stopPropagation = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
};

/** Creates tooltip props with Shadow DOM portal container and standard delays */
export const createTooltipProps = (container: HTMLElement | null) => ({
    enterDelay: 600,
    enterNextDelay: 600,
    enterTouchDelay: 0,
    slotProps: { popper: { container } },
});
