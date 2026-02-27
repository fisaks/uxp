import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { UhnRuntimeConfig } from "@uhn/common";
import React from "react";

type RuntimeSectionProps = {
    runtimeConfig?: UhnRuntimeConfig;
    busy: boolean;
    onStart: (e: React.MouseEvent) => void;
    onStop: (e: React.MouseEvent) => void;
    onRestart: (e: React.MouseEvent) => void;
};

const statusColor = (status?: string): "success" | "warning" | "error" | "default" => {
    switch (status) {
        case "running": return "success";
        case "starting":
        case "restarting": return "warning";
        case "stopped":
        case "failed": return "error";
        default: return "default";
    }
};

const statusLabel = (status?: string): string => {
    if (!status || status === "unknown") return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
};

export const RuntimeSection: React.FC<RuntimeSectionProps> = ({
    runtimeConfig,
    busy,
    onStart,
    onStop,
    onRestart,
}) => {
    const status = runtimeConfig?.runtimeStatus;
    const isRunning = status === "running";
    const isUnconfigured = status === "unconfigured";

    return (
        <Box>
            <Typography variant="subtitle2">Runtime</Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                    size="small"
                    label={statusLabel(status)}
                    color={statusColor(status)}
                />
                <Chip
                    size="small"
                    variant="outlined"
                    label={runtimeConfig?.runMode === "debug" ? "Debug" : "Normal"}
                />
            </Stack>

            {!isUnconfigured && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
                    {isRunning ? (
                        <>
                            <Button variant="contained" onClick={onRestart} disabled={busy}>
                                Restart runtime
                            </Button>
                            <Button variant="outlined" onClick={onStop} disabled={busy}>
                                Stop runtime
                            </Button>
                        </>
                    ) : (
                        <Button variant="contained" onClick={onStart} disabled={busy}>
                            Start runtime
                        </Button>
                    )}
                </Stack>
            )}
        </Box>
    );
};
