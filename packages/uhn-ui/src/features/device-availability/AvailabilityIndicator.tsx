import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { WithOptionalTooltip, usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";
import { AvailabilityStatus } from "./useViewAvailability";

type AvailabilityIndicatorProps = {
    status: AvailabilityStatus;
};

export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({ status }) => {
    const portalContainer = usePortalContainerRef();

    if (!status || status === "ok") return null;

    const color = status === "offline-error" ? "error.main" : "warning.main";
    const tooltip = status === "offline-error"
        ? "Device offline"
        : "Device offline — power control available";

    return (
        <span style={{ position: "absolute", top: 30, right: 9, zIndex: 1 }}>
            <WithOptionalTooltip tooltip={tooltip} portalContainer={portalContainer} arrow enterDelay={500}>
                <ReportProblemIcon sx={{ fontSize: 16, color, opacity: 0.85 }} />
            </WithOptionalTooltip>
        </span>
    );
};
