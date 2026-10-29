import { alpha } from "@mui/material";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";

const TOOLTIP_ENTER_DELAY = 500;

type PlayerToggleButtonProps = {
    active: boolean;
    /** What the button does or is set to, shown as a hint and read by screen readers. */
    label: string;
    onClick: () => void;
    children: React.ReactNode;
};

/** An icon button for a setting that is on or off. When it is on it has a coloured ring and background, when it is off it is dim. */
export const PlayerToggleButton: React.FC<PlayerToggleButtonProps> = ({ active, label, onClick, children }) => {
    const portalContainer = usePortalContainerRef();
    return (
        <TooltipIconButton
            tooltip={label}
            tooltipPortal={portalContainer}
            enterDelay={TOOLTIP_ENTER_DELAY}
            onClick={onClick}
            aria-pressed={active}
            sx={{
                color: active ? "primary.main" : "text.disabled",
                bgcolor: (theme) => (active ? alpha(theme.palette.primary.main, 0.16) : "transparent"),
                border: 1,
                borderColor: active ? "primary.main" : "transparent",
            }}
        >
            {children}
        </TooltipIconButton>
    );
};
