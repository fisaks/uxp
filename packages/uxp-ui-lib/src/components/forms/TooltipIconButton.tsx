import { IconButton, IconButtonProps } from "@mui/material";
import React from "react";
import { WithOptionalTooltip } from "../layout/WithOptionalTooltip";

type TooltipIconButtonProps = {
    tooltip?: string;
    tooltipPortal?: React.RefObject<HTMLElement | null>;
    enterDelay?: number;
    children: React.ReactNode;
} & Omit<IconButtonProps, "children">;

export const TooltipIconButton: React.FC<TooltipIconButtonProps> = ({
    tooltip,
    tooltipPortal,
    enterDelay,
    children,
    sx,
    ...props
}) => (
    <WithOptionalTooltip tooltip={tooltip} portalContainer={tooltipPortal} arrow enterDelay={enterDelay}>
        <IconButton
            {...props}
            aria-label={tooltip ?? props["aria-label"]}
            sx={{
                "&:hover": { bgcolor: "action.hover" },
                ...sx as Record<string, unknown>,
            }}
        >
            {children}
        </IconButton>
    </WithOptionalTooltip>
);
