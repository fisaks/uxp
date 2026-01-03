import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import HelpOutline from "@mui/icons-material/HelpOutline";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { Badge, IconButton } from "@mui/material";
import React from "react";
import type { HealthLevel } from "../health.types";

function HealthIcon({ level }: { level: HealthLevel }) {

    switch (level) {
        case "ok":
            return <CheckCircleOutline color="success" />;
        case "warning":
            return <WarningAmberOutlined color="warning" />;
        case "error":
            return <ErrorOutline color="error" />;
        case "unknown":
        default:
            return <HelpOutline color="info" />;
    }
}


export type HealthIndicatorButtonProps = {
    level: HealthLevel;
    count: number; // number of non-ok items
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

export const HealthIndicatorButton: React.FC<HealthIndicatorButtonProps> = ({ level, count, onClick }) => {
    const showBadge = count > 0;
    return (
        <IconButton color="inherit" onClick={onClick} sx={{ ml: 1 }} aria-label="Health">
            <Badge
                badgeContent={count > 0 ? count : undefined}
                color={level === "error" ? "error" : level === "warning" ? "warning" : level === "unknown" ? "info" : "default"}
                variant={showBadge ? "standard" : "dot"}
                invisible={!showBadge}
                overlap="circular"
            >
                <HealthIcon level={level} />
            </Badge>
        </IconButton>
    );
};
