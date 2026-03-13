import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton } from "@mui/material";
import { WithOptionalTooltip, selectCurrentUser, usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

type TechnicalLinkButtonProps = {
    to: string;
};

/**
 * Small link icon in the bottom-right corner of a LocationTile.
 * Navigates to the corresponding technical page deep link.
 * Only visible for admin users.
 *
 * Uses MUI IconButton with `component={Link}` so left-click navigates in-app
 * while middle-click / Ctrl+click opens a new tab (native browser behavior).
 */
export const TechnicalLinkButton: React.FC<TechnicalLinkButtonProps> = ({ to }) => {
    const user = useSelector(selectCurrentUser);
    const portalContainer = usePortalContainerRef();
    const isAdmin = user?.roles.includes("admin");

    if (!isAdmin) return null;

    return (
        <span style={{ position: "absolute", bottom: 4, right: 4, zIndex: 1 }}>
            <WithOptionalTooltip tooltip="View in Technical" portalContainer={portalContainer} arrow enterDelay={1000}>
                <IconButton
                    component={Link}
                    to={to}
                    size="small"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    sx={{
                        color: "action.disabled",
                        bgcolor: "transparent",
                        "&:hover": { bgcolor: "action.hover", color: "primary.main" },
                        p: 0.5,
                    }}
                >
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </WithOptionalTooltip>
        </span>
    );
};
