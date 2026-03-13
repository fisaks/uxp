import { Tooltip } from "@mui/material";
import React from "react";

type WithOptionalTooltipProps = {
    tooltip?: string;
    portalContainer?: React.RefObject<HTMLElement | null>;
    children: React.ReactElement;
    error?: boolean;
    success?: boolean;
    arrow?: boolean;
    enterDelay?: number;
};

export const WithOptionalTooltip: React.FC<WithOptionalTooltipProps> = ({
    tooltip,
    children,
    portalContainer,
    error,
    success,
    arrow,
    enterDelay = 500,
}) => {
    if (!tooltip) return children;

    const colorProps = error ? {
        tooltip: {
            sx: {
                backgroundColor: 'error.main',
                color: 'error.contrastText',
            }
        }
    } : {
        tooltip: {
            sx: {
                backgroundColor: 'success.main',
                color: 'success.contrastText',
            }
        }
    };
    const slotProps = portalContainer && portalContainer.current ? {
        popper: { container: portalContainer.current },
    } : {
        popper: {
            disablePortal: true,
        },
    };
    return (
        <Tooltip
            title={tooltip}
            arrow={arrow}
            enterDelay={enterDelay}
            enterNextDelay={enterDelay}
            slotProps={{
                ...slotProps,
                ...(error || success ? colorProps : {})
            }}

        >
            <span>
                {children}
            </span>
        </Tooltip>
    );
};
