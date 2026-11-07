import { Tooltip, Typography } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";

/** What comes after the current track, on a line of its own under the buttons of the full screen player; cut off at the end. */
export const UpNextLine: React.FC<{ text?: string }> = ({ text }) => {
    const portalContainer = usePortalContainerRef();
    if (!text) return null;
    return (
        <Tooltip title={`Next: ${text}`} slotProps={{ popper: { container: portalContainer.current } }}>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ textAlign: "center" }}>
                Next: {text}
            </Typography>
        </Tooltip>
    );
};
