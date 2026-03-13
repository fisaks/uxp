import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box } from "@mui/material";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
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

const ENTER_DELAY = 1000;

export const StepButtonRow: React.FC<StepButtonRowProps> = ({
    min, max, step, bigStep, localValue, sendExact,
    iconSize = "small",
    centerGap = 1.5,
    mt = 0,
}) => {
    const portalContainer = usePortalContainerRef();
    const outerSize = iconSize === "small" ? 16 : 18;
    const innerSize = iconSize === "small" ? 14 : 16;

    return (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap", mt }}>
            <TooltipIconButton size="small" onClick={() => sendExact(min)} sx={{ p: 0.5 }}
                tooltip={`Minimum (${min})`} tooltipPortal={portalContainer} enterDelay={ENTER_DELAY}>
                <FirstPageIcon sx={{ fontSize: outerSize }} />
            </TooltipIconButton>
            <TooltipIconButton size="small" onClick={() => sendExact(localValue - bigStep)} sx={{ p: 0.5 }}
                tooltip={`−${bigStep}`} tooltipPortal={portalContainer} enterDelay={ENTER_DELAY}>
                <ChevronLeftIcon sx={{ fontSize: outerSize }} />
            </TooltipIconButton>
            <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: centerGap }}>
                <TooltipIconButton size="small" onClick={() => sendExact(localValue - step)} sx={{ p: 0.5 }}
                    tooltip={`−${step}`} tooltipPortal={portalContainer} enterDelay={ENTER_DELAY}>
                    <RemoveIcon sx={{ fontSize: innerSize }} />
                </TooltipIconButton>
                <TooltipIconButton size="small" onClick={() => sendExact(localValue + step)} sx={{ p: 0.5 }}
                    tooltip={`+${step}`} tooltipPortal={portalContainer} enterDelay={ENTER_DELAY}>
                    <AddIcon sx={{ fontSize: innerSize }} />
                </TooltipIconButton>
            </Box>
            <TooltipIconButton size="small" onClick={() => sendExact(localValue + bigStep)} sx={{ p: 0.5 }}
                tooltip={`+${bigStep}`} tooltipPortal={portalContainer} enterDelay={ENTER_DELAY}>
                <ChevronRightIcon sx={{ fontSize: outerSize }} />
            </TooltipIconButton>
            <TooltipIconButton size="small" onClick={() => sendExact(max)} sx={{ p: 0.5 }}
                tooltip={`Maximum (${max})`} tooltipPortal={portalContainer} enterDelay={ENTER_DELAY}>
                <LastPageIcon sx={{ fontSize: outerSize }} />
            </TooltipIconButton>
        </Box>
    );
};
