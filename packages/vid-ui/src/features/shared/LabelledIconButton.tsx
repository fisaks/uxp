import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";

const TOOLTIP_ENTER_DELAY = 500;

type LabelledIconButtonProps = {
    /** What the button does: shown as a tooltip when the pointer rests on it, and read by screen readers. */
    label: string;
    onClick: () => void;
    children: React.ReactNode;
};

/** An icon button that says what it does. A button that is not usable is not drawn at all, since a tooltip does not show on a disabled one. */
export const LabelledIconButton: React.FC<LabelledIconButtonProps> = ({ label, onClick, children }) => {
    const portalContainer = usePortalContainerRef();
    return (
        <TooltipIconButton size="small" tooltip={label} tooltipPortal={portalContainer} enterDelay={TOOLTIP_ENTER_DELAY} onClick={onClick}>
            {children}
        </TooltipIconButton>
    );
};
