import { Tooltip } from "@mui/material";
import React from "react";

type WithOptionalTooltipProps = {
    tooltip?: string;
    portalContainer?: React.RefObject<HTMLElement | null>;
    children: React.ReactElement;
};

export const WithOptionalTooltip: React.FC<WithOptionalTooltipProps> = ({
    tooltip,
    children,
    portalContainer,

}) => {
    if (!tooltip) return children;

    const slotProps = portalContainer && portalContainer.current ? {
        popper: { container: portalContainer.current }
    } : {
        popper: {
            disablePortal: true,
        },
    };
    return (
        <Tooltip
            title={tooltip}
            slotProps={slotProps}
        >
            <span>
                {children}
            </span>
        </Tooltip>
    );
};
