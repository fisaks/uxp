import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton } from "@mui/material";
import React from "react";

type StepButtonRowProps = {
    min: number;
    max: number;
    step: number;
    bigStep: number;
    localValue: number;
    sendExact: (value: number) => void;
    /** "small" = 16/14px icons (tile inline), "medium" = 18/16px icons (popover) */
    iconSize?: "small" | "medium";
    /** Gap between centered -/+ buttons */
    centerGap?: number;
    /** Top margin */
    mt?: number;
};

const hoverSx = { "&:hover": { backgroundColor: "action.hover" } };

export const StepButtonRow: React.FC<StepButtonRowProps> = ({
    min, max, step, bigStep, localValue, sendExact,
    iconSize = "small",
    centerGap = 1.5,
    mt = 0,
}) => {
    const outerSize = iconSize === "small" ? 16 : 18;
    const innerSize = iconSize === "small" ? 14 : 16;

    return (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap", mt }}>
            <IconButton size="small" onClick={() => sendExact(min)} sx={{ p: 0.5, ...hoverSx }}>
                <FirstPageIcon sx={{ fontSize: outerSize }} />
            </IconButton>
            <IconButton size="small" onClick={() => sendExact(localValue - bigStep)} sx={{ p: 0.5, ...hoverSx }}>
                <ChevronLeftIcon sx={{ fontSize: outerSize }} />
            </IconButton>
            <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: centerGap }}>
                <IconButton size="small" onClick={() => sendExact(localValue - step)} sx={{ p: 0.5, ...hoverSx }}>
                    <RemoveIcon sx={{ fontSize: innerSize }} />
                </IconButton>
                <IconButton size="small" onClick={() => sendExact(localValue + step)} sx={{ p: 0.5, ...hoverSx }}>
                    <AddIcon sx={{ fontSize: innerSize }} />
                </IconButton>
            </Box>
            <IconButton size="small" onClick={() => sendExact(localValue + bigStep)} sx={{ p: 0.5, ...hoverSx }}>
                <ChevronRightIcon sx={{ fontSize: outerSize }} />
            </IconButton>
            <IconButton size="small" onClick={() => sendExact(max)} sx={{ p: 0.5, ...hoverSx }}>
                <LastPageIcon sx={{ fontSize: outerSize }} />
            </IconButton>
        </Box>
    );
};
