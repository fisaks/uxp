import TuneIcon from "@mui/icons-material/Tune";
import { Box } from "@mui/material";
import React from "react";

type TuneOverlayIconProps = {
    /** The main icon element to wrap */
    children: React.ReactNode;
    /** Whether to show the TuneIcon overlay */
    show: boolean;
    /** Inherits the main icon's color */
    color: string;
    /** Lower opacity when active (0.5), higher when inactive (0.7) */
    active: boolean;
};

/** Wraps an icon with a small TuneIcon badge in the bottom-right corner.
 *  Used on tiles that have a popover (complex resources, views with controls). */
export const TuneOverlayIcon: React.FC<TuneOverlayIconProps> = ({ children, show, color, active }) => {
    if (!show) return <>{children}</>;
    return (
        <Box sx={{ position: "relative", display: "inline-flex" }}>
            {children}
            <TuneIcon sx={{
                position: "absolute",
                bottom: -4,
                right: -8,
                fontSize: 16,
                color,
                opacity: active ? 0.5 : 0.7,
            }} />
        </Box>
    );
};
