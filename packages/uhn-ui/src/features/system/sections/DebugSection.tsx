import { Box, Stack, Switch, Typography } from "@mui/material";
import React from "react";

type DebugSectionProps = {
    runMode?: "debug" | "normal";
    busy: boolean;
    setRunModeRunning: boolean;
    onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const DebugSection: React.FC<DebugSectionProps> = ({
    runMode,
    busy,
    setRunModeRunning,
    onToggle,
}) => (
    <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Debug</Typography>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Switch
                checked={runMode === "debug"}
                onChange={onToggle}
                disabled={busy}
            />
            {!setRunModeRunning && (
                <Typography variant="body2">
                    Debug mode {runMode === "debug" ? "ON" : "OFF"}
                </Typography>
            )}
        </Stack>

        <Typography variant="caption" color="text.secondary">
            {setRunModeRunning && "Updating runtime mode..."}
            {!setRunModeRunning && runMode === "normal" &&
                "Will restart runtime with source maps and debug port"}
            {!setRunModeRunning && runMode === "debug" &&
                "Debug port 9250 opened, runtime running with source maps"}
        </Typography>
    </Box>
);
