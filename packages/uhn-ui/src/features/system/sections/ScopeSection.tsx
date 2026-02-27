import { Box, Chip, Typography } from "@mui/material";
import { UhnSystemSnapshot } from "@uhn/common";
import React from "react";

type ScopeSectionProps = {
    scope: string;
    runtimes: UhnSystemSnapshot["runtimes"] | undefined;
    onScopeChange: (scope: string) => void;
};

export const ScopeSection: React.FC<ScopeSectionProps> = ({
    scope,
    runtimes,
    onScopeChange,
}) => {
    const edgeIds = runtimes
        ? Object.keys(runtimes).filter(k => k !== "master").sort()
        : [];

    return (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Scope</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                <Chip
                    size="small"
                    label="All UHN"
                    color={scope === "all" ? "primary" : "default"}
                    variant={scope === "all" ? "filled" : "outlined"}
                    onClick={() => onScopeChange("all")}
                />
                <Chip
                    size="small"
                    label="Master"
                    color={scope === "master" ? "primary" : "default"}
                    variant={scope === "master" ? "filled" : "outlined"}
                    onClick={() => onScopeChange("master")}
                />
                {edgeIds.map(edgeId => {
                    const offline = runtimes?.[edgeId]?.nodeOnline === false;
                    return (
                        <Chip
                            key={edgeId}
                            size="small"
                            label={edgeId}
                            color={scope === edgeId ? "primary" : "default"}
                            variant={scope === edgeId ? "filled" : "outlined"}
                            onClick={() => onScopeChange(edgeId)}
                            sx={offline ? { opacity: 0.5 } : undefined}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};
