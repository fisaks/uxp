import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import HelpOutline from "@mui/icons-material/HelpOutline";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { Badge, IconButton } from "@mui/material";
import React from "react";
import { HealthLevel } from "../health.types";
import { selectGlobalHealthLevel, selectHealthItemCount } from "../healthSelectors";
import { useSelector } from "react-redux";



function HealthIcon({ level }: { level: HealthLevel }) {

    switch (level) {
        case "ok":
            return <CheckCircleOutline color="success" />;
        case "warn":
            return <WarningAmberOutlined color="warning" />;
        case "error":
            return <ErrorOutline color="error" />;
        case "unknown":
        default:
            return <HelpOutline color="info" />;
    }
}


export type HealthIndicatorButtonProps = {

    onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

export const HealthIndicatorButton: React.FC<HealthIndicatorButtonProps> = ({ onClick }) => {
    const healthLevel = useSelector(selectGlobalHealthLevel);
    const healthCount = useSelector(selectHealthItemCount);
    const showBadge = healthCount > 0;
    return (
        <IconButton color="inherit" onClick={onClick} sx={{ ml: 1 }} aria-label="Health">
            <Badge
                badgeContent={healthCount > 0 ? healthCount : undefined}
                color={healthLevel === "error" ? "error" : healthLevel === "warn" ? "warning" : healthLevel === "unknown" ? "info" : "default"}
                variant={showBadge ? "standard" : "dot"}
                invisible={!showBadge}
                overlap="circular"
            >
                <HealthIcon level={healthLevel} />
            </Badge>
        </IconButton>
    );
};
